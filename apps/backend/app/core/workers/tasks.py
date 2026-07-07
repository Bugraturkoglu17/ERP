# ─────────────────────────────────────────────────────────────────────────────
#  Golabs ERP — Celery Worker Tasks
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.emailing import send_tenant_email
from app.core.workers import celery_app
from app.core.whatsapp_service import send_whatsapp_template
from app.db.models import LowStockAlert, Material, OutboundEmailDeadLetter, PlatformTenantSettings, Stock, OutboundWhatsAppAudit, WorkOrderWhatsappMessage, WorkOrderWhatsappStatus

logger = logging.getLogger(__name__)

EMAIL_MAX_RETRIES = max(0, int(settings.EMAIL_MAX_RETRIES))
EMAIL_RETRY_DELAY_SECONDS = max(1, int(settings.EMAIL_RETRY_DELAY_SECONDS))


@celery_app.task(name="tasks.check_low_stock", bind=True)
def check_low_stock(self) -> dict:
    """
    Kritik stok kontrolü — her saat çalıştırılır (celery beat tarafından).
    """

    async def _run() -> dict:
        from app.core.database import async_engine
        try:
            async with AsyncSessionLocal() as session:
                items = (
                    await session.execute(
                        select(Material).where(
                            Material.is_active.is_(True),
                            Material.min_stock_level > 0,
                        )
                    )
                ).scalars().all()

                alerts: list[dict] = []
                for material in items:
                    qty_row = await session.execute(
                        select(func.coalesce(func.sum(Stock.quantity), 0)).where(Stock.material_id == material.id)
                    )
                    total_qty = float(qty_row.scalar() or 0)

                    if total_qty <= float(material.min_stock_level):
                        alert = LowStockAlert(
                            item_id=material.id,
                            current_stock=total_qty,
                            min_level=material.min_stock_level,
                        )
                        session.add(alert)

                        alerts.append(
                            {
                                "sku": material.sku,
                                "name": material.name,
                                "stock": total_qty,
                                "min": float(material.min_stock_level),
                            }
                        )

                await session.commit()
                return {"checked": len(items), "alerts": alerts}
        finally:
            await async_engine.dispose()

    result = asyncio.run(_run())
    logger.info("Low stock alerts refreshed: %s", result.get("alerts", []))
    return result


@celery_app.task(name="tasks.execute_workflow_run_task", bind=True, max_retries=3, default_retry_delay=30)
def execute_workflow_run_task(self, run_id_str: str) -> dict:
    """
    Workflow execution task.
    """
    async def _run() -> dict:
        from app.core.database import async_engine
        from app.services.workflow_engine import WorkflowEngine
        from app.services.workflow_action_service import WorkflowActionService
        from app.services.entitlement_service import EntitlementService
        from app.db.models import WorkflowRun, TenantUsageMeter

        try:
            async with AsyncSessionLocal() as session:
                run_id = UUID(run_id_str)
                run = await session.get(WorkflowRun, run_id)
                if not run:
                    logger.error(f"WorkflowRun {run_id_str} not found in task.")
                    return {"status": "failed", "error": "Not found"}

                if run.status != "pending":
                    logger.info(f"WorkflowRun {run_id_str} is already {run.status}. Skipping execution.")
                    return {"status": "skipped", "run_status": run.status}

                entitlement_svc = EntitlementService(session)
                action_svc = WorkflowActionService(session, entitlement_svc)
                engine = WorkflowEngine(session, action_svc)

                success = await engine.execute_run(run_id)

                if success:
                    meter = TenantUsageMeter(session)
                    await meter.record_usage(
                        tenant_id=run.tenant_id,
                        quota_code="workflow_runs",
                        increment_by=1,
                        event_ref=str(run.id)
                    )
                    await session.commit()
                    return {"status": "completed"}
                else:
                    return {"status": "failed", "error": "Engine failed"}
        except Exception as e:
            logger.error(f"Failed to execute workflow run {run_id_str}: {str(e)}", exc_info=True)
            raise self.retry(exc=e)
        finally:
            await async_engine.dispose()

    return asyncio.run(_run())


@celery_app.task(
    name="tasks.send_tenant_email",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=False,
    retry_kwargs={"max_retries": EMAIL_MAX_RETRIES},
    default_retry_delay=EMAIL_RETRY_DELAY_SECONDS,
)
def send_tenant_email_task(self, payload: dict) -> dict:
    async def _run() -> dict:
        from app.core.database import async_engine
        tenant_id = UUID(payload["tenant_id"])

        try:
            async with AsyncSessionLocal() as session:
                tenant_settings = await session.get(PlatformTenantSettings, tenant_id)
                audit = await send_tenant_email(
                    session,
                    tenant_id=tenant_id,
                    tenant_settings=tenant_settings,
                    template=payload["template"],
                    to=payload["to"],
                    subject=payload["subject"],
                    text=payload["text"],
                    html=payload.get("html"),
                    raise_on_failure=True,
                )
                await session.commit()
                return {
                    "audit_id": str(audit.id),
                    "status": audit.status,
                    "template": audit.template,
                    "provider_message_id": audit.provider_message_id,
                }
        finally:
            await async_engine.dispose()

    try:
        return asyncio.run(_run())
    except Exception as exc:
        if self.request.retries >= EMAIL_MAX_RETRIES:
            async def _dead_letter() -> None:
                from app.core.database import async_engine
                try:
                    async with AsyncSessionLocal() as session:
                        session.add(
                            OutboundEmailDeadLetter(
                                tenant_id=UUID(payload["tenant_id"]),
                                template=str(payload.get("template", "unknown")),
                                retry_count=self.request.retries,
                                payload=json.dumps(payload, ensure_ascii=False),
                                error_message=str(exc)[:2000],
                            )
                        )
                        await session.commit()
                finally:
                    await async_engine.dispose()

            asyncio.run(_dead_letter())
        raise


@celery_app.task(
    name="tasks.send_whatsapp_message",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=False,
    retry_kwargs={"max_retries": EMAIL_MAX_RETRIES},
    default_retry_delay=EMAIL_RETRY_DELAY_SECONDS,
)
def send_whatsapp_message_task(self, audit_id: str) -> dict:
    async def _run() -> dict:
        from app.core.database import async_engine
        try:
            async with AsyncSessionLocal() as session:
                # with_for_update() for idempotency
                result = await session.execute(
                    select(OutboundWhatsAppAudit)
                    .where(OutboundWhatsAppAudit.id == UUID(audit_id))
                    .with_for_update()
                )
                audit = result.scalars().first()
                if not audit:
                    logger.error(f"WhatsApp Audit record {audit_id} not found.")
                    return {}
                    
                # Idempotent check
                if audit.status in ("sent", "delivered", "read"):
                    logger.info(f"Audit {audit_id} already processed (status={audit.status}). Skipping.")
                    return {"audit_id": str(audit.id), "status": audit.status, "skipped": True}

                payload = json.loads(audit.payload_json) if audit.payload_json else {}
                components = payload.get("components", [])

                try:
                    resp = await send_whatsapp_template(
                        phone_number=audit.phone_number,
                        template_name=audit.template_name,
                        language_code="tr",
                        components=components
                    )

                    audit.status = "sent"
                    wamid = None
                    if "messages" in resp and len(resp["messages"]) > 0:
                        wamid = resp["messages"][0].get("id")
                        audit.provider_message_id = wamid

                    # Update related WorkOrderWhatsappMessage
                    wa_msg_res = await session.execute(
                        select(WorkOrderWhatsappMessage).where(WorkOrderWhatsappMessage.whatsapp_audit_id == audit.id)
                    )
                    wa_msg = wa_msg_res.scalars().first()
                    if wa_msg:
                        from datetime import datetime, timezone
                        wa_msg.whatsapp_message_id = wamid
                        wa_msg.status = WorkOrderWhatsappStatus.SENT
                        wa_msg.sent_at = datetime.now(timezone.utc).replace(tzinfo=None)

                    if audit.tenant_id:
                        from app.services.entitlement_service import EntitlementService
                        await EntitlementService.record_usage(
                            session,
                            tenant_id=audit.tenant_id,
                            meter_key="whatsapp_messages",
                            quantity=1,
                            source="whatsapp.sent",
                            event_ref=str(audit.id),
                        )

                    await session.commit()

                    return {
                        "audit_id": str(audit.id),
                        "status": audit.status,
                        "provider_message_id": audit.provider_message_id
                    }
                except Exception as exc:
                    audit.status = "failed"
                    audit.error_message = str(exc)[:2000]
                    
                    wa_msg_res = await session.execute(
                        select(WorkOrderWhatsappMessage).where(WorkOrderWhatsappMessage.whatsapp_audit_id == audit.id)
                    )
                    wa_msg = wa_msg_res.scalars().first()
                    if wa_msg:
                        wa_msg.status = WorkOrderWhatsappStatus.FAILED
                        wa_msg.error_message = str(exc)[:1000]
                        
                        from app.db.models import ErpNotification
                        from uuid import uuid4
                        from datetime import datetime, timezone
                        session.add(ErpNotification(
                            id=uuid4(),
                            tenant_id=audit.tenant_id,
                            event_type="whatsapp_failed",
                            title="WhatsApp gönderimi başarısız",
                            description=f"Telefon: {audit.phone_number} | Hata: {str(exc)[:200]}",
                            work_order_id=wa_msg.work_order_id,
                            is_read=False,
                            created_at=datetime.now(timezone.utc).replace(tzinfo=None)
                        ))
                        
                    await session.commit()
                    raise
        finally:
            await async_engine.dispose()

    return asyncio.run(_run())

# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Celery Worker Tasks
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
from app.db.models import LowStockAlert, Material, OutboundEmailDeadLetter, PlatformTenantSettings, Stock

logger = logging.getLogger(__name__)

EMAIL_MAX_RETRIES = max(0, int(settings.EMAIL_MAX_RETRIES))
EMAIL_RETRY_DELAY_SECONDS = max(1, int(settings.EMAIL_RETRY_DELAY_SECONDS))


@celery_app.task(name="tasks.check_low_stock", bind=True)
def check_low_stock(self) -> dict:
    """
    Kritik stok kontrolü — her saat çalıştırılır (celery beat tarafından).
    """

    async def _run() -> dict:
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

    result = asyncio.run(_run())
    logger.info("Low stock alerts refreshed: %s", result.get("alerts", []))
    return result


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
        tenant_id = UUID(payload["tenant_id"])

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

    try:
        return asyncio.run(_run())
    except Exception as exc:
        if self.request.retries >= EMAIL_MAX_RETRIES:
            async def _dead_letter() -> None:
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

            asyncio.run(_dead_letter())
        raise

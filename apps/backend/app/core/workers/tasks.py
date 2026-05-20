# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Celery Worker Tasks
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from app.core.workers import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="tasks.send_tenant_email_async",
    bind=True,
    max_retries=3,
    default_retry_delay=10
)
def send_tenant_email_async(
    self,
    tenant_id: str,
    template: str,
    to: list[str],
    subject: str,
    text: str,
    html: str | None = None
) -> dict:
    """
    Arka planda e-posta gönderim görevi (Senkron iş parçacıklarında çalışır).
    Redis kuyruğundan beslenir, Resend API üzerinden e-postayı senkron gönderir ve
    gönderim durumunu 'outbound_email_audits' tablosuna kaydeder.
    """
    from app.core.database import SessionLocal
    from app.core.emailing import send_tenant_email
    from app.db.models import PlatformTenantSettings
    from sqlmodel import select
    from uuid import UUID

    with SessionLocal() as db:
        # Resolving tenant settings in background worker
        tenant_settings = None
        if tenant_id:
            try:
                tenant_uuid = UUID(tenant_id)
                result = db.execute(
                    select(PlatformTenantSettings).where(
                        PlatformTenantSettings.tenant_id == tenant_uuid
                    )
                )
                tenant_settings = result.scalar_one_or_none()
            except ValueError:
                pass

        try:
            audit = send_tenant_email(
                db=db,
                tenant_id=tenant_id,
                tenant_settings=tenant_settings,
                template=template,
                to=to,
                subject=subject,
                text=text,
                html=html
            )
            return {"audit_id": str(audit.id), "status": audit.status}
        except Exception as exc:
            logger.error("E-posta gönderimi başarısız oldu, yeniden deneniyor: %s", exc)
            raise self.retry(exc=exc)


@celery_app.task(name="tasks.check_low_stock", bind=True)
def check_low_stock(self) -> dict:
    """
    Kritik stok kontrolü — her saat çalıştırılır (celery beat tarafından).
    Stok miktarı min_level'in altındaki öğeleri loglar ve adminlere e-posta uyarısı gönderir.
    """
    from app.core.database import SessionLocal
    from sqlmodel import select
    from app.db.models import Material, LowStockAlert, Stock, User, Tenant, PlatformTenantSettings
    from app.core.email_templates import build_branding_dict, get_low_stock_email_template

    with SessionLocal() as session:
        items = session.execute(
            select(Material).where(
                Material.is_active == True,
                Material.min_stock_level > 0,
            )
        ).scalars().all()

        alerts_created: list[dict] = []
        now = datetime.now(timezone.utc)
        one_day_ago = now - timedelta(days=1)

        for material in items:
            # Tüm depolarındaki toplam stoku topla
            stock_rows = session.execute(
                select(Stock).where(Stock.material_id == material.id)
            ).scalars().all()
            total_qty = sum(s.quantity for s in stock_rows)

            if total_qty <= material.min_stock_level:
                # E-posta spamini önlemek için son 24 saatte gönderilen aktif uyarıları kontrol et
                existing_alert = session.execute(
                    select(LowStockAlert).where(
                        LowStockAlert.item_id == material.id,
                        LowStockAlert.created_at >= one_day_ago
                    )
                ).scalars().first()

                if existing_alert:
                    # Zaten son 24 saat içinde uyarılmış, atla
                    continue

                # Yeni alert kaydı oluştur
                alert = LowStockAlert(
                    item_id       = material.id,
                    current_stock = total_qty,
                    min_level     = material.min_stock_level,
                    notified      = False,
                    created_at    = now,
                )
                session.add(alert)
                session.flush() # ID üretilmesi için flush et

                # Aktif yöneticileri sorgula
                admins = session.execute(
                    select(User).where(
                        User.is_active == True,
                        User.default_role == "admin"
                    )
                ).scalars().all()

                # Her yönetici için e-posta gönderimi tetikle
                sent_count = 0
                for admin in admins:
                    # Bu yöneticinin tenant bilgilerini derle
                    tenant_name = "SİSMİK ERP"
                    tenant_logo = None
                    tenant_settings = None

                    if admin.tenant_id:
                        tenant = session.execute(
                            select(Tenant).where(Tenant.id == admin.tenant_id)
                        ).scalars().first()
                        if tenant:
                            tenant_name = tenant.name
                            tenant_logo = tenant.logo_url

                        tenant_settings = session.execute(
                            select(PlatformTenantSettings).where(
                                PlatformTenantSettings.tenant_id == admin.tenant_id
                            )
                        ).scalars().first()

                    # Markalama ayarlarını derle
                    branding = build_branding_dict(tenant_settings, tenant_name, tenant_logo)

                    # Şablonu oluştur
                    subject, text_content, html_content = get_low_stock_email_template(
                        material_name=material.name,
                        sku=material.sku,
                        current_stock=total_qty,
                        min_level=material.min_stock_level,
                        branding=branding
                    )

                    # Asenkron e-posta görevini kuyruğa fırlat!
                    send_tenant_email_async.delay(
                        tenant_id=str(admin.tenant_id) if admin.tenant_id else "",
                        template="low_stock_alert",
                        to=[admin.email],
                        subject=subject,
                        text=text_content,
                        html=html_content
                    )
                    sent_count += 1

                # Uyarının başarıyla iletildiğini (kuyruğa atıldığını) işaretle
                alert.notified = True
                session.add(alert)

                alerts_created.append({
                    "sku":  material.sku,
                    "name": material.name,
                    "stock": total_qty,
                    "min":  material.min_stock_level,
                    "notifications_queued": sent_count
                })

        session.commit()

    logger.info("Low stock check completed. New alerts created: %s", alerts_created)
    return {"checked": len(items), "new_alerts": alerts_created}

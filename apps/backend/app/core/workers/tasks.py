# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Celery Worker Tasks
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

from app.core.workers import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.check_low_stock", bind=True)
def check_low_stock(self) -> dict:
    """
    Kilitik stok kontrolü — her saat çalıştırılır (celery beat tarafından).
    Stok miktarı min_level'in altındaki öğeleri loglar ve uyarı gönderir.
    """
    from app.db.session import get_session
    from sqlmodel import select
    from app.db.models import Material, LowStockAlert, Stock

    with get_session() as session:
        items = session.exec(
            select(Material).where(
                Material.is_active == True,
                Material.min_stock_level > 0,
            )
        ).all()

        alerts: list[dict] = []
        for material in items:
            # Tüm depolarındaki toplam stok topla
            stock_rows = session.exec(
                select(Stock).where(Stock.material_id == material.id)
            ).all()
            total_qty = sum(s.quantity for s in stock_rows)

            if total_qty <= material.min_stock_level:
                alert = LowStockAlert(
                    item_id       = material.id,
                    current_stock = total_qty,
                    min_level     = material.min_stock_level,
                )
                session.add(alert)
                alerts.append({
                    "sku":  material.sku,
                    "name": material.name,
                    "stock": total_qty,
                    "min":  material.min_stock_level,
                })
        session.commit()
    logger.info("Low stock alerts refreshed: %s", alerts)
    return {"checked": len(items), "alerts": alerts}

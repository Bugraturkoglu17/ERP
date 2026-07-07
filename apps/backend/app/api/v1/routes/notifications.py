"""
ERP Bildirimleri API
Routes: /api/v1/notifications/...
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_role
from app.db.models import ErpNotification, User

logger = logging.getLogger(__name__)
router = APIRouter()


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class NotificationRead(BaseModel):
    id: UUID
    tenant_id: Optional[UUID] = None
    event_type: str
    title: str
    description: Optional[str] = None
    work_order_id: Optional[UUID] = None
    work_order_title: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[NotificationRead])
async def list_notifications(
    unread_only: bool = Query(False),
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("platform_admin", "admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    """Son {days} gunun ERP bildirimleri."""
    since = utc_now() - timedelta(days=days)
    filters = [ErpNotification.created_at >= since]
    if user.tenant_id:
        filters.append(ErpNotification.tenant_id == user.tenant_id)
    if unread_only:
        filters.append(ErpNotification.is_read == False)

    result = await db.execute(
        select(ErpNotification)
        .where(*filters)
        .order_by(desc(ErpNotification.created_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("platform_admin", "admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    """Okunmamis bildirim sayisi."""
    filters = [ErpNotification.is_read == False]
    if user.tenant_id:
        filters.append(ErpNotification.tenant_id == user.tenant_id)

    result = await db.execute(
        select(func.count()).select_from(ErpNotification).where(*filters)
    )
    count = result.scalar_one_or_none() or 0
    return {"count": count}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("platform_admin", "admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    """Bildirimi okundu isaretl."""
    notif = await db.get(ErpNotification, notification_id)
    if not notif:
        raise HTTPException(404, "Bildirim bulunamadi.")
    if user.tenant_id and notif.tenant_id and notif.tenant_id != user.tenant_id:
        raise HTTPException(403, "Erisim yok.")
    if not notif.is_read:
        notif.is_read = True
        notif.read_at = utc_now()
        await db.commit()
    return {"ok": True}


@router.post("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    """Tum bildirimleri okundu isaretl."""
    filters = [ErpNotification.is_read == False]
    if user.tenant_id:
        filters.append(ErpNotification.tenant_id == user.tenant_id)

    result = await db.execute(select(ErpNotification).where(*filters))
    notifs = result.scalars().all()
    now = utc_now()
    for n in notifs:
        n.is_read = True
        n.read_at = now
    await db.commit()
    return {"marked": len(notifs)}

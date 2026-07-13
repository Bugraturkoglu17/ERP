"""
İş Emirleri (Work Orders) API
Routes: /api/v1/work-orders/...
        /api/v1/public/work-orders/...
        /api/v1/webhooks/whatsapp
"""
from __future__ import annotations

import secrets
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request

logger = logging.getLogger(__name__)
from pydantic import BaseModel
from sqlalchemy import select, desc, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import entitlement_http_error, get_current_user, get_db, require_feature, require_module, require_quota, require_role
from app.services.storage import storage, sanitize_filename
from app.core.permissions import verify_project_tenant, verify_work_order_tenant
from app.services.upload_validator import validate_uploaded_file
from app.core.rate_limiter import check_public_upload_rate_limit
from app.db.models import (
    Project, User, WorkOrder, WorkOrderActivity, WorkOrderPhoto,
    WorkOrderPublicLink, WorkOrderServiceForm, WorkOrderStatus,
    WorkOrderType, WorkOrderWhatsappMessage, WorkOrderWhatsappStatus,
    StoreActivity, StoreApprovalRequest, StoreServiceForm, OutboundWhatsAppAudit,
    Tenant, NotificationTemplateConfig, ErpNotification
)
from app.workers.tasks import send_whatsapp_message_task
from app.services.whatsapp_service import WorkOrderNotification, whatsapp_service
from app.services.notification_service import resolve_template_components, resolve_key_path
from app.services.entitlement_service import EntitlementService

router = APIRouter()

from app.core.utils.helpers import utc_now

WORK_TYPE_LABELS = {
    "maintenance":   "Bakım",
    "fault":         "Arıza",
    "repair":        "Onarım",
    "renovation":    "Tadilat",
    "manufacturing": "İmalat",
    "other":         "Diğer",
}

STATUS_LABELS = {
    "draft":            "Taslak",
    "sent":             "WhatsApp Gönderildi",
    "started":          "İşe Başlandı",
    "completed":        "Tamamlandı",
    "failed":           "Tamamlanmadı",
    "cancelled":        "İptal Edildi",
    "material_waiting": "Malzeme Bekliyor",
    "revisit":          "Tekrar Gidilecek",
    "approval_pending": "Onay Bekliyor",
    "approved":         "Onaylandı",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    project_id:        UUID
    work_type:         str
    title:             str
    description:       Optional[str] = None
    assigned_to_name:  Optional[str] = None
    assigned_to_phone: Optional[str] = None
    priority:          str = "normal"
    location_url:      Optional[str] = None
    due_date:          Optional[str] = None
    send_whatsapp:     Optional[bool] = True


class WorkOrderRead(BaseModel):
    id:                UUID
    project_id:        UUID
    project_name:      Optional[str] = None
    project_no:        Optional[str] = None
    work_type:         str
    work_type_label:   str
    title:             str
    description:       Optional[str] = None
    assigned_to_name:  Optional[str] = None
    assigned_to_phone: Optional[str] = None
    priority:          str
    status:            str
    status_label:      str
    location_url:      Optional[str] = None
    due_date:          Optional[datetime] = None
    created_by_name:   Optional[str] = None
    sent_at:           Optional[datetime] = None
    started_at:        Optional[datetime] = None
    completed_at:      Optional[datetime] = None
    completion_notes:  Optional[str] = None
    created_at:        datetime
    updated_at:        datetime
    photo_count:       int = 0
    has_service_form:  bool = False
    public_token:      Optional[str] = None
    photos:            list[dict] = []
    service_forms:     list[dict] = []

    class Config:
        from_attributes = True


class WorkOrderUpdate(BaseModel):
    title:             Optional[str] = None
    description:       Optional[str] = None
    assigned_to_name:  Optional[str] = None
    assigned_to_phone: Optional[str] = None
    priority:          Optional[str] = None
    due_date:          Optional[str] = None
    status:            Optional[str] = None
    send_whatsapp:     Optional[bool] = True


class PublicWorkOrderRead(BaseModel):
    id:                UUID
    project_id:        UUID
    project_name:      str
    project_no:        Optional[str] = None
    project_address:   Optional[str] = None
    project_phone:     Optional[str] = None
    work_type:         str
    work_type_label:   str
    title:             str
    description:       Optional[str] = None
    priority:          str
    status:            str
    location_url:      Optional[str] = None
    due_date:          Optional[datetime] = None
    photos:            List[dict] = []
    has_service_form:  bool = False


class PublicSubmit(BaseModel):
    status:            str   # started | completed | failed | cancelled | material_waiting | revisit
    completion_notes:  Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _parse_date(d: Optional[str]) -> Optional[datetime]:
    if not d:
        return None
    try:
        return datetime.fromisoformat(d.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


async def _get_active_link(work_order_id: UUID, db: AsyncSession) -> Optional[WorkOrderPublicLink]:
    result = await db.execute(
        select(WorkOrderPublicLink)
        .where(WorkOrderPublicLink.work_order_id == work_order_id, WorkOrderPublicLink.is_active == True)
        .order_by(desc(WorkOrderPublicLink.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _log_activity(
    db: AsyncSession,
    work_order_id: UUID,
    project_id: UUID,
    activity_type: str,
    title: str,
    description: Optional[str] = None,
) -> None:
    # TODO: Refactor using ActivityLoggerService if possible, keeping WorkOrderActivity logic.
    """İş emri + mağaza kartı aktivite kaydı oluştur."""
    now = utc_now()
    db.add(WorkOrderActivity(
        id=uuid4(), work_order_id=work_order_id, project_id=project_id,
        activity_type=activity_type, title=title, description=description, created_at=now,
    ))
    db.add(StoreActivity(
        id=uuid4(), project_id=project_id,
        activity_type=f"work_order_{activity_type}",
        title=title, description=description, created_at=now,
    ))



async def _create_erp_notification(
    db: AsyncSession,
    tenant_id: Optional[UUID],
    event_type: str,
    title: str,
    description: Optional[str] = None,
    work_order_id: Optional[UUID] = None,
    work_order_title: Optional[str] = None,
) -> None:
    """ERP bildirim kaydi olustur."""
    db.add(ErpNotification(
        id=uuid4(),
        tenant_id=tenant_id,
        event_type=event_type,
        title=title,
        description=description,
        work_order_id=work_order_id,
        work_order_title=work_order_title,
        is_read=False,
        created_at=utc_now(),
    ))


def _enrich(wo: WorkOrder, project: Project, photos: list, service_forms: list, link: Optional[WorkOrderPublicLink]) -> WorkOrderRead:
    return WorkOrderRead(
        id=wo.id,
        project_id=wo.project_id,
        project_name=project.name if project else None,
        project_no=project.project_no if project else None,
        work_type=wo.work_type,
        work_type_label=WORK_TYPE_LABELS.get(wo.work_type, wo.work_type),
        title=wo.title,
        description=wo.description,
        assigned_to_name=wo.assigned_to_name,
        assigned_to_phone=wo.assigned_to_phone,
        priority=wo.priority,
        status=wo.status,
        status_label=STATUS_LABELS.get(wo.status, wo.status),
        location_url=wo.location_url,
        due_date=wo.due_date,
        created_by_name=wo.created_by_name,
        sent_at=wo.sent_at,
        started_at=wo.started_at,
        completed_at=wo.completed_at,
        completion_notes=wo.completion_notes,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
        photo_count=len(photos),
        has_service_form=len(service_forms) > 0,
        public_token=link.token if link else None,
        photos=[{
            "id": str(p.id),
            "file_url": p.file_url,
            "file_name": p.file_name,
            "photo_type": p.photo_type,
            "uploaded_by_name": p.uploaded_by_name,
            "uploaded_at": p.uploaded_at
        } for p in photos],
        service_forms=[{
            "id": str(f.id),
            "file_url": f.file_url,
            "file_name": f.file_name,
            "year": f.year,
            "month": f.month,
            "uploaded_by_name": f.uploaded_by_name,
            "uploaded_at": f.uploaded_at
        } for f in service_forms],
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN ROUTES (JWT gerekli)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_work_order_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    """Dashboard KPI istatistikleri."""
    now = utc_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    h24_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)

    base_filter = [WorkOrder.is_deleted == False]
    if user.tenant_id:
        base_filter.append(WorkOrder.tenant_id == user.tenant_id)

    # Acik is emirleri
    open_statuses = ["draft", "sent", "started", "material_waiting", "revisit", "approval_pending"]
    open_r = await db.execute(
        select(sa_func.count()).select_from(WorkOrder)
        .where(*base_filter, WorkOrder.status.in_(open_statuses))
    )
    open_count = open_r.scalar_one_or_none() or 0

    # Bugun olusturulan
    today_r = await db.execute(
        select(sa_func.count()).select_from(WorkOrder)
        .where(*base_filter, WorkOrder.created_at >= today_start)
    )
    today_count = today_r.scalar_one_or_none() or 0

    # Bekleyen servis formlari (maintenance, form yuklenmemis)
    maint_r = await db.execute(
        select(WorkOrder.id).where(
            *base_filter,
            WorkOrder.work_type == "maintenance",
            WorkOrder.status.notin_(["cancelled", "failed"]),
        )
    )
    maintenance_ids = [row[0] for row in maint_r.all()]
    pending_forms = 0
    if maintenance_ids:
        forms_r = await db.execute(
            select(WorkOrderServiceForm.work_order_id)
            .where(WorkOrderServiceForm.work_order_id.in_(maintenance_ids))
        )
        has_form_ids = set(forms_r.scalars().all())
        pending_forms = len([mid for mid in maintenance_ids if mid not in has_form_ids])

    # Son 24s WhatsApp
    if user.tenant_id:
        wa_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .join(WorkOrder, WorkOrder.id == WorkOrderWhatsappMessage.work_order_id)
            .where(
                WorkOrderWhatsappMessage.created_at >= h24_ago,
                WorkOrder.tenant_id == user.tenant_id,
                WorkOrder.is_deleted == False,
            )
        )
    else:
        wa_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .where(WorkOrderWhatsappMessage.created_at >= h24_ago)
        )
    wa_sent_24h = wa_r.scalar_one_or_none() or 0

    # Okunma orani (son 7 gun)
    if user.tenant_id:
        total_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .join(WorkOrder, WorkOrder.id == WorkOrderWhatsappMessage.work_order_id)
            .where(
                WorkOrderWhatsappMessage.created_at >= week_ago,
                WorkOrder.tenant_id == user.tenant_id,
                WorkOrder.is_deleted == False,
                WorkOrderWhatsappMessage.status.in_(["sent", "delivered", "read"]),
            )
        )
        read_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .join(WorkOrder, WorkOrder.id == WorkOrderWhatsappMessage.work_order_id)
            .where(
                WorkOrderWhatsappMessage.created_at >= week_ago,
                WorkOrder.tenant_id == user.tenant_id,
                WorkOrder.is_deleted == False,
                WorkOrderWhatsappMessage.status == "read",
            )
        )
    else:
        total_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .where(WorkOrderWhatsappMessage.created_at >= week_ago,
                   WorkOrderWhatsappMessage.status.in_(["sent", "delivered", "read"]))
        )
        read_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .where(WorkOrderWhatsappMessage.created_at >= week_ago,
                   WorkOrderWhatsappMessage.status == "read")
        )
    total_sent = total_r.scalar_one_or_none() or 0
    read_count = read_r.scalar_one_or_none() or 0
    read_rate = round((read_count / total_sent) * 100, 1) if total_sent > 0 else 0.0

    # Basarisiz (24s)
    if user.tenant_id:
        fail_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .join(WorkOrder, WorkOrder.id == WorkOrderWhatsappMessage.work_order_id)
            .where(
                WorkOrderWhatsappMessage.created_at >= h24_ago,
                WorkOrder.tenant_id == user.tenant_id,
                WorkOrder.is_deleted == False,
                WorkOrderWhatsappMessage.status == "failed",
            )
        )
    else:
        fail_r = await db.execute(
            select(sa_func.count()).select_from(WorkOrderWhatsappMessage)
            .where(WorkOrderWhatsappMessage.created_at >= h24_ago,
                   WorkOrderWhatsappMessage.status == "failed")
        )
    failed_24h = fail_r.scalar_one_or_none() or 0

    return {
        "open_count": open_count,
        "today_created": today_count,
        "pending_service_forms": pending_forms,
        "whatsapp_sent_24h": wa_sent_24h,
        "whatsapp_read_rate_pct": read_rate,
        "whatsapp_failed_24h": failed_24h,
    }


@router.get("/{work_order_id}/preview-message")
async def preview_whatsapp_message(
    work_order_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    """Gondermeden once cozumlenmis WhatsApp sablonunu onizle."""
    wo = await db.get(WorkOrder, work_order_id)
    if not wo or wo.is_deleted:
        raise HTTPException(404, "Is emri bulunamadi.")

    proj = await db.get(Project, wo.project_id)
    tenant = None
    if wo.tenant_id:
        tenant = await db.get(Tenant, wo.tenant_id)
    elif user.tenant_id:
        tenant = await db.get(Tenant, user.tenant_id)

    link = await _get_active_link(wo.id, db)

    config_result = await db.execute(
        select(NotificationTemplateConfig).where(
            NotificationTemplateConfig.event_key == "work_order_assigned",
            NotificationTemplateConfig.channel == "whatsapp",
            NotificationTemplateConfig.is_active == True,
            (NotificationTemplateConfig.tenant_id == wo.tenant_id) | (NotificationTemplateConfig.tenant_id == None)
        ).order_by(NotificationTemplateConfig.tenant_id.desc())
    )
    config = config_result.scalars().first()

    template_name = "servis_gorev_atamasi_v2"
    language_code = "tr"
    components = []

    context = {"work_order": wo, "project": proj, "public_link": link, "tenant": tenant, "user": user}

    if config:
        template_name = config.template_name
        language_code = config.language_code
        components = resolve_template_components(config.component_mapping_json, context)
    else:
        lat, lon = parse_coordinates(wo.location_url)
        proj_name = proj.name if proj else "-"
        components = [
            {"type": "header", "parameters": [{"type": "location", "location": {"latitude": lat, "longitude": lon, "name": proj_name, "address": wo.location_url or "Belirtilen Konum"}}]},
            {"type": "body", "parameters": [{"type": "text", "text": wo.assigned_to_name or "-"}, {"type": "text", "text": proj_name}]},
            {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": link.token if link else "-"}]},
        ]

    preview_lines = []
    for comp in components:
        if comp.get("type") == "body":
            params = comp.get("parameters", [])
            preview_lines.append(f"Merhaba {params[0].get('text', '-') if params else '-'} Bey/Hanim,")
            if len(params) > 1:
                preview_lines.append(f"Gorev yeri: {params[1].get('text', '-')}")
        elif comp.get("type") == "button":
            params = comp.get("parameters", [])
            token = params[0].get("text", "-") if params else "-"
            preview_lines.append(f"Form linki: .../is-emri/{token}")

    preview_text = "\n".join(preview_lines) if preview_lines else "Onizleme olusturulamadi."

    return {
        "template_name": template_name,
        "language_code": language_code,
        "components": components,
        "preview_text": preview_text,
        "assigned_to": wo.assigned_to_name,
        "assigned_phone": wo.assigned_to_phone,
    }

@router.post("", response_model=WorkOrderRead, status_code=201)
async def create_work_order(
    payload: WorkOrderCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
    _module_user: User = Depends(require_module("work_orders")),
):
    user.tenant_id = _module_user.tenant_id
    proj = await verify_project_tenant(db, payload.project_id, user)

    wo = WorkOrder(
        id=uuid4(),
        tenant_id=user.tenant_id,
        project_id=payload.project_id,
        work_type=payload.work_type,
        title=payload.title,
        description=payload.description,
        assigned_to_name=payload.assigned_to_name,
        assigned_to_phone=payload.assigned_to_phone,
        priority=payload.priority or "normal",
        status=WorkOrderStatus.DRAFT,
        location_url=payload.location_url,
        due_date=_parse_date(payload.due_date),
        created_by=user.id,
        created_by_name=user.full_name,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(wo)

    # Public link oluştur
    token = _generate_token()
    from datetime import timedelta
    expires_at = utc_now() + timedelta(days=30)
    link = WorkOrderPublicLink(
        id=uuid4(), work_order_id=wo.id, token=token,
        is_active=True, expires_at=expires_at, created_at=utc_now(),
    )
    db.add(link)

    await db.commit()
    await db.refresh(wo)
    await EntitlementService.record_usage(db, user.tenant_id, "work_orders", 1, source="work_orders.create", event_ref=str(wo.id))
    await db.commit()

    # Auto-send WhatsApp if requested
    if payload.send_whatsapp and payload.assigned_to_phone:
        try:
            await _execute_whatsapp_sending(wo, db, user)
            await db.commit()
        except Exception as e:
            logger.error(f"Auto-sending WhatsApp failed on create: {e}")

    await _log_activity(db, wo.id, wo.project_id, "created", f"İş emri oluşturuldu: {wo.title}")
    await _create_erp_notification(
        db, wo.tenant_id, "work_order_created",
        f"Yeni is emri olusturuldu: {wo.title}",
        description=f"{WORK_TYPE_LABELS.get(str(wo.work_type), str(wo.work_type))} - {proj.name if proj else ''}",
        work_order_id=wo.id,
        work_order_title=wo.title,
    )
    await db.commit()

    return _enrich(wo, proj, [], [], link)


@router.get("", response_model=List[WorkOrderRead])
async def list_work_orders(
    project_id: Optional[UUID] = None,
    status:     Optional[str]  = None,
    work_type:  Optional[str]  = None,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
    _module_user: User = Depends(require_module("work_orders")),
):
    user.tenant_id = _module_user.tenant_id
    filters = [WorkOrder.is_deleted == False]
    if user.tenant_id:
        filters.append(WorkOrder.tenant_id == user.tenant_id)
    if project_id:
        filters.append(WorkOrder.project_id == project_id)
    if status:
        filters.append(WorkOrder.status == status)
    if work_type:
        filters.append(WorkOrder.work_type == work_type)

    result = await db.execute(
        select(WorkOrder).where(*filters).order_by(desc(WorkOrder.created_at)).limit(500)
    )
    wos = result.scalars().all()

    out = []
    for wo in wos:
        proj = await db.get(Project, wo.project_id)
        photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
        forms_r  = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
        link = await _get_active_link(wo.id, db)
        out.append(_enrich(wo, proj, photos_r.scalars().all(), forms_r.scalars().all(), link))
    return out


@router.get("/{work_order_id}", response_model=WorkOrderRead)
async def get_work_order(
    work_order_id: UUID,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    wo = await verify_work_order_tenant(db, work_order_id, user)
    proj = await db.get(Project, wo.project_id)
    photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
    forms_r  = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
    link = await _get_active_link(wo.id, db)
    return _enrich(wo, proj, photos_r.scalars().all(), forms_r.scalars().all(), link)


@router.patch("/{work_order_id}", response_model=WorkOrderRead)
async def update_work_order(
    work_order_id: UUID,
    payload: WorkOrderUpdate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    wo = await verify_work_order_tenant(db, work_order_id, user)

    reassigned = False
    if payload.assigned_to_phone is not None and payload.assigned_to_phone != wo.assigned_to_phone:
        reassigned = True

    if payload.title is not None:           wo.title = payload.title
    if payload.description is not None:     wo.description = payload.description
    if payload.assigned_to_name is not None: wo.assigned_to_name = payload.assigned_to_name
    if payload.assigned_to_phone is not None: wo.assigned_to_phone = payload.assigned_to_phone
    if payload.priority is not None:        wo.priority = payload.priority
    if payload.due_date is not None:        wo.due_date = _parse_date(payload.due_date)
    
    status_closed = False
    if payload.status is not None:
        wo.status = payload.status
        if payload.status in ("completed", "failed", "cancelled"):
            status_closed = True

    if reassigned or status_closed:
        old_links_r = await db.execute(
            select(WorkOrderPublicLink).where(
                WorkOrderPublicLink.work_order_id == wo.id,
                WorkOrderPublicLink.is_active == True
            )
        )
        for old_link in old_links_r.scalars().all():
            old_link.is_active = False

    if reassigned and not status_closed:
        token = _generate_token()
        from datetime import timedelta
        expires_at = utc_now() + timedelta(days=30)
        link = WorkOrderPublicLink(
            id=uuid4(), work_order_id=wo.id, token=token,
            is_active=True, expires_at=expires_at, created_at=utc_now(),
        )
        db.add(link)

    await db.commit()
    await db.refresh(wo)

    # Auto-send WhatsApp on reassignment or explicit request
    send_requested = False
    if hasattr(payload, "model_fields_set"):
        send_requested = "send_whatsapp" in payload.model_fields_set and payload.send_whatsapp
    else:
        send_requested = "send_whatsapp" in payload.__fields_set__ and payload.send_whatsapp

    if wo.assigned_to_phone and (reassigned or send_requested):
        try:
            await _execute_whatsapp_sending(wo, db, user)
            await db.commit()
        except Exception as e:
            logger.error(f"Auto-sending WhatsApp failed on update: {e}")

    proj = await db.get(Project, wo.project_id)
    photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
    forms_r  = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
    link = await _get_active_link(wo.id, db)
    return _enrich(wo, proj, photos_r.scalars().all(), forms_r.scalars().all(), link)


@router.delete("/{work_order_id}", status_code=204)
async def delete_work_order(
    work_order_id: UUID,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    wo = await verify_work_order_tenant(db, work_order_id, user)

    # Mağaza kartına silme kaydı düş
    db.add(StoreActivity(
        id=uuid4(), project_id=wo.project_id,
        activity_type="work_order_deleted",
        title=f"İş emri silindi: {wo.title}",
        created_at=utc_now(),
    ))

    wo.is_deleted = True
    wo.deleted_at = utc_now()
    wo.deleted_by_id = user.id

    # Revoke public links
    old_links_r = await db.execute(
        select(WorkOrderPublicLink).where(
            WorkOrderPublicLink.work_order_id == wo.id,
            WorkOrderPublicLink.is_active == True
        )
    )
    for old_link in old_links_r.scalars().all():
        old_link.is_active = False

    await db.commit()


# ── WhatsApp Gönder ───────────────────────────────────────────────────────────

import re

def parse_coordinates(url_or_str: Optional[str]) -> tuple[str, str]:
    """
    Parses latitude and longitude from a string/url.
    Returns (lat, long) as strings. Falls back to Istanbul coords if not found.
    """
    # Defaults (Istanbul)
    default_lat = "41.0082"
    default_long = "28.9784"
    
    if not url_or_str:
        return default_lat, default_long
        
    # Search for pattern like "40.9902,29.0292" or "40.9902, 29.0292"
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", url_or_str)
    if match:
        return match.group(1), match.group(2)
        
    return default_lat, default_long


# ── WhatsApp Gönder ───────────────────────────────────────────────────────────

import re
import json

def parse_coordinates(url_or_str: Optional[str]) -> tuple[str, str]:
    default_lat = "41.0082"
    default_long = "28.9784"
    if not url_or_str:
        return default_lat, default_long
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", url_or_str)
    if match:
        return match.group(1), match.group(2)
    return default_lat, default_long


async def _execute_whatsapp_sending(wo: WorkOrder, db: AsyncSession, user: User) -> None:
    if not wo.assigned_to_phone:
        raise HTTPException(status_code=400, detail="Atanacak kişinin telefon numarası girilmemiş.")
    tenant_id = wo.tenant_id or user.tenant_id
    if not tenant_id:
        raise entitlement_http_error(status.HTTP_403_FORBIDDEN, "ENTITLEMENT_CONTEXT_MISSING", "Tenant bağlamı bulunamadı.")
    if not await EntitlementService.is_feature_enabled(db, tenant_id, "whatsapp.notifications"):
        raise entitlement_http_error(status.HTTP_403_FORBIDDEN, "FEATURE_NOT_ENABLED", "whatsapp.notifications özelliği bu tenant için etkin değil.")
    if not await EntitlementService.quota_available(db, tenant_id, "whatsapp_messages", 1):
        raise entitlement_http_error(status.HTTP_429_TOO_MANY_REQUESTS, "QUOTA_EXCEEDED", "whatsapp_messages kotası aşıldı.")

    # 2-minute rate limit check
    from datetime import timedelta
    two_mins_ago = utc_now() - timedelta(minutes=2)
    last_msg_r = await db.execute(
        select(WorkOrderWhatsappMessage).where(
            WorkOrderWhatsappMessage.work_order_id == wo.id,
            WorkOrderWhatsappMessage.created_at >= two_mins_ago
        )
    )
    if last_msg_r.scalars().first():
        raise HTTPException(
            status_code=429,
            detail="Bu iş emri için son 2 dakika içinde zaten bir WhatsApp mesajı gönderildi. Lütfen bekleyin."
        )

    proj = await db.get(Project, wo.project_id)
    tenant = None
    if wo.tenant_id:
        tenant = await db.get(Tenant, wo.tenant_id)
    elif user.tenant_id:
        tenant = await db.get(Tenant, user.tenant_id)

    link = await _get_active_link(wo.id, db)
    if not link:
        token = _generate_token()
        expires_at = utc_now() + timedelta(days=30)
        link = WorkOrderPublicLink(
            id=uuid4(), work_order_id=wo.id, token=token,
            is_active=True, expires_at=expires_at, created_at=utc_now(),
        )
        db.add(link)
        await db.flush()

    # Query active template config
    config_result = await db.execute(
        select(NotificationTemplateConfig).where(
            NotificationTemplateConfig.event_key == "work_order_assigned",
            NotificationTemplateConfig.channel == "whatsapp",
            NotificationTemplateConfig.is_active == True,
            (NotificationTemplateConfig.tenant_id == wo.tenant_id) | (NotificationTemplateConfig.tenant_id == None)
        ).order_by(NotificationTemplateConfig.tenant_id.desc())
    )
    config = config_result.scalars().first()

    template_name = "servis_gorev_atamasi_v2"
    language_code = "tr"
    components = None

    context = {
        "work_order": wo,
        "project": proj,
        "public_link": link,
        "tenant": tenant,
        "user": user
    }

    if config:
        template_name = config.template_name
        language_code = config.language_code
        components = resolve_template_components(config.component_mapping_json, context)
    else:
        logger.warning(f"config_missing: No template config found for event_key=work_order_assigned, tenant_id={wo.tenant_id}. Using default fallback.")
        lat, lon = parse_coordinates(wo.location_url)
        components = [
            {
                "type": "header",
                "parameters": [
                    {
                        "type": "location",
                        "location": {
                            "latitude": lat,
                            "longitude": lon,
                            "name": proj.name if proj else "Şantiye Alanı",
                            "address": wo.location_url or "Belirtilen Konum"
                        }
                    }
                ]
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": wo.assigned_to_name or "-"},
                    {"type": "text", "text": proj.name if proj else "-"}
                ]
            },
            {
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [
                    {"type": "text", "text": link.token or "-"}
                ]
            }
        ]

    # Normalize phone number
    to_phone = wo.assigned_to_phone.strip().replace(" ", "").replace("-", "")
    if to_phone.startswith("+"):
        to_phone = to_phone[1:]
    elif to_phone.startswith("00"):
        to_phone = to_phone[2:]
    elif to_phone.startswith("0"):
        to_phone = "90" + to_phone[1:]

    payload = {"components": components}

    # Create WhatsApp audit log
    audit = OutboundWhatsAppAudit(
        id=uuid4(),
        tenant_id=wo.tenant_id or user.tenant_id,
        phone_number=to_phone,
        template_name=template_name,
        status="queued",
        payload_json=json.dumps(payload, ensure_ascii=False)
    )
    db.add(audit)
    await db.flush()

    # Create WorkOrder specific WhatsApp message log
    wa_msg = WorkOrderWhatsappMessage(
        id=uuid4(),
        work_order_id=wo.id,
        to_phone=to_phone,
        whatsapp_message_id=None,
        whatsapp_audit_id=audit.id,
        status=WorkOrderWhatsappStatus.QUEUED,
        error_message=None,
        sent_at=None,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(wa_msg)

    # Queue celery task
    send_whatsapp_message_task.delay(str(audit.id))

    # Update work order status
    wo.status = WorkOrderStatus.SENT
    wo.sent_at = utc_now()
    await _log_activity(db, wo.id, wo.project_id, "sent", f"İş emri WhatsApp kuyruğuna alındı: {wo.assigned_to_name or to_phone}")


@router.post("/{work_order_id}/send-whatsapp", response_model=WorkOrderRead)
async def send_whatsapp(
    work_order_id: UUID,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
    _module_user: User = Depends(require_module("work_orders")),
    _feature_user: User = Depends(require_feature("whatsapp.notifications")),
    _quota_user: User = Depends(require_quota("whatsapp_messages", 1)),
):
    user.tenant_id = _module_user.tenant_id
    wo = await verify_work_order_tenant(db, work_order_id, user)
    
    await _execute_whatsapp_sending(wo, db, user)
    await db.commit()
    await db.refresh(wo)

    proj = await db.get(Project, wo.project_id)
    photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
    forms_r  = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
    link = await _get_active_link(wo.id, db)
    return _enrich(wo, proj, photos_r.scalars().all(), forms_r.scalars().all(), link)


@router.get("/{work_order_id}/whatsapp-messages", response_model=List[Any])
async def get_work_order_whatsapp_messages(
    work_order_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
):
    wo = await verify_work_order_tenant(db, work_order_id, user)
        
    result = await db.execute(
        select(WorkOrderWhatsappMessage)
        .where(WorkOrderWhatsappMessage.work_order_id == work_order_id)
        .order_by(desc(WorkOrderWhatsappMessage.created_at))
    )
    messages = result.scalars().all()
    
    out = []
    for msg in messages:
        audit = None
        if msg.whatsapp_audit_id:
            audit = await db.get(OutboundWhatsAppAudit, msg.whatsapp_audit_id)
        out.append({
            "id": str(msg.id),
            "work_order_id": str(msg.work_order_id),
            "to_phone": msg.to_phone,
            "whatsapp_message_id": msg.whatsapp_message_id,
            "status": msg.status,
            "error_message": msg.error_message or (audit.error_message if audit else None),
            "sent_at": msg.sent_at,
            "created_at": msg.created_at,
            "updated_at": msg.updated_at,
        })
    return out


# ── Admin: fotoğraf yükle ─────────────────────────────────────────────────────

@router.post("/{work_order_id}/photos", status_code=201)
async def upload_admin_photo(
    work_order_id: UUID,
    photo_type: str = Form("completion"),
    file: UploadFile = File(...),
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(require_role("admin", "saha_muhendisi", "operasyon", "yonetici")),
    _module_user: User = Depends(require_module("work_orders")),
):
    user.tenant_id = _module_user.tenant_id
    wo = await verify_work_order_tenant(db, work_order_id, user)

    content = await file.read()
    
    # Dosya doğrulaması: 10MB limit, resim formatları
    allowed_img_exts = ["jpg", "jpeg", "png", "webp"]
    validate_uploaded_file(file, content, 10 * 1024 * 1024, allowed_img_exts)

    safe_name = sanitize_filename(file.filename or "photo.jpg")
    photo_id_new = uuid4()
    # Tenant-prefixed key format: tenants/{tenant_id}/work-orders/{work_order_id}/photos/{photo_id}_{safe_filename}
    file_key = f"tenants/{wo.tenant_id}/work-orders/{work_order_id}/photos/{photo_id_new}_{safe_name}"

    uploaded_key = await storage.upload_file(
        file_content=content, file_key=file_key, content_type=file.content_type
    )
    file_url = await storage.generate_presigned_url(uploaded_key)

    photo = WorkOrderPhoto(
        id=photo_id_new, work_order_id=wo.id,
        file_key=uploaded_key, file_url=file_url,
        file_name=file.filename, file_size_bytes=len(content),
        mime_type=file.content_type, photo_type=photo_type,
        uploaded_by_name=user.full_name, uploaded_at=utc_now(),
    )
    db.add(photo)
    await db.commit()
    return {"id": str(photo.id), "file_url": file_url, "photo_type": photo_type}


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC ROUTES (token korumalı, login gerektirmez)
# ═══════════════════════════════════════════════════════════════════════════════

public_router = APIRouter()


async def _resolve_token(token: str, db: AsyncSession) -> tuple[WorkOrderPublicLink, WorkOrder, Project]:
    link_r = await db.execute(
        select(WorkOrderPublicLink).where(
            WorkOrderPublicLink.token == token,
            WorkOrderPublicLink.is_active == True,
        )
    )
    link = link_r.scalar_one_or_none()
    if not link:
        raise HTTPException(404, "Geçersiz veya süresi dolmuş iş emri linki.")

    if link.expires_at and utc_now() > link.expires_at:
        link.is_active = False
        await db.commit()
        raise HTTPException(404, "Geçersiz veya süresi dolmuş iş emri linki.")

    wo = await db.get(WorkOrder, link.work_order_id)
    if not wo or wo.is_deleted:
        raise HTTPException(404, "İş emri bulunamadı.")

    if wo.status in (WorkOrderStatus.COMPLETED, WorkOrderStatus.FAILED, WorkOrderStatus.CANCELLED):
        link.is_active = False
        await db.commit()
        raise HTTPException(404, "Bu iş emri kapatıldığı için link artık aktif değil.")

    proj = await db.get(Project, wo.project_id)
    return link, wo, proj


@public_router.get("/work-orders/{token}", response_model=PublicWorkOrderRead)
async def public_get_work_order(token: str, db: AsyncSession = Depends(get_db)):
    link, wo, proj = await _resolve_token(token, db)

    photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
    photos = [
        {"id": str(p.id), "file_url": p.file_url, "photo_type": p.photo_type, "file_name": p.file_name}
        for p in photos_r.scalars().all()
    ]
    forms_r = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
    has_form = forms_r.scalars().first() is not None

    return PublicWorkOrderRead(
        id=wo.id,
        project_id=wo.project_id,
        project_name=proj.name if proj else "—",
        project_no=proj.project_no if proj else None,
        project_address=proj.description if proj else None,
        project_phone=None,
        work_type=wo.work_type,
        work_type_label=WORK_TYPE_LABELS.get(wo.work_type, wo.work_type),
        title=wo.title,
        description=wo.description,
        priority=wo.priority,
        status=wo.status,
        location_url=wo.location_url,
        due_date=wo.due_date,
        photos=photos,
        has_service_form=has_form,
    )


@public_router.post("/work-orders/{token}/submit")
async def public_submit_work_order(
    token: str,
    payload: PublicSubmit,
    db: AsyncSession = Depends(get_db),
):
    link, wo, proj = await _resolve_token(token, db)

    new_status = payload.status
    if new_status in ("completed", "failed", "cancelled"):
        link.is_active = False

    # Zorunluluk kontrolleri
    if new_status == "completed":
        photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
        photos = photos_r.scalars().all()
        if len(photos) == 0:
            raise HTTPException(400, "İşi tamamlandı olarak kapatmak için en az bir fotoğraf yüklemelisiniz.")

        if wo.work_type == "maintenance":
            forms_r = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
            if not forms_r.scalars().first():
                raise HTTPException(400, "Bakım işini tamamlamak için servis formu yüklemelisiniz.")

    wo.status = new_status
    if payload.completion_notes:
        wo.completion_notes = payload.completion_notes
    if new_status == "started" and not wo.started_at:
        wo.started_at = utc_now()
    if new_status in ("completed", "failed"):
        wo.completed_at = utc_now()

    status_labels = {
        "started":          "İşe başlandı",
        "completed":        "İş tamamlandı",
        "failed":           "İş tamamlanamadı olarak bildirildi",
        "cancelled":        "İş iptal edildi",
        "material_waiting": "Malzeme bekleniyor",
        "revisit":          "Tekrar gidilecek olarak işaretlendi",
    }
    activity_title = status_labels.get(new_status, f"Durum güncellendi: {new_status}")

    await _log_activity(db, wo.id, wo.project_id, new_status, activity_title, payload.completion_notes)

    # "İş Tamamlandı" ise Onay Süreçleri'ne kayıt düş (is_tamamlandi onayı)
    if new_status == "completed":
        existing_approval = await db.execute(
            select(StoreApprovalRequest).where(
                StoreApprovalRequest.approval_type == "is_tamamlandi",
                StoreApprovalRequest.description == str(wo.id),  # work_order_id referansı
            )
        )
        if not existing_approval.scalar_one_or_none():
            db.add(StoreApprovalRequest(
                id=uuid4(),
                tenant_id=wo.tenant_id,
                project_id=wo.project_id,
                approval_type="is_tamamlandi",
                title=f"İş Tamamlandı: {wo.title}",
                description=str(wo.id),   # work_order_id sakla, duplicate kontrolü için
                amount=None,
                status="bekliyor",
                requested_by_name=wo.assigned_to_name or "Saha",
                requested_at=utc_now(),
                created_at=utc_now(),
                updated_at=utc_now(),
            ))

    await db.commit()

    return {"success": True, "status": new_status}


@public_router.post("/work-orders/{token}/photos", status_code=201)
async def public_upload_photo(
    token: str,
    photo_type: str = Form("completion"),
    uploaded_by_name: str = Form(""),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    await check_public_upload_rate_limit(token)
    link, wo, proj = await _resolve_token(token, db)

    content = await file.read()
    
    # Dosya doğrulaması: 10MB limit, resim formatları
    allowed_img_exts = ["jpg", "jpeg", "png", "webp"]
    validate_uploaded_file(file, content, 10 * 1024 * 1024, allowed_img_exts)

    safe_name = sanitize_filename(file.filename or "photo.jpg")
    photo_id_new = uuid4()
    # Tenant-prefixed key format
    file_key = f"tenants/{wo.tenant_id}/work-orders/{wo.id}/photos/{photo_id_new}_{safe_name}"

    uploaded_key = await storage.upload_file(
        file_content=content, file_key=file_key, content_type=file.content_type
    )
    file_url = await storage.generate_presigned_url(uploaded_key)

    photo = WorkOrderPhoto(
        id=photo_id_new, work_order_id=wo.id,
        file_key=uploaded_key, file_url=file_url,
        file_name=file.filename, file_size_bytes=len(content),
        mime_type=file.content_type, photo_type=photo_type,
        uploaded_by_name=uploaded_by_name or None, uploaded_at=utc_now(),
    )
    db.add(photo)

    await _log_activity(db, wo.id, wo.project_id, "photo_uploaded", "Fotoğraf yüklendi")
    await db.commit()

    return {"id": str(photo.id), "file_url": file_url}


@public_router.post("/work-orders/{token}/service-form", status_code=201)
async def public_upload_service_form(
    token: str,
    uploaded_by_name: str = Form(""),
    year:  int = Form(...),
    month: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    await check_public_upload_rate_limit(token)
    link, wo, proj = await _resolve_token(token, db)

    content = await file.read()
    
    # Dosya doğrulaması: 15MB limit, PDF formatı
    validate_uploaded_file(file, content, 15 * 1024 * 1024, ["pdf"])

    safe_name = sanitize_filename(file.filename or "servis-formu.pdf")
    form_id_new = uuid4()
    # Tenant-prefixed key format
    file_key = f"tenants/{wo.tenant_id}/work-orders/{wo.id}/service-forms/{form_id_new}_{safe_name}"

    uploaded_key = await storage.upload_file(
        file_content=content, file_key=file_key, content_type=file.content_type
    )
    file_url = await storage.generate_presigned_url(uploaded_key)

    form = WorkOrderServiceForm(
        id=form_id_new, work_order_id=wo.id, project_id=wo.project_id,
        year=year, month=month,
        file_key=uploaded_key, file_url=file_url,
        file_name=file.filename, file_size_bytes=len(content),
        uploaded_by_name=uploaded_by_name or None, uploaded_at=utc_now(),
    )
    db.add(form)

    # Bakım & Onarım > Servis Formları ekranına da düş
    # (StoreServiceForm tablosuna da yaz, böylece bakim/servis-formlari sayfası görebilir)
    existing_store_form_r = await db.execute(
        select(StoreServiceForm).where(
            StoreServiceForm.project_id == wo.project_id,
            StoreServiceForm.year == year,
            StoreServiceForm.month == month,
        )
    )
    store_form = existing_store_form_r.scalar_one_or_none()
    if store_form:
        store_form.file_url = uploaded_key
        store_form.file_name = file.filename
        store_form.file_size_bytes = len(content)
        store_form.uploaded_by_name = uploaded_by_name or "Saha (İş Emri - Güncellendi)"
        store_form.updated_at = utc_now()
    else:
        db.add(StoreServiceForm(
            id=uuid4(),
            tenant_id=wo.tenant_id,
            project_id=wo.project_id,
            year=year, month=month,
            file_url=uploaded_key,   # document key olarak sakla
            file_name=file.filename,
            file_size_bytes=len(content),
            uploaded_by_name=uploaded_by_name or "Saha (İş Emri)",
            description=f"İş emri #{wo.id} üzerinden yüklendi",
            status="uploaded",
            created_at=utc_now(),
            updated_at=utc_now(),
        ))

    await _log_activity(db, wo.id, wo.project_id, "service_form_uploaded", "Servis formu yüklendi")
    await _create_erp_notification(
        db, wo.tenant_id, "service_form_submitted",
        "Teknisyen servis formunu yukledi",
        description=f"Is emri: {wo.title}",
        work_order_id=wo.id,
        work_order_title=wo.title,
    )
    await db.commit()

    return {"id": str(form.id), "file_url": file_url}


# ═══════════════════════════════════════════════════════════════════════════════
#  WEBHOOK — WhatsApp durum güncellemeleri
# ═══════════════════════════════════════════════════════════════════════════════

webhook_router = APIRouter()


@webhook_router.get("/whatsapp")
async def whatsapp_webhook_verify(
    request: Request,
    hub_mode: Optional[str] = None,
    hub_verify_token: Optional[str] = None,
    hub_challenge: Optional[str] = None,
):
    from fastapi.responses import PlainTextResponse
    verify_token = whatsapp_service.verify_token
    params = dict(request.query_params)
    mode      = params.get("hub.mode")
    token     = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == verify_token:
        return PlainTextResponse(challenge or "")
    raise HTTPException(403, "Doğrulama başarısız.")


@webhook_router.post("/whatsapp")
async def whatsapp_webhook_receive(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        data = await request.json()
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for status_update in value.get("statuses", []):
                    msg_id     = status_update.get("id")
                    new_status = status_update.get("status")  # sent | delivered | read | failed

                    if not msg_id or not new_status:
                        continue

                    status_map = {
                        "sent":      WorkOrderWhatsappStatus.SENT,
                        "delivered": WorkOrderWhatsappStatus.DELIVERED,
                        "read":      WorkOrderWhatsappStatus.READ,
                        "failed":    WorkOrderWhatsappStatus.FAILED,
                    }
                    mapped = status_map.get(new_status)
                    if not mapped:
                        continue

                    result = await db.execute(
                        select(WorkOrderWhatsappMessage).where(
                            WorkOrderWhatsappMessage.whatsapp_message_id == msg_id
                        )
                    )
                    wa_msg = result.scalar_one_or_none()
                    if wa_msg:
                        wa_msg.status = mapped
                        await db.commit()
    except Exception:
        pass
    return {"status": "ok"}

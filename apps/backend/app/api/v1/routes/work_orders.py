"""
İş Emirleri (Work Orders) API
Routes: /api/v1/work-orders/...
        /api/v1/public/work-orders/...
        /api/v1/webhooks/whatsapp
"""
from __future__ import annotations

import json
import secrets
import time
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.core.storage import storage, sanitize_filename
from app.db.models import (
    Document, Project, User, WorkOrder, WorkOrderActivity, WorkOrderPhoto,
    WorkOrderPublicLink, WorkOrderServiceForm, WorkOrderStatus,
    WorkOrderType, WorkOrderWhatsappMessage, WorkOrderWhatsappStatus,
    StoreActivity, StoreApprovalRequest, StoreServiceForm,
)
from app.services.whatsapp_service import WorkOrderNotification, whatsapp_service

router = APIRouter()


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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


class WorkOrderPhotoRead(BaseModel):
    id:                    UUID
    work_order_id:         UUID
    file_key:              str
    file_name:             Optional[str]
    file_size_bytes:       Optional[int]
    mime_type:             Optional[str]
    photo_type:            str
    uploaded_by_name:      Optional[str]
    uploaded_at:           datetime
    is_added_to_inventory: bool
    vi_doc_id:             Optional[UUID]
    fresh_url:             Optional[str] = None


class AddPhotosToInventoryPayload(BaseModel):
    photo_ids: List[UUID]
    category:  Optional[str] = "saha_gorseli"
    title:     Optional[str] = None


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


def _parse_project_address(proj: Project) -> Optional[str]:
    if not proj or not proj.description:
        return None
    try:
        d = json.loads(proj.description)
        return d.get("adres") or None
    except Exception:
        return None


def _parse_project_phone(proj: Project) -> Optional[str]:
    if not proj or not proj.description:
        return None
    try:
        d = json.loads(proj.description)
        return d.get("tel1") or None
    except Exception:
        return None


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
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN ROUTES (JWT gerekli)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("", response_model=WorkOrderRead, status_code=201)
async def create_work_order(
    payload: WorkOrderCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    proj = await db.get(Project, payload.project_id)
    if not proj:
        raise HTTPException(404, "Mağaza bulunamadı.")

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
    link = WorkOrderPublicLink(
        id=uuid4(), work_order_id=wo.id, token=token,
        is_active=True, created_at=utc_now(),
    )
    db.add(link)

    await db.commit()
    await db.refresh(wo)

    await _log_activity(db, wo.id, wo.project_id, "created", f"İş emri oluşturuldu: {wo.title}")
    await db.commit()

    return _enrich(wo, proj, [], [], link)


@router.get("", response_model=List[WorkOrderRead])
async def list_work_orders(
    project_id: Optional[UUID] = None,
    status:     Optional[str]  = None,
    work_type:  Optional[str]  = None,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    filters = []
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
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")
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
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")

    if payload.title is not None:           wo.title = payload.title
    if payload.description is not None:     wo.description = payload.description
    if payload.assigned_to_name is not None: wo.assigned_to_name = payload.assigned_to_name
    if payload.assigned_to_phone is not None: wo.assigned_to_phone = payload.assigned_to_phone
    if payload.priority is not None:        wo.priority = payload.priority
    if payload.due_date is not None:        wo.due_date = _parse_date(payload.due_date)
    if payload.status is not None:          wo.status = payload.status

    await db.commit()
    await db.refresh(wo)

    proj = await db.get(Project, wo.project_id)
    photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
    forms_r  = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
    link = await _get_active_link(wo.id, db)
    return _enrich(wo, proj, photos_r.scalars().all(), forms_r.scalars().all(), link)


@router.delete("/{work_order_id}", status_code=204)
async def delete_work_order(
    work_order_id: UUID,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")

    # Mağaza kartına silme kaydı düş (iş emri silindikten sonra project_id kaybolur)
    db.add(StoreActivity(
        id=uuid4(), project_id=wo.project_id,
        activity_type="work_order_deleted",
        title=f"İş emri silindi: {wo.title}",
        created_at=utc_now(),
    ))

    # Child tabloları FK kısıtı oluşturmadan önce sil
    for child_model in [
        WorkOrderActivity, WorkOrderPhoto, WorkOrderServiceForm,
        WorkOrderWhatsappMessage, WorkOrderPublicLink,
    ]:
        rows = await db.execute(
            select(child_model).where(child_model.work_order_id == work_order_id)
        )
        for row in rows.scalars().all():
            await db.delete(row)

    await db.flush()
    await db.delete(wo)
    await db.commit()


# ── WhatsApp Gönder ───────────────────────────────────────────────────────────

@router.post("/{work_order_id}/send-whatsapp", response_model=WorkOrderRead)
async def send_whatsapp(
    work_order_id: UUID,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")
    if not wo.assigned_to_phone:
        raise HTTPException(400, "Atanacak kişinin telefon numarası girilmemiş.")

    proj = await db.get(Project, wo.project_id)

    link = await _get_active_link(wo.id, db)
    if not link:
        token = _generate_token()
        link = WorkOrderPublicLink(
            id=uuid4(), work_order_id=wo.id, token=token,
            is_active=True, created_at=utc_now(),
        )
        db.add(link)
        await db.flush()

    # Admin fotoğrafı varsa ilkini WhatsApp mesajına ekle
    admin_photos_r = await db.execute(
        select(WorkOrderPhoto)
        .where(WorkOrderPhoto.work_order_id == wo.id)
        .limit(1)
    )
    first_photo = admin_photos_r.scalar_one_or_none()
    attachment_url = first_photo.file_url if first_photo and first_photo.file_url else None

    public_url = whatsapp_service.build_public_url(link.token)

    proj_desc: dict = {}
    if proj and proj.description:
        try:
            import json as _json
            proj_desc = _json.loads(proj.description)
        except Exception:
            pass

    notif = WorkOrderNotification(
        store_name=proj.name if proj else "—",
        store_code=proj.project_no if proj else None,
        work_type_label=WORK_TYPE_LABELS.get(wo.work_type, wo.work_type),
        title=wo.title,
        description=wo.description,
        store_address=proj_desc.get("adres") or None,
        store_phone=proj_desc.get("tel1") or None,
        public_url=public_url,
        to_phone=wo.assigned_to_phone,
        assigned_name=wo.assigned_to_name,
        attachment_url=attachment_url,
    )

    result = await whatsapp_service.send_work_order(notif)

    # WhatsApp mesaj kaydı
    wa_msg = WorkOrderWhatsappMessage(
        id=uuid4(),
        work_order_id=wo.id,
        to_phone=wo.assigned_to_phone,
        whatsapp_message_id=result.get("message_id"),
        status=WorkOrderWhatsappStatus.SENT if result["success"] else WorkOrderWhatsappStatus.FAILED,
        error_message=result.get("error"),
        sent_at=utc_now() if result["success"] else None,
        updated_at=utc_now(),
    )
    db.add(wa_msg)

    if result["success"]:
        wo.status = WorkOrderStatus.SENT
        wo.sent_at = utc_now()
        await _log_activity(db, wo.id, wo.project_id, "sent", f"İş emri WhatsApp ile gönderildi: {wo.assigned_to_name or wo.assigned_to_phone}")

    await db.commit()
    await db.refresh(wo)

    photos_r = await db.execute(select(WorkOrderPhoto).where(WorkOrderPhoto.work_order_id == wo.id))
    forms_r  = await db.execute(select(WorkOrderServiceForm).where(WorkOrderServiceForm.work_order_id == wo.id))
    return _enrich(wo, proj, photos_r.scalars().all(), forms_r.scalars().all(), link)


# ── Admin: fotoğraf yükle ─────────────────────────────────────────────────────

@router.post("/{work_order_id}/photos", status_code=201)
async def upload_admin_photo(
    work_order_id: UUID,
    photo_type: str = Form("completion"),
    file: UploadFile = File(...),
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")

    content = await file.read()
    safe_name = sanitize_filename(file.filename or "photo.jpg")
    file_key = f"work-orders/{work_order_id}/photos/{int(time.time())}_{safe_name}"

    uploaded_key = await storage.upload_file(
        file_content=content, file_key=file_key, content_type=file.content_type
    )
    file_url = await storage.generate_presigned_url(uploaded_key)

    photo = WorkOrderPhoto(
        id=uuid4(), work_order_id=wo.id,
        file_key=uploaded_key, file_url=file_url,
        file_name=file.filename, file_size_bytes=len(content),
        mime_type=file.content_type, photo_type=photo_type,
        uploaded_by_name=user.full_name, uploaded_at=utc_now(),
    )
    db.add(photo)
    await db.commit()
    return {"id": str(photo.id), "file_url": file_url, "photo_type": photo_type}


# ── İş emri fotoğraflarını listele ───────────────────────────────────────────

@router.get("/{work_order_id}/photos", response_model=List[WorkOrderPhotoRead])
async def list_work_order_photos(
    work_order_id: UUID,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")

    photos_r = await db.execute(
        select(WorkOrderPhoto)
        .where(WorkOrderPhoto.work_order_id == work_order_id)
        .order_by(WorkOrderPhoto.uploaded_at)
    )
    photos = photos_r.scalars().all()

    result = []
    for p in photos:
        try:
            url = await storage.generate_presigned_url(p.file_key)
        except Exception:
            url = p.file_url
        result.append(WorkOrderPhotoRead(
            id=p.id,
            work_order_id=p.work_order_id,
            file_key=p.file_key,
            file_name=p.file_name,
            file_size_bytes=p.file_size_bytes,
            mime_type=p.mime_type,
            photo_type=p.photo_type,
            uploaded_by_name=p.uploaded_by_name,
            uploaded_at=p.uploaded_at,
            is_added_to_inventory=p.is_added_to_inventory,
            vi_doc_id=p.vi_doc_id,
            fresh_url=url,
        ))
    return result


# ── Fotoğrafları Görsel Envanter'e aktar ─────────────────────────────────────

@router.post("/{work_order_id}/add-photos-to-inventory")
async def add_photos_to_inventory(
    work_order_id: UUID,
    payload: AddPhotosToInventoryPayload,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    wo = await db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")

    added: list[str] = []
    skipped: list[str] = []

    for photo_id in payload.photo_ids:
        photo_r = await db.execute(
            select(WorkOrderPhoto).where(
                WorkOrderPhoto.id == photo_id,
                WorkOrderPhoto.work_order_id == work_order_id,
            )
        )
        photo = photo_r.scalar_one_or_none()
        if not photo:
            continue
        if photo.is_added_to_inventory:
            skipped.append(str(photo_id))
            continue

        vi_meta = {
            "c":        payload.category or "saha_gorseli",
            "t":        payload.title or photo.file_name or "Saha Görseli",
            "source":   "work_order",
            "wo_id":    str(wo.id),
            "wo_title": wo.title,
            "reporter": photo.uploaded_by_name,
            "wo_date":  photo.uploaded_at.strftime("%Y-%m-%d"),
        }

        doc = Document(
            id=uuid4(),
            project_id=wo.project_id,
            doc_type="visual_inventory",
            original_name=photo.file_name or "saha-fotografi.jpg",
            file_key=photo.file_key,
            bucket_name=storage.bucket_name,
            file_size_bytes=photo.file_size_bytes,
            mime_type=photo.mime_type,
            revision_note=None,
            vi_meta=json.dumps(vi_meta, ensure_ascii=False),
            version=1,
            uploaded_by=user.id,
            created_at=utc_now(),
        )
        db.add(doc)
        await db.flush()

        photo.is_added_to_inventory = True
        photo.vi_doc_id = doc.id
        added.append(str(photo_id))

    if added:
        await _log_activity(
            db, wo.id, wo.project_id,
            "photos_added_to_inventory",
            f"İş emrinden {len(added)} saha görseli Görsel Envanter'e eklendi",
            f"İş emri: {wo.title}",
        )

    await db.commit()
    return {"added": added, "skipped": skipped, "total_added": len(added)}


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

    wo = await db.get(WorkOrder, link.work_order_id)
    if not wo:
        raise HTTPException(404, "İş emri bulunamadı.")

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
        project_address=_parse_project_address(proj),
        project_phone=_parse_project_phone(proj),
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
    link, wo, proj = await _resolve_token(token, db)

    content = await file.read()
    safe_name = sanitize_filename(file.filename or "photo.jpg")
    file_key = f"work-orders/{wo.id}/photos/{int(time.time())}_{safe_name}"

    uploaded_key = await storage.upload_file(
        file_content=content, file_key=file_key, content_type=file.content_type
    )
    file_url = await storage.generate_presigned_url(uploaded_key)

    photo = WorkOrderPhoto(
        id=uuid4(), work_order_id=wo.id,
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
    link, wo, proj = await _resolve_token(token, db)

    content = await file.read()
    safe_name = sanitize_filename(file.filename or "servis-formu.pdf")
    file_key = f"work-orders/{wo.id}/service-forms/{int(time.time())}_{safe_name}"

    uploaded_key = await storage.upload_file(
        file_content=content, file_key=file_key, content_type=file.content_type
    )
    file_url = await storage.generate_presigned_url(uploaded_key)

    form = WorkOrderServiceForm(
        id=uuid4(), work_order_id=wo.id, project_id=wo.project_id,
        year=year, month=month,
        file_key=uploaded_key, file_url=file_url,
        file_name=file.filename, file_size_bytes=len(content),
        uploaded_by_name=uploaded_by_name or None, uploaded_at=utc_now(),
    )
    db.add(form)

    # Bakım & Onarım > Servis Formları ekranına da düş
    # (StoreServiceForm tablosuna da yaz, böylece bakim/servis-formlari sayfası görebilir)
    existing_store_form = await db.execute(
        select(StoreServiceForm).where(
            StoreServiceForm.project_id == wo.project_id,
            StoreServiceForm.year == year,
            StoreServiceForm.month == month,
        )
    )
    if not existing_store_form.scalar_one_or_none():
        db.add(StoreServiceForm(
            id=uuid4(),
            tenant_id=wo.tenant_id,
            project_id=wo.project_id,
            year=year, month=month,
            file_url=file_url,
            file_name=file.filename,
            file_size_bytes=len(content),
            uploaded_by_name=uploaded_by_name or "Saha (İş Emri)",
            description=f"İş emri #{wo.id} üzerinden yüklendi",
            status="uploaded",
            created_at=utc_now(),
            updated_at=utc_now(),
        ))

    await _log_activity(db, wo.id, wo.project_id, "service_form_uploaded", "Servis formu yüklendi")
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

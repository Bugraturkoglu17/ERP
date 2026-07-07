# ─────────────────────────────────────────────────────────────────────────────
#  V1 — Documents Routes
#  File Management / OCI Storage / Versioning
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.storage import storage, sanitize_filename
from app.core.exceptions import NotFoundError, ConflictError
from app.db.models import Document, User, Project
from app.core.dependencies import get_current_user, require_module
from app.core.permissions import verify_project_tenant, verify_document_tenant
from app.core.upload_validator import validate_uploaded_file
from app.db.schemas import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentDownloadResponse,
)
from app.core.services.entitlement_service import EntitlementService

router = APIRouter()


async def populate_uploader_details(docs: list[Document] | Document, db: AsyncSession) -> list[Document] | Document:
    is_single = False
    if isinstance(docs, Document):
        is_single = True
        docs_list = [docs]
    else:
        docs_list = list(docs)
        
    uploader_ids = {d.uploaded_by for d in docs_list if d.uploaded_by}
    if not uploader_ids:
        return docs if not is_single else docs_list[0]
        
    users_result = await db.execute(select(User).where(User.id.in_(uploader_ids)))
    users_lookup = {u.id: u for u in users_result.scalars()}
    
    for d in docs_list:
        if d.uploaded_by and d.uploaded_by in users_lookup:
            u = users_lookup[d.uploaded_by]
            object.__setattr__(d, "uploaded_by_name", u.full_name)
            object.__setattr__(d, "uploaded_by_email", u.email)
            
    return docs_list[0] if is_single else docs_list


@router.post(
    "/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni döküman yükle",
)
async def upload_document(
    project_id:    uuid.UUID = Form(...),
    doc_type:      str       = Form(...),
    revision_note: str | None = Form(None),
    expense_id:    uuid.UUID | None = Form(None),
    file:          UploadFile = File(...),
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
    _module_user: User         = Depends(require_module("documents")),
) -> Document:
    current_user.tenant_id = _module_user.tenant_id
    # ── 0 · Tenant doğrulaması (P0 security fix) ───────────────────────────────
    await verify_project_tenant(db, project_id, current_user)

    # ── 1 · Dosyayı oku ve depolamaya yükle ──────────────────────────────────────
    content = await file.read()
    
    # Dosya doğrulaması: 20MB limit, izinli doküman formatları
    allowed_doc_exts = ["pdf", "docx", "xlsx", "zip", "rar", "png", "jpg", "jpeg", "webp"]
    validate_uploaded_file(file, content, 20 * 1024 * 1024, allowed_doc_exts)

    safe_name = sanitize_filename(file.filename or "document")
    doc_id_new = uuid.uuid4()
    # Tenant-prefixed key format: tenants/{tenant_id}/projects/{project_id}/{doc_type}/{doc_id}_{safe_filename}
    file_key = (
        f"tenants/{current_user.tenant_id}/projects/{project_id}"
        f"/{doc_type}/{doc_id_new}_{safe_name}"
    )
    
    try:
        uploaded_key = await storage.upload_file(
            file_content=content,
            file_key=file_key,
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulut depolama hatası: {e}")

    # ── 2 · DB kaydını oluştur ──────────────────────────────────────────────────
    doc = Document(
        id            = doc_id_new,
        project_id    = project_id,
        doc_type      = doc_type,
        original_name = file.filename,
        file_key      = uploaded_key,
        bucket_name   = storage.bucket_name,
        file_size_bytes = len(content),
        mime_type     = file.content_type,
        revision_note = revision_note,
        version       = 1,
        uploaded_by   = current_user.id,
        expense_id    = expense_id,
    )
    db.add(doc)
    
    try:
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        # Fiziksel dosyayı temizle
        await storage.delete_file(uploaded_key)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Veritabanı kaydı başarısız: {e}")

    await EntitlementService.record_usage(db, current_user.tenant_id, "documents", 1, source="documents.upload", event_ref=str(doc.id))
    await EntitlementService.record_usage(db, current_user.tenant_id, "storage_bytes", len(content), source="documents.upload", event_ref=str(doc.id))
    await db.commit()
    await populate_uploader_details(doc, db)
    return doc


@router.get(
    "/project/{project_id}",
    response_model=list[DocumentRead],
    summary="Projeye ait dökümanları listele",
)
async def list_project_documents(
    project_id: uuid.UUID,
    db:         AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
    _module_user: User         = Depends(require_module("documents")),
) -> list[Document]:
    current_user.tenant_id = _module_user.tenant_id
    # ── Tenant doğrulaması (P0 security fix) ──────────────────────────────────
    await verify_project_tenant(db, project_id, current_user)

    # Only return the latest version of each document group (parent_id is None or current)
    # A simpler way: just list all and let frontend handle or list only archived=False
    query = select(Document).where(
        Document.project_id == project_id,
        Document.archived == False
    )

    # Apply discipline-based restriction for discipline_only engineers
    if current_user.discipline_only and current_user.discipline:
        allowed_types = ["field_report", "photo", "revision", "other"]
        mapped_drawing = f"drawing_{current_user.discipline}"
        allowed_types.append(mapped_drawing)
        query = query.where(Document.doc_type.in_(allowed_types))

    query = query.order_by(Document.created_at.desc())
    
    result = await db.execute(query)
    docs = list(result.scalars())
    await populate_uploader_details(docs, db)
    return docs


@router.get(
    "/{doc_id}/download",
    response_model=DocumentDownloadResponse,
    summary="Döküman için indirme linki oluştur",
)
async def download_document(
    doc_id: uuid.UUID,
    db:     AsyncSession = Depends(get_db),
    current_user: User   = Depends(get_current_user),  # P0: login zorunlu
    _module_user: User   = Depends(require_module("documents")),
) -> DocumentDownloadResponse:
    current_user.tenant_id = _module_user.tenant_id
    # ── Tenant doğrulaması (P0 security fix) ──────────────────────────────────
    doc = await verify_document_tenant(db, doc_id, current_user)

    url = await storage.generate_presigned_url(doc.file_key)
    return DocumentDownloadResponse(url=url, expires_in=3600)


@router.post(
    "/{doc_id}/version",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Döküman yeni versiyonu yükle",
)
async def upload_document_version(
    doc_id:        uuid.UUID = Path(...),
    revision_note: str | None = Form(None),
    file:          UploadFile = File(...),
    db:            AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
    _module_user: User         = Depends(require_module("documents")),
) -> Document:
    current_user.tenant_id = _module_user.tenant_id
    # ── 0 · Tenant doğrulaması (P0 security fix) ───────────────────────────────
    old_doc = await verify_document_tenant(db, doc_id, current_user)

    # ── 2 · Dosyayı yükle ───────────────────────────────────────────────────────
    content = await file.read()

    # Dosya doğrulaması: 20MB limit, izinli doküman formatları
    allowed_doc_exts = ["pdf", "docx", "xlsx", "zip", "rar", "png", "jpg", "jpeg", "webp"]
    validate_uploaded_file(file, content, 20 * 1024 * 1024, allowed_doc_exts)

    safe_name = sanitize_filename(file.filename or "document")
    new_version_id = uuid.uuid4()
    new_file_key = (
        f"tenants/{current_user.tenant_id}/projects/{old_doc.project_id}"
        f"/{old_doc.doc_type}/{new_version_id}_{safe_name}"
    )
    
    try:
        uploaded_key = await storage.upload_file(
            file_content=content,
            file_key=new_file_key,
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulut depolama hatası: {e}")

    # ── 3 · Versiyonlama mantığı ────────────────────────────────────────────────
    # If old_doc was already a version, use its parent_id; otherwise it's the parent.
    parent_id = old_doc.parent_id if old_doc.parent_id else old_doc.id
    
    new_doc = Document(
        project_id    = old_doc.project_id,
        doc_type      = old_doc.doc_type,
        original_name = file.filename,
        file_key      = uploaded_key,
        bucket_name   = storage.bucket_name,
        file_size_bytes = len(content),
        mime_type     = file.content_type,
        revision_note = revision_note,
        version       = old_doc.version + 1,
        parent_id     = parent_id,
        uploaded_by   = current_user.id,
    )
    db.add(new_doc)
    
    try:
        await db.commit()
        await db.refresh(new_doc)
    except Exception as e:
        await storage.delete_file(uploaded_key)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Versiyon kaydı başarısız: {e}")

    await EntitlementService.record_usage(db, current_user.tenant_id, "documents", 1, source="documents.version", event_ref=str(new_doc.id))
    await EntitlementService.record_usage(db, current_user.tenant_id, "storage_bytes", len(content), source="documents.version", event_ref=str(new_doc.id))
    await db.commit()
    await populate_uploader_details(new_doc, db)
    return new_doc


@router.patch(
    "/{doc_id}",
    response_model=DocumentRead,
    summary="Döküman bilgilerini güncelle",
)
async def update_document(
    doc_id: uuid.UUID,
    body:   DocumentUpdate,
    db:     AsyncSession = Depends(get_db),
    current_user: User   = Depends(get_current_user),  # P0: login zorunlu
) -> Document:
    # ── Tenant doğrulaması (P0 security fix) ──────────────────────────────────
    doc = await verify_document_tenant(db, doc_id, current_user)
    
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(doc, key, value)
    
    try:
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Güncelleme başarısız: {e}")
    
    return doc


@router.delete(
    "/{doc_id}",
    summary="Dökümanı sil (arşive al)",
)
async def delete_document(
    doc_id: uuid.UUID,
    db:     AsyncSession = Depends(get_db),
    current_user: User   = Depends(get_current_user),  # P0: login zorunlu
) -> Document:
    # ── Tenant doğrulaması (P0 security fix) ──────────────────────────────────
    doc = await verify_document_tenant(db, doc_id, current_user)
    
    doc.archived = True
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get(
    "/{doc_id}/versions",
    response_model=list[DocumentRead],
    summary="Dökümanın tüm versiyon geçmişini listele",
)
async def list_document_versions(
    doc_id: uuid.UUID,
    db:     AsyncSession = Depends(get_db),
    current_user: User   = Depends(get_current_user),
) -> list[Document]:
    # ── Tenant doğrulaması (P0 security fix) ──────────────────────────────────
    doc = await verify_document_tenant(db, doc_id, current_user)
    
    root_id = doc.parent_id if doc.parent_id else doc.id
    
    query = select(Document).where(
        (Document.parent_id == root_id) | (Document.id == root_id)
    ).order_by(Document.version.desc())
    
    result = await db.execute(query)
    versions = list(result.scalars())
    await populate_uploader_details(versions, db)
    return versions


@router.get(
    "",
    response_model=list[DocumentRead],
    summary="Kiracıya ait tüm aktif dökümanları listele",
)
async def list_all_tenant_documents(
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
    _module_user: User         = Depends(require_module("documents")),
) -> list[Document]:
    current_user.tenant_id = _module_user.tenant_id
    query = select(Document).join(Project).where(
        Project.tenant_id == current_user.tenant_id,
        Document.archived == False
    ).order_by(Document.created_at.desc())
    
    result = await db.execute(query)
    docs = list(result.scalars())
    await populate_uploader_details(docs, db)
    return docs

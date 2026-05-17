# ─────────────────────────────────────────────────────────────────────────────
#  V1 — Documents Routes
#  File Management / OCI Storage / Versioning
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.storage import storage
from app.core.exceptions import NotFoundError, ConflictError
from app.db.models import Document
from app.db.schemas import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentDownloadResponse,
)

router = APIRouter()


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
    file:          UploadFile = File(...),
    db:           AsyncSession = Depends(get_db),
) -> Document:
    # ── 1 · Dosyayı oku ve S3/OCI'ya yükle ───────────────────────────────────────
    content = await file.read()
    # Key format: projects/{project_id}/{doc_type}/{timestamp}_{filename}
    file_key = f"projects/{project_id}/{doc_type}/{int(time.time())}_{file.filename}"
    
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
        project_id    = project_id,
        doc_type      = doc_type,
        original_name = file.filename,
        file_key      = uploaded_key,
        bucket_name   = storage.bucket_name,
        file_size_bytes = len(content),
        mime_type     = file.content_type,
        revision_note = revision_note,
        version       = 1,
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

    return doc


@router.get(
    "/project/{project_id}",
    response_model=list[DocumentRead],
    summary="Projeye ait dökümanları listele",
)
async def list_project_documents(
    project_id: uuid.UUID,
    db:         AsyncSession = Depends(get_db),
) -> list[Document]:
    # Only return the latest version of each document group (parent_id is None or current)
    # A simpler way: just list all and let frontend handle or list only archived=False
    query = select(Document).where(
        Document.project_id == project_id,
        Document.archived == False
    ).order_by(Document.created_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars())


@router.get(
    "/{doc_id}/download",
    response_model=DocumentDownloadResponse,
    summary="Döküman için indirme linki oluştur",
)
async def download_document(
    doc_id: uuid.UUID,
    db:     AsyncSession = Depends(get_db),
) -> DocumentDownloadResponse:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise NotFoundError(detail="Döküman bulunamadı.")
    
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
) -> Document:
    # ── 1 · Eski dökümanı bul ───────────────────────────────────────────────────
    old_doc = await db.get(Document, doc_id)
    if not old_doc:
        raise NotFoundError(detail="Kaynak döküman bulunamadı.")
    
    # ── 2 · Dosyayı yükle ───────────────────────────────────────────────────────
    content = await file.read()
    new_file_key = f"projects/{old_doc.project_id}/{old_doc.doc_type}/{int(time.time())}_{file.filename}"
    
    try:
        uploaded_key = await storage.upload_file(
            file_content=content,
            file_key=new_file_key,
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulut depolama hatası: {e}")

    # ── 3 · Versiyonlama mantığı ────────────────────────────────────────────────
    # Eskisini arşive al
    old_doc.archived = True
    
    # Yeni versiyon kaydı
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
    )
    db.add(new_doc)
    
    try:
        await db.commit()
        await db.refresh(new_doc)
    except Exception as e:
        await storage.delete_file(uploaded_key)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Versiyon kaydı başarısız: {e}")

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
) -> Document:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise NotFoundError(detail="Döküman bulunamadı.")
    
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
) -> Document:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise NotFoundError(detail="Döküman bulunamadı.")
    
    doc.archived = True
    await db.commit()
    await db.refresh(doc)
    return doc

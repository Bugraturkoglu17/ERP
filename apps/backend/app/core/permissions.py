# ─────────────────────────────────────────────────────────────────────────────
#  GOLABS ERP — Merkezi Yetki & Tenant İzolasyon Yardımcıları
#  Shared DB / Shared Schema mimarisinde tenant cross-access'i engeller.
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document, Project, User


# ═══════════════════════════════════════════════════════════════════════════════
# Platform Admin Kontrolü
# ═══════════════════════════════════════════════════════════════════════════════

def is_platform_admin(user: User) -> bool:
    """
    Kullanıcının platform genelinde yönetici olup olmadığını kontrol eder.
    Platform adminler tenant kısıtlamalarını aşabilir.
    """
    return "platform_admin" in (user.default_role or "")


# ═══════════════════════════════════════════════════════════════════════════════
# Proje Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_project_tenant(
    db: AsyncSession,
    project_id: uuid.UUID,
    user: User,
) -> Project:
    """
    Verilen `project_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.

    - Platform admin ise bypass eder (None tenant'a sahip admin de dahil).
    - Proje bulunamazsa: 404
    - Tenant uyuşmazlığı varsa: 403

    Returns:
        Project — doğrulanan proje nesnesi (endpoint'lerde yeniden kullanılabilir)
    """
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")

    if is_platform_admin(user):
        return project

    if user.tenant_id is None:
        raise HTTPException(
            status_code=403,
            detail="Tenant bağlamı bulunamadı. Lütfen yöneticinizle iletişime geçin.",
        )

    if str(project.tenant_id) != str(user.tenant_id):
        raise HTTPException(
            status_code=403,
            detail="Bu proje üzerinde işlem yapma yetkiniz yok.",
        )

    return project


# ═══════════════════════════════════════════════════════════════════════════════
# Doküman Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_document_tenant(
    db: AsyncSession,
    doc_id: uuid.UUID,
    user: User,
) -> Document:
    """
    Verilen `doc_id`'nin bağlı olduğu projenin `user.tenant_id`'ye ait olduğunu doğrular.
    Document -> Project -> tenant_id zinciri üzerinden kontrol yapılır.

    - Platform admin ise bypass eder.
    - Doküman bulunamazsa: 404
    - Tenant uyuşmazlığı varsa: 403

    Returns:
        Document — doğrulanan doküman nesnesi (endpoint'lerde yeniden kullanılabilir)
    """
    result = await db.execute(
        select(Document).where(Document.id == doc_id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Döküman bulunamadı.")

    # Proje üzerinden tenant doğrulaması — platform admin bypass dahil
    await verify_project_tenant(db, doc.project_id, user)

    return doc

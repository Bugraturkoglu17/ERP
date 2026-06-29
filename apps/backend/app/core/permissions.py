# ─────────────────────────────────────────────────────────────────────────────
#  GOLABS ERP — Merkezi Yetki & Tenant İzolasyon Yardımcıları
#  Shared DB / Shared Schema mimarisinde tenant cross-access'i engeller.
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Document,
    Project,
    User,
    StoreApprovalRequest,
    StoreServiceForm,
    StoreInvoiceRecord,
    StoreProgressPayment,
    StoreProcess,
    WorkOrder,
)


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


# ═══════════════════════════════════════════════════════════════════════════════
# Onay Talebi Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_approval_tenant(
    db: AsyncSession,
    approval_id: uuid.UUID,
    user: User,
) -> StoreApprovalRequest:
    """
    Verilen `approval_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.
    """
    result = await db.execute(
        select(StoreApprovalRequest).where(StoreApprovalRequest.id == approval_id)
    )
    approval = result.scalar_one_or_none()

    if not approval:
        raise HTTPException(status_code=404, detail="Onay talebi bulunamadı.")

    if is_platform_admin(user):
        return approval

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

    if str(approval.tenant_id) != str(user.tenant_id):
        raise HTTPException(status_code=403, detail="Bu onay talebi üzerinde işlem yapma yetkiniz yok.")

    return approval


# ═══════════════════════════════════════════════════════════════════════════════
# Servis Formu Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_service_form_tenant(
    db: AsyncSession,
    form_id: uuid.UUID,
    user: User,
) -> StoreServiceForm:
    """
    Verilen `form_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.
    """
    result = await db.execute(
        select(StoreServiceForm).where(StoreServiceForm.id == form_id)
    )
    form = result.scalar_one_or_none()

    if not form:
        raise HTTPException(status_code=404, detail="Servis formu bulunamadı.")

    if is_platform_admin(user):
        return form

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

    if str(form.tenant_id) != str(user.tenant_id):
        raise HTTPException(status_code=403, detail="Bu servis formu üzerinde işlem yapma yetkiniz yok.")

    return form


# ═══════════════════════════════════════════════════════════════════════════════
# Fatura Kaydı Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_invoice_tenant(
    db: AsyncSession,
    invoice_id: uuid.UUID,
    user: User,
) -> StoreInvoiceRecord:
    """
    Verilen `invoice_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.
    """
    result = await db.execute(
        select(StoreInvoiceRecord).where(StoreInvoiceRecord.id == invoice_id)
    )
    inv = result.scalar_one_or_none()

    if not inv:
        raise HTTPException(status_code=404, detail="Fatura kaydı bulunamadı.")

    if is_platform_admin(user):
        return inv

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

    if str(inv.tenant_id) != str(user.tenant_id):
        raise HTTPException(status_code=403, detail="Bu fatura kaydı üzerinde işlem yapma yetkiniz yok.")

    return inv


# ═══════════════════════════════════════════════════════════════════════════════
# Hakkediş Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_payment_tenant(
    db: AsyncSession,
    payment_id: uuid.UUID,
    user: User,
) -> StoreProgressPayment:
    """
    Verilen `payment_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.
    """
    result = await db.execute(
        select(StoreProgressPayment).where(StoreProgressPayment.id == payment_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Hakkediş bulunamadı.")

    if is_platform_admin(user):
        return payment

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

    if str(payment.tenant_id) != str(user.tenant_id):
        raise HTTPException(status_code=403, detail="Bu hakkediş üzerinde işlem yapma yetkiniz yok.")

    return payment


# ═══════════════════════════════════════════════════════════════════════════════
# İş Süreci Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_process_tenant(
    db: AsyncSession,
    process_id: uuid.UUID,
    user: User,
) -> StoreProcess:
    """
    Verilen `process_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.
    """
    result = await db.execute(
        select(StoreProcess).where(StoreProcess.id == process_id)
    )
    proc = result.scalar_one_or_none()

    if not proc:
        raise HTTPException(status_code=404, detail="Süreç bulunamadı.")

    if is_platform_admin(user):
        return proc

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

    if str(proc.tenant_id) != str(user.tenant_id):
        raise HTTPException(status_code=403, detail="Bu süreç üzerinde işlem yapma yetkiniz yok.")

    return proc


# ═══════════════════════════════════════════════════════════════════════════════
# İş Emri Tenant Doğrulaması
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_work_order_tenant(
    db: AsyncSession,
    work_order_id: uuid.UUID,
    user: User,
) -> WorkOrder:
    """
    Verilen `work_order_id`'nin `user.tenant_id`'ye ait olduğunu doğrular.
    """
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    wo = result.scalar_one_or_none()

    if not wo or wo.is_deleted:
        raise HTTPException(status_code=404, detail="İş emri bulunamadı.")

    if is_platform_admin(user):
        return wo

    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

    if str(wo.tenant_id) != str(user.tenant_id):
        raise HTTPException(status_code=403, detail="Bu iş emri üzerinde işlem yapma yetkiniz yok.")

    return wo


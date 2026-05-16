# ─────────────────────────────────────────────────────────────────────────────
#  V1 — Finance Routes  (Invoice / Expense / Payment / Profitability)
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.db.crud import CRUDBase
from app.db.models import Customer, Expense, ExpenseCategory, Invoice, Project
from app.db.schemas import InvoiceRead

router = APIRouter()

crud_invoice = CRUDBase(Invoice)
crud_expense = CRUDBase(Expense)


# ── Finance Dashboard — Karlılık Özeti ────────────────────────────────────────

@router.get("/dashboard/profitability/{project_id}")
async def get_project_profitability(
    project_id: UUID,
    db:         AsyncSession = Depends(get_db),
) -> dict:
    """
    Tek bir proje için maliyet / gelir / net kâr döner.
    Maliyet → Expenses + gelen malzeme maliyetleri
    Gelir   → Kesilen faturaların toplamı
    """
    # ── Gelir ──────────────────────────────────────────────────────────────
    revenue_row = (
        await db.execute(
            select(func.coalesce(func.sum(Invoice.grand_total), 0))
            .where(Invoice.project_id == project_id)
            .where(Invoice.status.in_(["paid", "approved", "sent"]))
        )
    ).scalar()

    # ── Maliyet ─────────────────────────────────────────────────────────────
    cost_row = (
        await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(Expense.project_id == project_id)
        )
    ).scalar()

    revenue = float(revenue_row)
    cost    = float(cost_row)
    net     = revenue - cost
    margin  = (net / revenue * 100) if revenue else 0.0

    return {
        "project_id":    str(project_id),
        "revenue":       round(revenue, 2),
        "cost":          round(cost,    2),
        "net_profit":    round(net,     2),
        "margin_pct":    round(margin,  2),
        "currency":      "TRY",
    }


# ── İcmal Takvimi ────────────────────────────────────────────────────────────

@router.get("/invoices/calendar")
async def get_invoice_calendar(
    from_date:   datetime | None = None,
    to_date:     datetime | None = None,
    status:      str | None      = None,
    customer_id: UUID | None     = None,
    skip:        int             = 0,
    limit:       int             = 100,
    db:          AsyncSession    = Depends(get_db),
) -> dict:
    query = select(Invoice)

    if from_date:
        query = query.where(Invoice.issue_date >= from_date)
    if to_date:
        query = query.where(Invoice.issue_date <= to_date)
    if status:
        query = query.where(Invoice.status == status)
    if customer_id:
        query = query.where(Invoice.customer_id == customer_id)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    result = await db.execute(query.offset(skip).limit(limit))
    invoices = list(result.scalars())

    return {"total": total, "skip": skip, "limit": limit, "items": invoices}


# ── Belge / Fatura CRUD ────────────────────────────────────────────────────────

@router.get("/invoices", response_model=list[InvoiceRead])
async def list_invoices(
    db:   AsyncSession = Depends(get_db),
    skip: int          = 0,
    limit: int         = 100,
):
    return (await crud_invoice.get_multi(db, skip=skip, limit=limit))


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    inv = await crud_invoice.get(db, invoice_id)
    if not inv:
        raise NotFoundError(detail="Fatura bulunamadı.")
    return inv

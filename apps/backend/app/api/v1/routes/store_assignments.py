"""
Store Assignments — Bakım & Tadilat kapsam yönetimi
Mağazaları bakım veya tadilat kapsamına alma/çıkarma.
scope_codes JSON alanına "bakim" / "tadilat" eklenir veya kaldırılır.
"""

from __future__ import annotations

import ast
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database     import get_db
from app.core.dependencies import get_current_user, is_platform_admin
from app.db.models         import Project, User

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_scope_codes(raw: object) -> list[str]:
    if isinstance(raw, list):
        return [str(x) for x in raw]
    if isinstance(raw, str):
        try:
            parsed = ast.literal_eval(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except (ValueError, SyntaxError):
            return []
    return []


def _project_to_dict(p: Project) -> dict:
    return {
        "id":          str(p.id),
        "name":        p.name,
        "project_no":  p.project_no,
        "status":      p.status.value if hasattr(p.status, "value") else str(p.status),
        "scope_codes": _parse_scope_codes(getattr(p, "scope_codes", [])),
        "description": p.description,
        "created_at":  p.created_at.isoformat() if p.created_at else None,
    }


async def _query_projects(user: User, db: AsyncSession) -> list[Project]:
    if is_platform_admin(user):
        result = await db.execute(select(Project))
    else:
        from app.db.models import Customer
        sub = select(Customer.id).where(Customer.tenant_id == user.tenant_id)
        result = await db.execute(select(Project).where(Project.customer_id.in_(sub)))
    return list(result.scalars())


class AssignBody(BaseModel):
    store_ids: list[str]


# ═══════════════════════════════════════════════════════════════════════════════
# Bakım (Maintenance) endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/maintenance/stores")
async def get_maintenance_stores(
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Bakım kapsamındaki mağazaları döndür (scope_codes includes 'bakim')."""
    projects = await _query_projects(user, db)
    return [_project_to_dict(p) for p in projects if "bakim" in _parse_scope_codes(p.scope_codes)]


@router.post("/maintenance/stores/assign")
async def assign_maintenance_stores(
    body: AssignBody,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Mağazaları bakım kapsamına ekle."""
    assigned: list[str] = []
    for store_id in body.store_ids:
        result  = await db.execute(select(Project).where(Project.id == store_id))
        project = result.scalar_one_or_none()
        if not project:
            continue
        codes = _parse_scope_codes(project.scope_codes)
        if "bakim" not in codes:
            codes.append("bakim")
            project.scope_codes = json.dumps(codes, ensure_ascii=False)
            assigned.append(str(project.id))
    await db.commit()
    return {"assigned": assigned, "count": len(assigned)}


@router.patch("/maintenance/stores/{store_id}/remove")
async def remove_maintenance_store(
    store_id: str,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Mağazayı bakım kapsamından çıkar."""
    result  = await db.execute(select(Project).where(Project.id == store_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Mağaza bulunamadı.")
    codes = [c for c in _parse_scope_codes(project.scope_codes) if c != "bakim"]
    project.scope_codes = json.dumps(codes, ensure_ascii=False)
    await db.commit()
    return {"removed": str(project.id), "scope_codes": codes}


# ═══════════════════════════════════════════════════════════════════════════════
# Tadilat (Renovation) endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/renovation/stores")
async def get_renovation_stores(
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Tadilat kapsamındaki mağazaları döndür (scope_codes includes 'tadilat')."""
    projects = await _query_projects(user, db)
    return [_project_to_dict(p) for p in projects if "tadilat" in _parse_scope_codes(p.scope_codes)]


@router.post("/renovation/stores/assign")
async def assign_renovation_stores(
    body: AssignBody,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Mağazaları tadilat kapsamına ekle."""
    assigned: list[str] = []
    for store_id in body.store_ids:
        result  = await db.execute(select(Project).where(Project.id == store_id))
        project = result.scalar_one_or_none()
        if not project:
            continue
        codes = _parse_scope_codes(project.scope_codes)
        if "tadilat" not in codes:
            codes.append("tadilat")
            project.scope_codes = json.dumps(codes, ensure_ascii=False)
            assigned.append(str(project.id))
    await db.commit()
    return {"assigned": assigned, "count": len(assigned)}


@router.patch("/renovation/stores/{store_id}/remove")
async def remove_renovation_store(
    store_id: str,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Mağazayı tadilat kapsamından çıkar."""
    result  = await db.execute(select(Project).where(Project.id == store_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Mağaza bulunamadı.")
    codes = [c for c in _parse_scope_codes(project.scope_codes) if c != "tadilat"]
    project.scope_codes = json.dumps(codes, ensure_ascii=False)
    await db.commit()
    return {"removed": str(project.id), "scope_codes": codes}

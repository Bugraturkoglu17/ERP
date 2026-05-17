"""
V1 — Projects & Assignments
Hiyerarşi: Customer → Region → Branch → Project
Roller:
  admin         → tüm CRUD + proje oluştur
  saha_muhendisi → sadece atandığı projeleri görür
  musteri_kullanici → sadece atandığı proje görünümü
"""

from __future__ import annotations

import ast
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database         import get_db
from app.core.dependencies     import get_current_user, require_role
from app.core.exceptions       import NotFoundError
from app.db.crud               import CRUDBase
from app.db.models import (
    Branch,
    Customer,
    Project,
    ProjectAssignment,
    ProjectStatus,
    Region,
    User,
)
from app.db.schemas import (
    BranchCreate,
    BranchRead,
    BranchUpdate,
    CustomerRead,
    CustomerCreate,
    ProjectAssignmentCreate,
    ProjectAssignmentRead,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    RegionCreate,
    RegionRead,
    RegionUpdate,
)

router = APIRouter()

crud_customer   = CRUDBase(Customer)
crud_region     = CRUDBase(Region)
crud_branch     = CRUDBase(Branch)
crud_project    = CRUDBase(Project)
crud_assignment = CRUDBase(ProjectAssignment)


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


def _to_project_read(project: Project) -> ProjectRead:
    contract_value = getattr(project, "contract_value", None)
    if isinstance(contract_value, Decimal):
        contract_value = float(contract_value)

    status_value = project.status.value if hasattr(project.status, "value") else str(project.status)

    return ProjectRead(
        id=project.id,
        customer_id=project.customer_id,
        region_id=project.region_id,
        branch_id=project.branch_id,
        name=project.name,
        project_no=project.project_no,
        description=project.description,
        start_date=project.start_date,
        due_date=project.due_date,
        scope_codes=_parse_scope_codes(getattr(project, "scope_codes", [])),
        contract_value=contract_value,
        status=status_value,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Hiyerarşi — Lookup (Client-side cascade select için)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/customers", response_model=list[CustomerRead], tags=["hierarchy"])
async def list_customers(db: AsyncSession = Depends(get_db)):
    """Tüm müşterileri listele — proje oluşturma ekranı cascade dropdown'ı içindir."""
    return await crud_customer.get_multi(db)


@router.post("/customers", response_model=CustomerRead, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def create_customer(customer_in: CustomerCreate, db: AsyncSession = Depends(get_db)):
    return await crud_customer.create(db, customer_in)


@router.patch("/customers/{customer_id}", response_model=CustomerRead, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def update_customer(customer_id: str, customer_in: CustomerCreate, db: AsyncSession = Depends(get_db)):
    customer = await crud_customer.get(db, customer_id)
    if not customer:
        raise NotFoundError(detail="Müşteri bulunamadı.")
    return await crud_customer.update(db, db_obj=customer, obj_in=customer_in)


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None, response_class=Response, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def delete_customer(customer_id: str, db: AsyncSession = Depends(get_db)) -> None:
    customer = await crud_customer.get(db, customer_id)
    if not customer:
        raise NotFoundError(detail="Müşteri bulunamadı.")
    await crud_customer.delete(db, customer)


@router.get("/regions/{customer_id}", response_model=list[RegionRead], tags=["hierarchy"])
async def list_regions_by_customer(
    customer_id: str,
    db:          AsyncSession = Depends(get_db),
):
    """Bir müşterinin bölgelerini getirir."""
    result = await db.execute(select(Region).where(Region.customer_id == customer_id))
    return list(result.scalars())


@router.post("/regions", response_model=RegionRead, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def create_region(region_in: RegionCreate, db: AsyncSession = Depends(get_db)):
    customer = await crud_customer.get(db, region_in.customer_id)
    if not customer:
        raise NotFoundError(detail="Müşteri bulunamadı.")
    return await crud_region.create(db, region_in)


@router.patch("/regions/{region_id}", response_model=RegionRead, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def update_region(region_id: str, region_in: RegionUpdate, db: AsyncSession = Depends(get_db)):
    region = await crud_region.get(db, region_id)
    if not region:
        raise NotFoundError(detail="Bölge bulunamadı.")
    return await crud_region.update(db, db_obj=region, obj_in=region_in)


@router.delete("/regions/{region_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None, response_class=Response, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def delete_region(region_id: str, db: AsyncSession = Depends(get_db)) -> None:
    region = await crud_region.get(db, region_id)
    if not region:
        raise NotFoundError(detail="Bölge bulunamadı.")
    await crud_region.delete(db, region)


@router.get("/branches/{region_id}", response_model=list[BranchRead], tags=["hierarchy"])
async def list_branches_by_region(
    region_id: str,
    db:        AsyncSession = Depends(get_db),
):
    """Bir bölgenin şubelerini getirir."""
    result = await db.execute(select(Branch).where(Branch.region_id == region_id))
    return list(result.scalars())


@router.post("/branches", response_model=BranchRead, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def create_branch(branch_in: BranchCreate, db: AsyncSession = Depends(get_db)):
    region = await crud_region.get(db, branch_in.region_id)
    if not region:
        raise NotFoundError(detail="Bölge bulunamadı.")
    return await crud_branch.create(db, branch_in)


@router.patch("/branches/{branch_id}", response_model=BranchRead, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def update_branch(branch_id: str, branch_in: BranchUpdate, db: AsyncSession = Depends(get_db)):
    branch = await crud_branch.get(db, branch_id)
    if not branch:
        raise NotFoundError(detail="Şube bulunamadı.")
    return await crud_branch.update(db, db_obj=branch, obj_in=branch_in)


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None, response_class=Response, dependencies=[Depends(require_role("admin"))], tags=["hierarchy"])
async def delete_branch(branch_id: str, db: AsyncSession = Depends(get_db)) -> None:
    branch = await crud_branch.get(db, branch_id)
    if not branch:
        raise NotFoundError(detail="Şube bulunamadı.")
    await crud_branch.delete(db, branch)


# ═══════════════════════════════════════════════════════════════════════════════
# Proje CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "",
    response_model=list[ProjectRead],
    summary="Proje listesi — Yönetici tümünü, Saha Mühendisi kendine atananları görür.",
)
async def list_projects(
    skip:         int                  = 0,
    limit:        int                  = 100,
    status:       ProjectStatus | None = None,
    branch_id:    str | None           = None,
    customer_id:  str | None           = None,
    user:         User                 = Depends(get_current_user),
    db:           AsyncSession         = Depends(get_db),
) -> list[ProjectRead]:
    """
    Yönetici (admin) tüm projeleri listeler.
    Diğer roller yalnızca kendisine ProjectAssignment ile atanmış projeleri görür.
    Query parametreleri ile filtreleme desteği vardır.
    """
    if "admin" not in (user.default_role or ""):
        # Saha mühendisi / müşteri kullanıcısı → sadece atanmış projeler
        assignment_subq = (
            select(ProjectAssignment.project_id)
            .where(ProjectAssignment.user_id == user.id)
            .subquery()
        )
        query = select(Project).where(Project.id.in_(assignment_subq))
    else:
        query = select(Project)

    if status:
        query = query.where(Project.status == status)
    if branch_id:
        query = query.where(Project.branch_id == branch_id)
    if customer_id:
        query = query.where(Project.customer_id == customer_id)

    query = query.offset(skip).limit(limit).order_by(Project.created_at.desc())
    result = await db.execute(query)
    return [_to_project_read(project) for project in list(result.scalars())]


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni proje oluştur — sadece Yönetici.",
    dependencies=[Depends(require_role("admin"))],
)
async def create_project(
    project_in: ProjectCreate,
    db:         AsyncSession = Depends(get_db),
) -> ProjectRead:
    """
    Yeni şantiye projesi oluşturur.
    Hiyerarşi doğrulaması yapılır: branch_id → region_id → customer_id zinciri var mı kontrol edilir.
    """
    # Şube var mı?
    branch = await crud_branch.get(db, project_in.branch_id)
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Şube bulunamadı.")

    # Bölge şubeye ait mi?
    region = await crud_region.get(db, branch.region_id)
    if not region or region.customer_id != project_in.customer_id:
        raise HTTPException(status_code=400, detail="Bölge / müşteri uyumsuzluğu.")

    created = await crud_project.create(db, project_in)
    return _to_project_read(created)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    user:       User         = Depends(get_current_user),
    db:         AsyncSession = Depends(get_db),
) -> ProjectRead:
    """
    Tek proje detayını getirir.
    Yönetici her projeyi görür, diğer roller yalnızca atandığı projeleri görür.
    """
    project = await crud_project.get(db, project_id)
    if not project:
        raise NotFoundError(detail="Proje bulunamadı.")

    if "admin" not in (user.default_role or ""):
        assignment = await db.execute(
            select(ProjectAssignment)
            .where(
                ProjectAssignment.project_id == project.id,
                ProjectAssignment.user_id   == user.id,
            )
        )
        if not assignment.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok.")

    return _to_project_read(project)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    user:       User         = Depends(require_role("admin")),
    db:         AsyncSession = Depends(get_db),
) -> ProjectRead:
    """Proje bilgilerini günceller — sadece Yönetici."""
    project = await crud_project.get(db, project_id)
    if not project:
        raise NotFoundError(detail="Proje bulunamadı.")
    updated = await crud_project.update(db, db_obj=project, obj_in=project_in)
    return _to_project_read(updated)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    response_class=Response,
)
async def delete_project(
    project_id: str,
    user:       User         = Depends(require_role("admin")),
    db:         AsyncSession = Depends(get_db),
) -> None:
    """Projeyi siler — sadece Yönetici."""
    project = await crud_project.get(db, project_id)
    if not project:
        raise NotFoundError(detail="Proje bulunamadı.")
    await crud_project.delete(db, project)


# ═══════════════════════════════════════════════════════════════════════════════
# Proje Atamaları (Ekip / Taşeron)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/{project_id}/assignments",
    response_model=ProjectAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Kullanıcıyı projeye atar — sadece Yönetici.",
    dependencies=[Depends(require_role("admin"))],
)
async def assign_user_to_project(
    project_id: str,
    assignment: ProjectAssignmentCreate,
    db:         AsyncSession = Depends(get_db),
) -> ProjectAssignment:
    """Bir kullanıcıyı (saha mühendisi / taşeron) projeye atar."""
    project = await crud_project.get(db, project_id)
    if not project:
        raise NotFoundError(detail="Proje bulunamadı.")
    user = await db.get(User, assignment.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return await crud_assignment.create(db, assignment, project_id=project_id)


@router.get(
    "/{project_id}/assignments",
    response_model=list[ProjectAssignmentRead],
    summary="Projedeki tüm atamaları listele.",
)
async def list_assignments(
    project_id: str,
    user:       User         = Depends(get_current_user),
    db:         AsyncSession = Depends(get_db),
) -> list[ProjectAssignment]:
    """
    Projeye atanmış tüm ekip/taşeron listesini döner.
    Yönetici her projenin atamalarını görür, diğer roller sadece kendi projelerini.
    """
    if "admin" not in (user.default_role or ""):
        # Kendi atanıp atanmadığını doğrula
        own_assignment = await db.execute(
            select(ProjectAssignment)
            .where(
                ProjectAssignment.project_id == project_id,
                ProjectAssignment.user_id   == user.id,
            )
        )
        if not own_assignment.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok.")

    result = await db.execute(
        select(ProjectAssignment).where(ProjectAssignment.project_id == project_id)
    )
    return list(result.scalars())

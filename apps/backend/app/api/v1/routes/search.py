from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security.validators import has_admin_role
from app.services.entitlement_service import EntitlementService
from app.db.models import User, Project, ProjectAssignment, WorkOrder, Material, Tenant

router = APIRouter()

@router.get("", response_model=Dict[str, List[Dict[str, Any]]])
async def global_search(
    q: str = Query(..., min_length=2, max_length=100, description="Arama metni"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kullanıcının tenant'ına ve yetkilerine göre sistemde global arama yapar.
    Project, WorkOrder, User, Material (Inventory) tablolarını sorgular.
    """
    tenant_id = current_user.tenant_id
    is_platform_admin = current_user.default_role == "platform_admin"
    is_admin = has_admin_role(current_user)

    results = []
    search_term = f"%{q}%"

    # Hangi modüllerin açık olduğunu kontrol et
    work_orders_enabled = False
    inventory_enabled = False
    
    if tenant_id:
        work_orders_enabled = await EntitlementService.is_module_enabled(db, tenant_id, "work_orders")
        inventory_enabled = await EntitlementService.is_module_enabled(db, tenant_id, "inventory")
    elif is_platform_admin:
        work_orders_enabled = True
        inventory_enabled = True

    # 1. Projeler / Mağazalar
    if tenant_id or is_platform_admin:
        proj_query = select(Project).where(
            or_(
                Project.name.ilike(search_term),
                Project.project_no.ilike(search_term)
            )
        )
        if tenant_id:
            proj_query = proj_query.where(Project.tenant_id == tenant_id)
            
            # Eğer admin değilse sadece atandığı projeler
            if not is_admin:
                assignment_subq = (
                    select(ProjectAssignment.project_id)
                    .where(ProjectAssignment.user_id == current_user.id)
                    .subquery()
                )
                proj_query = proj_query.where(Project.id.in_(assignment_subq))
            
        proj_query = proj_query.limit(10)
        proj_result = await db.execute(proj_query)
        projects = proj_result.scalars().all()
        
        # Kullanıcının atandığı proje ID'lerini kaydet ki iş emirlerinde de filtreleyebilelim
        allowed_project_ids = [p.id for p in projects]
        
        for p in projects:
            results.append({
                "id": str(p.id),
                "type": "project",
                "title": p.name,
                "subtitle": p.project_no or "Proje / Mağaza",
                "url": f"/projects/{p.id}",
                "module": "projects",
                "icon": "store",
                "matched_field": "name"
            })

    # 2. İş Emirleri
    if (tenant_id or is_platform_admin) and work_orders_enabled:
        wo_query = select(WorkOrder).where(
            WorkOrder.is_deleted == False,
            or_(
                WorkOrder.title.ilike(search_term),
                WorkOrder.description.ilike(search_term)
            )
        )
        if tenant_id:
            wo_query = wo_query.where(WorkOrder.tenant_id == tenant_id)
            if not is_admin:
                # Kullanıcı sadece kendi atandığı projelerin iş emirlerini görebilir
                assignment_subq = (
                    select(ProjectAssignment.project_id)
                    .where(ProjectAssignment.user_id == current_user.id)
                    .subquery()
                )
                wo_query = wo_query.where(WorkOrder.project_id.in_(assignment_subq))
            
        wo_query = wo_query.limit(10)
        wo_result = await db.execute(wo_query)
        work_orders = wo_result.scalars().all()
        for w in work_orders:
            results.append({
                "id": str(w.id),
                "type": "work_order",
                "title": w.title,
                "subtitle": f"İş Emri • {w.status}",
                "url": f"/work-orders/{w.id}",
                "module": "work_orders",
                "icon": "wrench",
                "matched_field": "title"
            })

    # 3. Kullanıcılar (Sadece Admin veya Platform Admin)
    if is_admin or is_platform_admin:
        u_query = select(User).where(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
        if tenant_id:
            u_query = u_query.where(User.tenant_id == tenant_id)
            
        u_query = u_query.limit(10)
        u_result = await db.execute(u_query)
        users = u_result.scalars().all()
        for u in users:
            results.append({
                "id": str(u.id),
                "type": "user",
                "title": u.full_name,
                "subtitle": u.email,
                "url": f"/settings/users",
                "module": "users",
                "icon": "user",
                "matched_field": "name"
            })

    # 4. Malzemeler (Inventory)
    if inventory_enabled:
        mat_query = select(Material).where(
            or_(
                Material.name.ilike(search_term),
                Material.sku.ilike(search_term)
            )
        ).limit(10)
        mat_result = await db.execute(mat_query)
        materials = mat_result.scalars().all()
        for m in materials:
            results.append({
                "id": str(m.id),
                "type": "inventory",
                "title": m.name,
                "subtitle": f"SKU: {m.sku}",
                "url": f"/inventory",
                "module": "inventory",
                "icon": "package",
                "matched_field": "name"
            })

    return {"results": results}

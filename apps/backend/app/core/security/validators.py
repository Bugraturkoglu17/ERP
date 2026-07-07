from uuid import UUID
from fastapi import HTTPException
from app.db.models import User
from app.core.permissions import is_platform_admin

def has_admin_role(user: User) -> bool:
    """Kullanıcının admin rolüne sahip olup olmadığını kontrol eder."""
    return "admin" in (user.default_role or "")

def tenant_mismatch(user: User, tenant_id: object) -> bool:
    """Kullanıcının tenant_id'si ile verilen tenant_id'nin uyuşmadığını kontrol eder. Platform admin ise her zaman False döner."""
    if is_platform_admin(user):
        return False
    if user.tenant_id is None or tenant_id is None:
        return True
    return str(user.tenant_id) != str(tenant_id)

def require_tenant_user(user: User) -> None:
    """Kullanıcının bir tenant bağlamı olmasını zorunlu kılar. Yoksa 403 fırlatır."""
    if is_platform_admin(user):
        return
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")

def same_tenant(user: User, tenant_id: object) -> bool:
    """Kullanıcının tenant_id'si ile verilen tenant_id'nin aynı olup olmadığını kontrol eder."""
    return str(user.tenant_id) == str(tenant_id)

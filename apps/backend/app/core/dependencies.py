# ─────────────────────────────────────────────────────────────────────────────
#  Golabs ERP — FastAPI Dependencies (DB, Auth, RBAC)
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db as database_get_db
from app.core.security import decode_token
from app.db.models import User, RolePermission
from app.core.permissions import is_platform_admin  # noqa: F401 — re-export; mevcut importları kırma

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,     # isteğe bağlı: optional auth endpoint'leri için
)


def entitlement_http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"type": code, "code": code, "message": message})


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Her istek için yeni bir async veritabanı oturumu sağlar."""
    async for session in database_get_db():
        yield session


# ═══════════════════════════════════════════════════════════════════════════════
# Kimlik Doğrulama (Authentication)
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_user_by_sub(db: AsyncSession, sub: str) -> User:
    """JWT subject alanından UUID'ye çevirip kullanıcıyı veritabanından getirir."""
    user_result = await db.execute(select(User).where(User.id == uuid.UUID(sub)))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya hesabı pasif durumda.",
        )
    return user


async def get_current_user(
    token:        str          = Depends(oauth2_scheme),
    db:           AsyncSession = Depends(get_db),
) -> User:
    """Token içindeki sub (UUID) ile kullanıcıyı getirir — gerekli endpoint'lerde kullanılır."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik doğrulama gerekli.",
        )
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token içeriği geçersiz.")

    return await _get_user_by_sub(db, sub)


async def get_current_tenant_id(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID | None:
    if not token:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")

    user = await _get_user_by_sub(db, payload["sub"])

    # Check if there is an active tenant context header
    x_tenant_context = request.headers.get("X-Tenant-Context") or request.headers.get("x-tenant-context")
    if x_tenant_context and is_platform_admin(user):
        from app.services.context_service import decode_context_token
        context_payload = decode_context_token(x_tenant_context)
        if context_payload.get("sub") != str(user.id):
            raise HTTPException(status_code=403, detail="Geçersiz bağlam aktörü.")
            
        context_id = context_payload.get("context_id")
        if not context_id:
            raise HTTPException(status_code=403, detail="Bağlam içinde oturum kimliği (context_id) bulunamadı.")
            
        # Stateful check: query database to verify the session status
        from app.db.models import PlatformContextSession
        from datetime import datetime, timezone
        session_id = uuid.UUID(context_id)
        session_stmt = select(PlatformContextSession).where(PlatformContextSession.id == session_id)
        session_res = await db.execute(session_stmt)
        session_obj = session_res.scalar_one_or_none()
        
        if not session_obj:
            raise HTTPException(status_code=403, detail="Aktif destek oturumu bulunamadı.")
        if session_obj.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Destek oturumu sonlandırılmış. Durum: {session_obj.status.upper()}"
            )
        if session_obj.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            session_obj.status = "expired"
            session_obj.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.add(session_obj)
            await db.commit()
            raise HTTPException(status_code=403, detail="Destek oturumu süresi dolmuş.")
            
        tenant_id = context_payload.get("tenant_id")
        if not tenant_id:
            raise HTTPException(status_code=403, detail="Bağlam içinde tenant_id bulunamadı.")
        return uuid.UUID(str(tenant_id))

    if is_platform_admin(user):
        return None

    tenant_id = payload.get("tenant_id") or (str(user.tenant_id) if user.tenant_id else None)
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant bağlamı bulunamadı.")
    return uuid.UUID(str(tenant_id))


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    """Aktif kullanıcıyı döner — pasif hesapları reddeder."""
    return user


async def get_current_user_optional(
    token:        str | None   = Depends(oauth2_scheme),
    db:           AsyncSession = Depends(get_db),
) -> User | None:
    """Token varsa kullanıcı döner, yoksa None — public endpoint'ler için kullanılır."""
    if not token:
        return None
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return None
    return await _get_user_by_sub(db, payload["sub"])


# ═══════════════════════════════════════════════════════════════════════════════
# Rol Bazlı Yetkilendirme (RBAC)
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_user_role_names(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """Kullanıcının tüm rol isimlerini tek sorguda getirir."""
    from app.db.models import Role, RolePermission, UserRole
    result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return [r for r in result.scalars()]


def require_role(*role_names: str):
    """
    Decorator-like dependency fabrikası.
    Kullanıcı verilen rollerden en az birine sahip olmalıdır, yoksa 403.

    Kullanımı:
        @router.post("")
        async def create_project(..., user=Depends(require_role("admin"))):
            ...
    """
    async def _checker(
        request: Request,
        token: str          = Depends(oauth2_scheme),
        db:    AsyncSession = Depends(get_db),
    ) -> User:
        if not token:
            raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
        try:
            payload = decode_token(token)
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Geçersiz token.")
        user = await _get_user_by_sub(db, payload["sub"])
        # Token içindeki rollerle kontrol et
        token_roles: list[str] = payload.get("roles", [])
        
        is_platform_only_route = role_names == ("platform_admin",)
        
        print(f"DEBUG ROLE_CHECK: role_names={role_names}, token_roles={token_roles}, is_platform_only_route={is_platform_only_route}")
        
        # Exempt notifications, meta, and auth from requiring a tenant context for platform_admin
        path = request.url.path
        is_exempt_from_context = (
            path.startswith("/api/v1/notifications") or
            path.startswith("/api/v1/meta") or
            path.startswith("/api/v1/auth")
        )
        
        if "platform_admin" in token_roles and not is_platform_only_route:
            x_tenant_context = request.headers.get("X-Tenant-Context") or request.headers.get("x-tenant-context")
            
            if not x_tenant_context and not is_exempt_from_context:
                raise entitlement_http_error(
                    status.HTTP_403_FORBIDDEN,
                    "ENTITLEMENT_CONTEXT_MISSING",
                    "Bu işlemi gerçekleştirmek için aktif bir firma bağlamı başlatmalısınız.",
                )
                
            if x_tenant_context:
                from app.services.context_service import decode_context_token
                try:
                    context_payload = decode_context_token(x_tenant_context)
                    tenant_id = context_payload.get("tenant_id")
                    if tenant_id:
                        user.tenant_id = uuid.UUID(str(tenant_id))
                except Exception:
                    raise entitlement_http_error(
                        status.HTTP_403_FORBIDDEN,
                        "CONTEXT_INVALID",
                        "Firma bağlamı süresi dolmuş veya geçersiz.",
                    )
            
            return user
        elif "platform_admin" in token_roles and is_platform_only_route:
            return user
        if not any(r in token_roles for r in role_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu işlem için yetkiniz yok.",
            )
        return user
    return _checker


async def require_permission(
    token:        str          = Depends(oauth2_scheme),
    db:           AsyncSession = Depends(get_db),
    permission:   str          = "projects:read",
) -> User:
    """
    JWT içindeki permissions listesi ile kontrol eder.
    403 döner, kullanıcı nesnesi başarılıysa döner.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")
    user = await _get_user_by_sub(db, payload["sub"])
    token_perms: list[str] = payload.get("permissions", [])
    if permission not in token_perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok.",
        )
    return user


def require_module(module_id: str):
    """Tenant entitlement dependency for future module gates."""
    async def _checker(
        request: Request,
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not token:
            raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
        try:
            payload = decode_token(token)
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Geçersiz token.")
        user = await _get_user_by_sub(db, payload["sub"])
        tenant_id = await get_current_tenant_id(request, token, db)
        if tenant_id is None:
            raise entitlement_http_error(
                status.HTTP_403_FORBIDDEN,
                "ENTITLEMENT_CONTEXT_MISSING",
                "Tenant bağlamı bulunamadı.",
            )
        from app.services.entitlement_service import EntitlementService
        if not await EntitlementService.is_module_enabled(db, tenant_id, module_id):
            raise entitlement_http_error(status.HTTP_403_FORBIDDEN, "MODULE_NOT_ENABLED", f"{module_id} modülü bu tenant için etkin değil.")
        user.tenant_id = tenant_id
        return user
    return _checker


def require_feature(feature_id: str):
    """Tenant entitlement dependency for future feature gates."""
    async def _checker(
        request: Request,
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not token:
            raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
        try:
            payload = decode_token(token)
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Geçersiz token.")
        user = await _get_user_by_sub(db, payload["sub"])
        tenant_id = await get_current_tenant_id(request, token, db)
        if tenant_id is None:
            raise entitlement_http_error(
                status.HTTP_403_FORBIDDEN,
                "ENTITLEMENT_CONTEXT_MISSING",
                "Tenant bağlamı bulunamadı.",
            )
        from app.services.entitlement_service import EntitlementService
        if not await EntitlementService.is_feature_enabled(db, tenant_id, feature_id):
            raise entitlement_http_error(status.HTTP_403_FORBIDDEN, "FEATURE_NOT_ENABLED", f"{feature_id} özelliği bu tenant için etkin değil.")
        user.tenant_id = tenant_id
        return user
    return _checker


def require_quota(quota_key: str, increment: int = 1):
    """Checks the current tenant quota without mutating usage counters."""
    async def _checker(
        request: Request,
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not token:
            raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
        try:
            payload = decode_token(token)
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Geçersiz token.")
        user = await _get_user_by_sub(db, payload["sub"])
        tenant_id = await get_current_tenant_id(request, token, db)
        if tenant_id is None:
            raise entitlement_http_error(
                status.HTTP_403_FORBIDDEN,
                "ENTITLEMENT_CONTEXT_MISSING",
                "Tenant bağlamı bulunamadı.",
            )
        from app.db.models import TenantUsageMeter
        from app.services.entitlement_service import EntitlementService, current_period_key
        entitlements = await EntitlementService.resolve_entitlements(db, tenant_id)
        limit = entitlements.get("quotas", {}).get(quota_key)
        if limit is None or int(limit) <= 0:
            return user
        stmt = select(TenantUsageMeter).where(
            TenantUsageMeter.tenant_id == tenant_id,
            TenantUsageMeter.meter_key == quota_key,
            TenantUsageMeter.period_key == current_period_key(EntitlementService.quota_period(quota_key)),
        )
        meter = (await db.execute(stmt)).scalar_one_or_none()
        current = meter.quantity if meter else 0
        if current + increment > int(limit):
            raise entitlement_http_error(status.HTTP_429_TOO_MANY_REQUESTS, "QUOTA_EXCEEDED", f"{quota_key} kotası aşıldı.")
        user.tenant_id = tenant_id
        return user
    return _checker

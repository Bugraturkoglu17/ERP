# ─────────────────────────────────────────────────────────────────────────────
#  V1 Auth Router — Login / Refresh / Me
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, is_platform_admin
from app.core.security import create_access_token, create_refresh_token, get_user_permissions, get_user_roles, hash_password, verify_password
from app.db.models import PlatformTenantSettings, Role, Tenant, TenantEmailMode, User, UserRole, UserSecurityPolicy
from app.db.schemas import CompletePasswordResetRequest, MessageResponse, TenantContextRead, TenantProfileUpdate, TenantSettingsUpsert, Token, TokenRefresh, UserRead

router = APIRouter()


def _parse_opt_out_templates(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        return []
    return []


@router.post("/login", response_model=Token, tags=["auth"])
async def login(
    db:          AsyncSession = Depends(get_db),
    form_data:   OAuth2PasswordRequestForm = Depends(),
) -> Token:
    """E-posta ile şifresiz login (Şifre kaldırıldı)."""
    result  = await db.execute(select(User).where(User.email == form_data.username))
    user    = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz e-posta.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hesabınız pasif durumda.")

    roles       = await get_user_roles(db, user.id)
    permissions = await get_user_permissions(db, user.id)

    access_token  = create_access_token(
        sub=str(user.id), roles=roles, permissions=permissions, tenant_id=str(user.tenant_id) if user.tenant_id else None
    )
    refresh_token = create_refresh_token(sub=str(user.id))

    return Token(
        access_token  = access_token,
        refresh_token = refresh_token,
        token_type    = "bearer",
    )


@router.post("/refresh", response_model=Token, tags=["auth"])
async def refresh_token(
    body:  TokenRefresh,
    db:    AsyncSession = Depends(get_db),
) -> Token:
    try:
        from app.core.security import decode_token
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")

    user_result = await db.execute(
        select(User).where(User.id == payload["sub"])
    )
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")

    roles       = await get_user_roles(db, user.id)
    permissions = await get_user_permissions(db, user.id)

    access_token  = create_access_token(
        sub=str(user.id),
        roles=roles,
        permissions=permissions,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
    )
    refresh_token = create_refresh_token(sub=str(user.id))

    return Token(
        access_token  = access_token,
        refresh_token = refresh_token,
        token_type    = "bearer",
    )


@router.post("/complete-password-reset", response_model=MessageResponse, tags=["auth"])
async def complete_password_reset(
    payload: CompletePasswordResetRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.temporary_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya geçici parola.")

    policy = await db.get(UserSecurityPolicy, user.id)
    if not policy or not policy.force_password_change:
        raise HTTPException(status_code=400, detail="Bu kullanıcı için parola yenileme gerekli değil.")

    user.hashed_password = hash_password(payload.new_password)
    policy.force_password_change = False
    db.add(user)
    db.add(policy)
    await db.commit()

    return MessageResponse(message="Parolanız güncellendi. Giriş yapabilirsiniz.")


@router.get("/me", response_model=UserRead, tags=["auth"])
async def get_me(
    user: User = Depends(get_current_user),
) -> UserRead:
    """Token'ındaki kullanıcı profilini döner."""
    return UserRead.model_validate(user)


@router.get("/tenant-context", response_model=TenantContextRead, tags=["auth"])
async def get_tenant_context(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantContextRead:
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Bu kullanıcı bir firmaya bağlı değil.")

    tenant = await db.get(Tenant, user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı.")

    settings = await db.get(PlatformTenantSettings, tenant.id)
    return TenantContextRead(
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        tenant_code=tenant.code,
        logo_url=tenant.logo_url,
        tax_no=settings.tax_no if settings else None,
        sector=settings.sector if settings else None,
        country=settings.country if settings else None,
        theme_color=settings.theme_color if settings else None,
        domain=settings.domain if settings else None,
        subdomain=settings.subdomain if settings else None,
        email_mode=settings.email_mode if settings else TenantEmailMode.PLATFORM,
        from_name=settings.from_name if settings else None,
        from_email=settings.from_email if settings else None,
        reply_to=settings.reply_to if settings else None,
        email_domain_verified=settings.email_domain_verified if settings else False,
        email_provider_identity_id=settings.email_provider_identity_id if settings else None,
        email_branding=json.loads(settings.email_branding) if settings and settings.email_branding else None,
        email_notifications_enabled=settings.email_notifications_enabled if settings else True,
        email_digest_mode=settings.email_digest_mode if settings else "immediate",
        email_opt_out_templates=_parse_opt_out_templates(settings.email_opt_out_templates if settings else None),
    )


@router.put("/tenant-context/settings", response_model=TenantContextRead, tags=["auth"])
async def update_tenant_context_settings(
    payload: TenantSettingsUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantContextRead:
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Bu kullanıcı bir firmaya bağlı değil.")

    tenant = await db.get(Tenant, user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı.")

    settings = await db.get(PlatformTenantSettings, tenant.id)
    if not settings:
        settings = PlatformTenantSettings(tenant_id=tenant.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "email_branding":
            setattr(settings, key, json.dumps(value, ensure_ascii=False) if value is not None else None)
            continue
        if key == "email_opt_out_templates":
            setattr(settings, key, json.dumps(value or [], ensure_ascii=False))
            continue
        setattr(settings, key, value)

    db.add(settings)
    await db.commit()
    await db.refresh(settings)

    return TenantContextRead(
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        tenant_code=tenant.code,
        logo_url=tenant.logo_url,
        tax_no=settings.tax_no,
        sector=settings.sector,
        country=settings.country,
        theme_color=settings.theme_color,
        domain=settings.domain,
        subdomain=settings.subdomain,
        email_mode=settings.email_mode,
        from_name=settings.from_name,
        from_email=settings.from_email,
        reply_to=settings.reply_to,
        email_domain_verified=settings.email_domain_verified,
        email_provider_identity_id=settings.email_provider_identity_id,
        email_branding=json.loads(settings.email_branding) if settings.email_branding else None,
        email_notifications_enabled=settings.email_notifications_enabled,
        email_digest_mode=settings.email_digest_mode,
        email_opt_out_templates=_parse_opt_out_templates(settings.email_opt_out_templates),
    )


@router.put("/tenant-context/profile", response_model=TenantContextRead, tags=["auth"])
async def update_tenant_context_profile(
    payload: TenantProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantContextRead:
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Bu kullanıcı bir firmaya bağlı değil.")

    tenant = await db.get(Tenant, user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı.")

    if payload.tenant_name is not None:
        normalized_name = payload.tenant_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="Firma adı boş olamaz.")
        tenant.name = normalized_name
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url.strip() or None

    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    settings = await db.get(PlatformTenantSettings, tenant.id)
    return TenantContextRead(
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        tenant_code=tenant.code,
        logo_url=tenant.logo_url,
        tax_no=settings.tax_no if settings else None,
        sector=settings.sector if settings else None,
        country=settings.country if settings else None,
        theme_color=settings.theme_color if settings else None,
        domain=settings.domain if settings else None,
        subdomain=settings.subdomain if settings else None,
        email_mode=settings.email_mode if settings else TenantEmailMode.PLATFORM,
        from_name=settings.from_name if settings else None,
        from_email=settings.from_email if settings else None,
        reply_to=settings.reply_to if settings else None,
        email_domain_verified=settings.email_domain_verified if settings else False,
        email_provider_identity_id=settings.email_provider_identity_id if settings else None,
        email_branding=json.loads(settings.email_branding) if settings and settings.email_branding else None,
        email_notifications_enabled=settings.email_notifications_enabled if settings else True,
        email_digest_mode=settings.email_digest_mode if settings else "immediate",
        email_opt_out_templates=_parse_opt_out_templates(settings.email_opt_out_templates if settings else None),
    )


# ── User CRUD for Admin & RBAC ───────────────────────────────────────────────

from app.db.schemas import UserCreate, UserUpdate

@router.get("/users", response_model=list[UserRead], tags=["auth"])
async def list_users(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
) -> list[User]:
    """Tüm kullanıcıları listele."""
    if "admin" not in (user.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcıları listeleme yetkiniz yok.")
        
    query = select(User).order_by(User.created_at.desc())
    if not is_platform_admin(user):
        query = query.where(User.tenant_id == user.tenant_id)

    result = await db.execute(query)
    return list(result.scalars())


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["auth"])
async def create_user(
    user_in: UserCreate,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(get_current_user),
) -> User:
    """Yeni kullanıcı oluştur."""
    if "admin" not in (admin.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcı oluşturma yetkiniz yok.")

    requested_roles = user_in.roles or ["saha_muhendisi"]
    if "platform_admin" in requested_roles and not is_platform_admin(admin):
        raise HTTPException(status_code=403, detail="platform_admin rolü yalnızca platform yöneticisi tarafından atanabilir.")

    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.")

    db_user = User(
        email=user_in.email,
        tenant_id=admin.tenant_id,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        default_role=requested_roles[0],
        discipline=user_in.discipline,
        discipline_only=user_in.discipline_only,
        is_active=True,
    )
    db.add(db_user)
    await db.flush()

    for role_name in requested_roles:
        role_result = await db.execute(select(Role).where(Role.name == role_name))
        role = role_result.scalar_one_or_none()
        if role:
            db.add(UserRole(user_id=db_user.id, role_id=role.id))

    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.patch("/users/{user_id}", response_model=UserRead, tags=["auth"])
async def update_user_details(
    user_id: str,
    user_in: UserUpdate,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(get_current_user),
) -> User:
    """Kullanıcı bilgilerini ve yetkilerini güncelle."""
    if "admin" not in (admin.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcı güncelleme yetkiniz yok.")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if not is_platform_admin(admin) and user.tenant_id != admin.tenant_id:
        raise HTTPException(status_code=403, detail="Bu kullanıcı tenant kapsamınız dışında.")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.discipline is not None:
        user.discipline = user_in.discipline
    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def delete_user_account(
    user_id: str,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(get_current_user),
):
    """Kullanıcı hesabını sil (soft veya hard)."""
    if "admin" not in (admin.default_role or ""):
        raise HTTPException(status_code=403, detail="Kullanıcı silme yetkiniz yok.")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if not is_platform_admin(admin) and user.tenant_id != admin.tenant_id:
        raise HTTPException(status_code=403, detail="Bu kullanıcı tenant kapsamınız dışında.")
    
    user.is_active = False
    db.add(user)
    await db.commit()

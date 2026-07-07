from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, is_platform_admin
from app.core.email_templates import (
    tenant_admin_password_reset_mail,
    tenant_admin_provisioned_mail,
    tenant_status_changed_mail,
)
from app.core.emailing import enqueue_tenant_email
from app.core.security import hash_password
from app.db.models import (
    PlatformAdminAction,
    PlatformPlan,
    PlatformSubscription,
    PlatformTenantSettings,
    MarketplaceInstallation,
    Role,
    TenantEntitlementOverride,
    Tenant,
    TenantStatus,
    User,
    UserRole,
    UserSecurityPolicy,
)
from app.db.schemas import (
    PlatformAuditRead,
    PlatformPlanCreate,
    PlatformPlanRead,
    PlatformSubscriptionAssignRequest,
    PlatformSubscriptionRead,
    MarketplaceInstallRequest,
    MarketplaceListingRead,
    RegistryFeatureRead,
    RegistryModuleRead,
    RegistryQuotaRead,
    TenantAdminProvisionRequest,
    TenantAdminRead,
    TenantEntitlementRead,
    TenantAdminResetRequest,
    TenantAdminUpdateRequest,
    TenantCreate,
    TenantRead,
    TenantSettingsRead,
    TenantSettingsUpsert,
    TenantOverrideUpsert,
    UsageMeterRecordRequest,
    UsageSummaryRead,
    TenantUpdate,
    UserRead,
)
from app.core.services.entitlement_service import EntitlementService

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


def _parse_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        return []
    return []


def _parse_json_dict(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return {}
    return {}


def _plan_read(plan: PlatformPlan) -> PlatformPlanRead:
    quotas = {k: int(v) for k, v in _parse_json_dict(plan.quotas_json).items() if isinstance(v, (int, float, str)) and str(v).isdigit()}
    return PlatformPlanRead(
        id=plan.id,
        code=plan.code,
        name=plan.name,
        max_users=plan.max_users,
        storage_limit_gb=plan.storage_limit_gb,
        modules=_parse_json_list(plan.modules),
        features=_parse_json_list(plan.features),
        quotas=quotas,
        is_active=plan.is_active,
        created_at=plan.created_at,
    )


def _subscription_read(sub: PlatformSubscription) -> PlatformSubscriptionRead:
    return PlatformSubscriptionRead(
        id=sub.id,
        tenant_id=sub.tenant_id,
        plan_id=sub.plan_id,
        status=sub.status,
        overrides=_parse_json_dict(sub.overrides_json),
        starts_at=sub.starts_at,
        ends_at=sub.ends_at,
        created_at=sub.created_at,
    )


VALID_TENANT_STATUSES = {"trial", "active", "suspended", "archived"}


def _ensure_platform_admin(user: User) -> None:
    if not is_platform_admin(user):
        raise HTTPException(status_code=403, detail="Sadece platform yöneticisi erişebilir.")


def _normalize_tenant_status(value: str) -> TenantStatus:
    key = value.strip().lower()
    if key not in VALID_TENANT_STATUSES:
        raise HTTPException(status_code=400, detail="Geçersiz tenant durumu.")
    return TenantStatus(key)


async def _log_action(
    db: AsyncSession,
    actor: User,
    action: str,
    tenant_id: UUID | None = None,
    target_user_id: UUID | None = None,
    details: dict | None = None,
) -> None:
    event = PlatformAdminAction(
        actor_user_id=actor.id,
        action=action,
        tenant_id=tenant_id,
        target_user_id=target_user_id,
        details=json.dumps(details or {}, ensure_ascii=False),
    )
    db.add(event)


async def _get_or_create_user_policy(db: AsyncSession, user_id: UUID) -> UserSecurityPolicy:
    policy = await db.get(UserSecurityPolicy, user_id)
    if policy:
        return policy
    policy = UserSecurityPolicy(user_id=user_id, force_password_change=False)
    db.add(policy)
    await db.flush()
    return policy


@router.get("/tenants", response_model=list[TenantRead], tags=["platform"])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Tenant]:
    _ensure_platform_admin(user)
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    return list(result.scalars())


@router.post("/tenants", response_model=TenantRead, status_code=status.HTTP_201_CREATED, tags=["platform"])
async def create_tenant(
    payload: TenantCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Tenant:
    _ensure_platform_admin(user)

    normalized_code = payload.code.lower().strip()
    existing = await db.execute(select(Tenant).where((Tenant.name == payload.name) | (Tenant.code == normalized_code)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant adı veya kodu zaten mevcut.")

    tenant = Tenant(
        name=payload.name.strip(),
        code=normalized_code,
        logo_url=payload.logo_url,
        status=TenantStatus.TRIAL,
        is_active=True,
    )
    db.add(tenant)
    await db.flush()
    await _log_action(db, user, "tenant.create", tenant_id=tenant.id, details={"name": tenant.name, "code": tenant.code})
    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.patch("/tenants/{tenant_id}", response_model=TenantRead, tags=["platform"])
async def update_tenant(
    tenant_id: UUID,
    payload: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Tenant:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")

    changed: dict[str, object] = {}

    if payload.name is not None:
        tenant.name = payload.name.strip()
        changed["name"] = tenant.name

    if payload.code is not None:
        normalized_code = payload.code.lower().strip()
        duplicate = await db.execute(select(Tenant).where(Tenant.code == normalized_code, Tenant.id != tenant_id))
        if duplicate.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Tenant kodu zaten kullanımda.")
        tenant.code = normalized_code
        changed["code"] = tenant.code

    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url
        changed["logo_url"] = payload.logo_url

    if payload.status is not None:
        tenant.status = _normalize_tenant_status(payload.status)
        changed["status"] = tenant.status.value

    if payload.is_active is not None:
        tenant.is_active = payload.is_active
        changed["is_active"] = payload.is_active

    db.add(tenant)
    await _log_action(db, user, "tenant.update", tenant_id=tenant.id, details=changed)

    should_notify_status_change = payload.status is not None or payload.is_active is not None
    if should_notify_status_change:
        admin_rows = await db.execute(
            select(User).where(User.tenant_id == tenant.id, User.default_role == "admin", User.is_active.is_(True))
        )
        recipients = [u.email for u in admin_rows.scalars().all() if u.email]
        if recipients:
            mail = tenant_status_changed_mail(
                tenant=tenant,
                status=tenant.status.value,
                is_active=tenant.is_active,
            )
            enqueue_tenant_email(
                tenant_id=tenant.id,
                template=mail.template,
                to=recipients,
                subject=mail.subject,
                text=mail.text,
                html=mail.html,
            )

    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.put("/tenants/{tenant_id}/settings", response_model=TenantSettingsRead, tags=["platform"])
async def upsert_tenant_settings(
    tenant_id: UUID,
    payload: TenantSettingsUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantSettingsRead:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")

    settings = await db.get(PlatformTenantSettings, tenant_id)
    if not settings:
        settings = PlatformTenantSettings(tenant_id=tenant_id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "email_branding":
            setattr(settings, key, json.dumps(value, ensure_ascii=False) if value is not None else None)
            continue
        if key == "email_opt_out_templates":
            setattr(settings, key, json.dumps(value or [], ensure_ascii=False))
            continue
        setattr(settings, key, value)

    db.add(settings)
    await _log_action(db, user, "tenant.settings.upsert", tenant_id=tenant_id, details=payload.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(settings)
    return TenantSettingsRead(
        tenant_id=settings.tenant_id,
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
        updated_at=settings.updated_at,
    )


@router.get("/tenants/{tenant_id}/settings", response_model=TenantSettingsRead, tags=["platform"])
async def get_tenant_settings(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantSettingsRead:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")

    settings = await db.get(PlatformTenantSettings, tenant_id)
    if settings:
        return TenantSettingsRead(
            tenant_id=settings.tenant_id,
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
            workflow_email_alerts_enabled=settings.workflow_email_alerts_enabled,
            workflow_alert_recipients=_parse_opt_out_templates(settings.workflow_alert_recipients),
            updated_at=settings.updated_at,
        )

    settings = PlatformTenantSettings(tenant_id=tenant_id)
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    return TenantSettingsRead(
        tenant_id=settings.tenant_id,
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
        updated_at=settings.updated_at,
    )


@router.post("/tenants/provision-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["platform"])
async def provision_tenant_admin(
    payload: TenantAdminProvisionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, payload.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")
    if not tenant.is_active or tenant.status in {TenantStatus.SUSPENDED, TenantStatus.ARCHIVED}:
        raise HTTPException(status_code=400, detail="Pasif tenant için admin provision işlemi yapılamaz.")

    normalized_email = payload.email.lower().strip()
    existing = await db.execute(select(User).where(User.email == normalized_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanımda.")

    admin_user = User(
        tenant_id=tenant.id,
        email=normalized_email,
        hashed_password=hash_password(payload.temporary_password),
        full_name=payload.full_name,
        default_role="admin",
        is_active=True,
        is_verified=True,
    )
    db.add(admin_user)
    await db.flush()

    role = (await db.execute(select(Role).where(Role.name == "admin"))).scalar_one_or_none()
    if role:
        db.add(UserRole(user_id=admin_user.id, role_id=role.id))

    policy = await _get_or_create_user_policy(db, admin_user.id)
    policy.force_password_change = True
    db.add(policy)

    await _log_action(
        db,
        user,
        "tenant.admin.provision",
        tenant_id=tenant.id,
        target_user_id=admin_user.id,
        details={"email": normalized_email},
    )

    provision_mail = tenant_admin_provisioned_mail(
        tenant=tenant,
        full_name=admin_user.full_name,
        temporary_password=payload.temporary_password,
    )
    enqueue_tenant_email(
        tenant_id=tenant.id,
        template=provision_mail.template,
        to=[admin_user.email],
        subject=provision_mail.subject,
        text=provision_mail.text,
        html=provision_mail.html,
    )

    await db.commit()
    await db.refresh(admin_user)
    return admin_user


@router.get("/tenants/{tenant_id}/admins", response_model=list[TenantAdminRead], tags=["platform"])
async def list_tenant_admins(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TenantAdminRead]:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")

    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id, User.default_role == "admin").order_by(User.created_at.desc())
    )
    admins = list(result.scalars())

    payload: list[TenantAdminRead] = []
    for admin in admins:
        policy = await db.get(UserSecurityPolicy, admin.id)
        payload.append(TenantAdminRead(**UserRead.model_validate(admin).model_dump(), force_password_change=bool(policy and policy.force_password_change)))
    return payload


@router.patch("/admin-users/{user_id}", response_model=TenantAdminRead, tags=["platform"])
async def update_tenant_admin_user(
    user_id: UUID,
    payload: TenantAdminUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantAdminRead:
    _ensure_platform_admin(user)

    admin_user = await db.get(User, user_id)
    if not admin_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if admin_user.default_role != "admin":
        raise HTTPException(status_code=400, detail="Yalnız tenant admin kullanıcıları güncellenebilir.")

    changes = payload.model_dump(exclude_unset=True)
    if payload.full_name is not None:
        full_name = payload.full_name.strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="Ad soyad boş olamaz.")
        admin_user.full_name = full_name
        changes["full_name"] = full_name

    if payload.is_active is not None:
        admin_user.is_active = payload.is_active
        db.add(admin_user)

    policy = await _get_or_create_user_policy(db, admin_user.id)
    if payload.force_password_change is not None:
        policy.force_password_change = payload.force_password_change
        db.add(policy)

    await _log_action(
        db,
        user,
        "tenant.admin.update",
        tenant_id=admin_user.tenant_id,
        target_user_id=admin_user.id,
        details=changes,
    )
    await db.commit()
    await db.refresh(admin_user)

    return TenantAdminRead(
        **UserRead.model_validate(admin_user).model_dump(),
        force_password_change=policy.force_password_change,
    )


@router.post("/tenants/{tenant_id}/reset-admin-password", response_model=TenantAdminRead, tags=["platform"])
async def reset_tenant_admin_password(
    tenant_id: UUID,
    payload: TenantAdminResetRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TenantAdminRead:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")
    if not tenant.is_active or tenant.status in {TenantStatus.SUSPENDED, TenantStatus.ARCHIVED}:
        raise HTTPException(status_code=400, detail="Pasif tenant için parola sıfırlanamaz.")

    admin_user: User | None = None
    if payload.admin_user_id is not None:
        candidate = await db.get(User, payload.admin_user_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Yönetici kullanıcı bulunamadı.")
        if candidate.tenant_id != tenant_id or candidate.default_role != "admin":
            raise HTTPException(status_code=400, detail="Seçilen kullanıcı bu firmanın yöneticisi değil.")
        admin_user = candidate
    else:
        result = await db.execute(
            select(User)
            .where(User.tenant_id == tenant_id)
            .where(User.default_role == "admin")
            .order_by(User.created_at.asc())
        )
        admin_user = result.scalars().first()

    if not admin_user:
        raise HTTPException(status_code=404, detail="Tenant admin kullanıcısı bulunamadı.")

    admin_user.hashed_password = hash_password(payload.temporary_password)
    admin_user.is_verified = True
    db.add(admin_user)

    policy = await _get_or_create_user_policy(db, admin_user.id)
    policy.force_password_change = payload.force_password_change
    db.add(policy)

    await _log_action(
        db,
        user,
        "tenant.admin.password.reset",
        tenant_id=tenant.id,
        target_user_id=admin_user.id,
        details={"force_password_change": payload.force_password_change},
    )

    reset_mail = tenant_admin_password_reset_mail(
        tenant=tenant,
        full_name=admin_user.full_name,
        temporary_password=payload.temporary_password,
    )
    enqueue_tenant_email(
        tenant_id=tenant.id,
        template=reset_mail.template,
        to=[admin_user.email],
        subject=reset_mail.subject,
        text=reset_mail.text,
        html=reset_mail.html,
    )

    await db.commit()
    await db.refresh(admin_user)
    return TenantAdminRead(
        **UserRead.model_validate(admin_user).model_dump(),
        force_password_change=policy.force_password_change,
    )


@router.post("/plans", response_model=PlatformPlanRead, status_code=201, tags=["platform"])
async def create_plan(
    payload: PlatformPlanCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PlatformPlanRead:
    _ensure_platform_admin(user)

    normalized_code = payload.code.lower().strip()
    duplicate = await db.execute(select(PlatformPlan).where(PlatformPlan.code == normalized_code))
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Plan kodu zaten mevcut.")

    plan = PlatformPlan(
        code=normalized_code,
        name=payload.name.strip(),
        max_users=payload.max_users,
        storage_limit_gb=payload.storage_limit_gb,
        modules=json.dumps(payload.modules or []),
        features=json.dumps(payload.features or []),
        quotas_json=json.dumps({"users": payload.max_users, "storage_gb": payload.storage_limit_gb, **(payload.quotas or {})}),
    )
    db.add(plan)
    await db.flush()
    await _log_action(db, user, "plan.create", details={"code": plan.code})
    await db.commit()
    await db.refresh(plan)

    return _plan_read(plan)


@router.get("/plans", response_model=list[PlatformPlanRead], tags=["platform"])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PlatformPlanRead]:
    _ensure_platform_admin(user)

    result = await db.execute(select(PlatformPlan).order_by(PlatformPlan.created_at.desc()))
    rows = list(result.scalars())
    return [_plan_read(row) for row in rows]


@router.post("/subscriptions/assign", response_model=PlatformSubscriptionRead, status_code=201, tags=["platform"])
async def assign_subscription(
    payload: PlatformSubscriptionAssignRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PlatformSubscription:
    _ensure_platform_admin(user)

    tenant = await db.get(Tenant, payload.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")

    plan = await db.get(PlatformPlan, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan bulunamadı.")

    sub = PlatformSubscription(
        tenant_id=tenant.id,
        plan_id=plan.id,
        status=payload.status,
        overrides_json=json.dumps(payload.overrides or {}, ensure_ascii=False),
        ends_at=payload.ends_at,
    )
    db.add(sub)
    await db.flush()
    await _log_action(db, user, "subscription.assign", tenant_id=tenant.id, details={"plan_id": str(plan.id), "status": payload.status})
    await db.commit()
    await db.refresh(sub)
    return _subscription_read(sub)


@router.get("/subscriptions", response_model=list[PlatformSubscriptionRead], tags=["platform"])
async def list_subscriptions(
    tenant_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PlatformSubscription]:
    _ensure_platform_admin(user)

    query = select(PlatformSubscription).order_by(PlatformSubscription.created_at.desc())
    if tenant_id:
        query = query.where(PlatformSubscription.tenant_id == tenant_id)
    result = await db.execute(query)
    return [_subscription_read(row) for row in result.scalars()]


@router.get("/modules", response_model=list[RegistryModuleRead], tags=["platform"])
async def list_modules(
    user: User = Depends(get_current_user),
) -> list[dict]:
    _ensure_platform_admin(user)
    return EntitlementService.modules_registry()


@router.get("/features", response_model=list[RegistryFeatureRead], tags=["platform"])
async def list_features(
    user: User = Depends(get_current_user),
) -> list[dict]:
    _ensure_platform_admin(user)
    return EntitlementService.features_registry()


@router.get("/quotas", response_model=list[RegistryQuotaRead], tags=["platform"])
async def list_quotas(
    user: User = Depends(get_current_user),
) -> list[dict]:
    _ensure_platform_admin(user)
    return EntitlementService.quotas_registry()


@router.get("/marketplace/listings", response_model=list[MarketplaceListingRead], tags=["platform"])
async def list_marketplace_listings(
    user: User = Depends(get_current_user),
) -> list[dict]:
    _ensure_platform_admin(user)
    return EntitlementService.marketplace_registry()


@router.post("/tenants/{tenant_id}/marketplace/install", tags=["platform"])
async def install_marketplace_listing(
    tenant_id: UUID,
    payload: MarketplaceInstallRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ensure_platform_admin(user)
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")
    listings = {item.get("id"): item for item in EntitlementService.marketplace_registry()}
    if payload.listing_id not in listings:
        raise HTTPException(status_code=404, detail="Marketplace paketi bulunamadı.")
    existing = await db.execute(
        select(MarketplaceInstallation).where(
            MarketplaceInstallation.tenant_id == tenant_id,
            MarketplaceInstallation.listing_id == payload.listing_id,
        )
    )
    installation = existing.scalar_one_or_none()
    if installation:
        installation.status = "installed"
    else:
        installation = MarketplaceInstallation(tenant_id=tenant_id, listing_id=payload.listing_id, installed_by=user.id)
    db.add(installation)
    await _log_action(db, user, "marketplace.install", tenant_id=tenant_id, details={"listing_id": payload.listing_id})
    await db.commit()
    return {"status": "installed", "listing_id": payload.listing_id}


@router.get("/tenants/{tenant_id}/entitlements", response_model=TenantEntitlementRead, tags=["platform"])
async def get_tenant_entitlements(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ensure_platform_admin(user)
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")
    return await EntitlementService.resolve_entitlements(db, tenant_id)


@router.put("/tenants/{tenant_id}/overrides", response_model=TenantEntitlementRead, tags=["platform"])
async def upsert_tenant_override(
    tenant_id: UUID,
    payload: TenantOverrideUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ensure_platform_admin(user)
    if payload.target_type not in {"module", "feature", "quota"}:
        raise HTTPException(status_code=400, detail="target_type module, feature veya quota olmalıdır.")
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı.")
    existing = await db.execute(
        select(TenantEntitlementOverride).where(
            TenantEntitlementOverride.tenant_id == tenant_id,
            TenantEntitlementOverride.target_type == payload.target_type,
            TenantEntitlementOverride.target_id == payload.target_id,
        )
    )
    override = existing.scalar_one_or_none()
    if not override:
        override = TenantEntitlementOverride(
            tenant_id=tenant_id,
            target_type=payload.target_type,
            target_id=payload.target_id,
            created_by=user.id,
        )
    override.enabled = payload.enabled
    override.limit_value = payload.limit_value
    override.reason = payload.reason
    db.add(override)
    await _log_action(
        db,
        user,
        "tenant.entitlement.override",
        tenant_id=tenant_id,
        details=payload.model_dump(),
    )
    await db.commit()
    return await EntitlementService.resolve_entitlements(db, tenant_id)


@router.get("/tenants/{tenant_id}/usage", response_model=UsageSummaryRead, tags=["platform"])
async def get_tenant_usage(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ensure_platform_admin(user)
    return await EntitlementService.usage_summary(db, tenant_id)


@router.post("/tenants/{tenant_id}/usage", response_model=UsageSummaryRead, tags=["platform"])
async def record_tenant_usage(
    tenant_id: UUID,
    payload: UsageMeterRecordRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ensure_platform_admin(user)
    await EntitlementService.record_usage(
        db,
        tenant_id=tenant_id,
        meter_key=payload.meter_key,
        quantity=payload.quantity,
        source=payload.source,
        event_ref=payload.event_ref,
        period_key=payload.period_key,
    )
    await _log_action(db, user, "tenant.usage.record", tenant_id=tenant_id, details=payload.model_dump())
    await db.commit()
    return await EntitlementService.usage_summary(db, tenant_id)


@router.get("/audit", response_model=list[PlatformAuditRead], tags=["platform"])
async def list_audit_logs(
    tenant_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PlatformAdminAction]:
    _ensure_platform_admin(user)

    query = select(PlatformAdminAction).order_by(PlatformAdminAction.created_at.desc()).limit(limit)
    if tenant_id:
        query = query.where(PlatformAdminAction.tenant_id == tenant_id)

    result = await db.execute(query)
    return list(result.scalars())


@router.get("/health-check", tags=["platform"])
async def get_health_check(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)

    status = {
        "database": "ok",
        "redis": "ok",
        "celery": "ok",
        "whatsapp": "ok",
        "email": "ok"
    }

    # DB Check
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
    except Exception as e:
        status["database"] = f"failed: {str(e)}"

    # Redis Check
    try:
        import redis.asyncio as aioredis
        from app.core.config import settings
        r = aioredis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
    except Exception as e:
        status["redis"] = f"failed: {str(e)}"

    # Celery Check
    try:
        from app.core.workers import celery_app
        if not celery_app.conf.broker_url:
            status["celery"] = "not_configured"
        else:
            if status["redis"] != "ok":
                status["celery"] = "failed: Redis connection failed"
    except Exception as e:
        status["celery"] = f"failed: {str(e)}"

    # WhatsApp Check
    try:
        from app.core.config import settings
        if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
            status["whatsapp"] = "not_configured"
        else:
            status["whatsapp"] = "configured"
    except Exception as e:
        status["whatsapp"] = f"failed: {str(e)}"

    # Email Check
    try:
        from app.core.config import settings
        if not settings.RESEND_API_KEY:
            status["email"] = "not_configured"
        else:
            status["email"] = "configured"
    except Exception as e:
        status["email"] = f"failed: {str(e)}"

    return {"status": "ok", "details": status}


@router.get("/system-metrics", tags=["platform"])
async def get_system_metrics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)

    from sqlalchemy import func
    from app.db.models import Tenant, TenantStatus, User, Project, WorkOrder, PlatformPlan, PlatformSubscription

    # Counts
    total_tenants_stmt = select(func.count(Tenant.id))
    active_tenants_stmt = select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.ACTIVE)
    suspended_tenants_stmt = select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.SUSPENDED)
    total_users_stmt = select(func.count(User.id))
    total_projects_stmt = select(func.count(Project.id))
    total_work_orders_stmt = select(func.count(WorkOrder.id))

    total_tenants = (await db.execute(total_tenants_stmt)).scalar() or 0
    active_tenants = (await db.execute(active_tenants_stmt)).scalar() or 0
    suspended_tenants = (await db.execute(suspended_tenants_stmt)).scalar() or 0
    total_users = (await db.execute(total_users_stmt)).scalar() or 0
    total_projects = (await db.execute(total_projects_stmt)).scalar() or 0
    total_work_orders = (await db.execute(total_work_orders_stmt)).scalar() or 0

    # Plan distribution
    plan_distribution = {}
    try:
        plan_dist_stmt = select(PlatformPlan.name, func.count(PlatformSubscription.id)).join(
            PlatformSubscription, PlatformSubscription.plan_id == PlatformPlan.id
        ).group_by(PlatformPlan.name)
        dist_res = await db.execute(plan_dist_stmt)
        for row in dist_res.all():
            plan_distribution[row[0]] = row[1]
    except Exception:
        pass

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "suspended_tenants": suspended_tenants,
        "total_users": total_users,
        "total_projects": total_projects,
        "total_work_orders": total_work_orders,
        "plan_distribution": plan_distribution
    }


from pydantic import BaseModel
from typing import Optional, Literal
from fastapi import Header
from app.db.schemas import ContextSessionRead, SupportAnalyticsRead

class ContextStartRequest(BaseModel):
    tenant_id: UUID
    mode: Literal["read_only", "support_write"]
    reason: Optional[str] = None
    ticket_ref: Optional[str] = None

class ContextStartResponse(BaseModel):
    context_token: str
    tenant_id: UUID
    tenant_name: str
    mode: str
    expires_at: str
    enabled_modules: list[str]
    feature_flags: list[str]
    active_modules: list[str] = []
    active_features: list[str] = []
    effective_quotas: dict[str, int] = {}
    usage_summary: dict = {}
    entitlement_source: dict = {}
    plan: dict | None = None
    subscription: dict | None = None
    context_id: UUID

@router.post("/context/start", response_model=ContextStartResponse, tags=["platform"])
async def start_context(
    payload: ContextStartRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    
    # Reason policy
    if payload.mode == "support_write":
        if not payload.reason or len(payload.reason.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Destek/Yazma (support_write) modu için en az 10 karakter uzunluğunda işlem gerekçesi (reason) girmek zorunludur."
            )
            
    from app.db.models import Tenant, PlatformContextSession
    tenant = await db.get(Tenant, payload.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı.")
        
    entitlements = await EntitlementService.resolve_entitlements(db, tenant.id)
    usage_summary = await EntitlementService.usage_summary(db, tenant.id)
    enabled_modules = entitlements["modules"]
    feature_flags = entitlements["features"]
            
    # Create the stateful PlatformContextSession in DB
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    duration_minutes = 30
    expires_at = now + timedelta(minutes=duration_minutes)
    
    session = PlatformContextSession(
        platform_admin_id=user.id,
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        mode=payload.mode,
        reason=payload.reason,
        ticket_ref=payload.ticket_ref,
        status="active",
        started_at=now,
        sa_column_kwargs={}, # local SQLModel helper
        expires_at=expires_at
    )
    db.add(session)
    await db.flush() # gets session.id
    
    from app.core.services.context_service import create_context_token
    token = create_context_token(
        actor_user_id=str(user.id),
        tenant_id=str(tenant.id),
        mode=payload.mode,
        reason=payload.reason,
        ticket_ref=payload.ticket_ref,
        duration_minutes=duration_minutes,
        context_id=str(session.id)
    )
    
    audit_details = {
        "context_id": str(session.id),
        "mode": payload.mode,
        "reason": payload.reason,
        "ticket_ref": payload.ticket_ref,
    }
    await _log_action(
        db, 
        actor=user, 
        action="context_started", 
        tenant_id=tenant.id, 
        details=audit_details
    )
    await db.commit()
    
    return ContextStartResponse(
        context_token=token,
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        mode=payload.mode,
        expires_at=expires_at.isoformat() + "Z",
        enabled_modules=enabled_modules,
        feature_flags=feature_flags,
        active_modules=enabled_modules,
        active_features=feature_flags,
        effective_quotas=entitlements.get("quotas", {}),
        usage_summary=usage_summary.get("usage", {}),
        entitlement_source=entitlements.get("entitlement_source", {}),
        plan=entitlements.get("entitlement_source", {}).get("plan"),
        subscription={"id": entitlements.get("subscription_id"), "plan_id": entitlements.get("plan_id")} if entitlements.get("subscription_id") else None,
        context_id=session.id
    )

@router.post("/context/end", tags=["platform"])
async def end_context(
    x_tenant_context: Optional[str] = Header(None, alias="X-Tenant-Context"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    
    if x_tenant_context:
        from app.core.services.context_service import decode_context_token
        try:
            payload = decode_context_token(x_tenant_context)
            context_id = payload.get("context_id")
            if context_id:
                from app.db.models import PlatformContextSession
                from datetime import datetime, timezone
                session = await db.get(PlatformContextSession, UUID(context_id))
                if session and session.status == "active":
                    session.status = "ended"
                    session.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    session.ended_reason = "Ended by platform admin"
                    db.add(session)
        except Exception:
            pass
            
    await _log_action(db, user, "context_ended")
    await db.commit()
    return {"status": "ok"}

@router.post("/context/renew", tags=["platform"])
async def renew_context(
    x_tenant_context: Optional[str] = Header(None, alias="X-Tenant-Context"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    if not x_tenant_context:
        raise HTTPException(status_code=400, detail="X-Tenant-Context başlığı eksik.")
        
    from app.core.services.context_service import decode_context_token
    try:
        payload = decode_context_token(x_tenant_context)
        context_id = payload.get("context_id")
        if not context_id:
            raise HTTPException(status_code=400, detail="Bağlam içinde oturum kimliği bulunamadı.")
            
        from app.db.models import PlatformContextSession
        from datetime import datetime, timedelta, timezone
        session = await db.get(PlatformContextSession, UUID(context_id))
        if not session or session.status != "active":
            raise HTTPException(status_code=400, detail="Uzatılacak aktif destek oturumu bulunamadı.")
            
        # Extend expires_at by 30 mins from now
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        duration_minutes = 30
        new_expires_at = now + timedelta(minutes=duration_minutes)
        session.expires_at = new_expires_at
        db.add(session)
        
        await _log_action(
            db, 
            actor=user, 
            action="context_renewed", 
            tenant_id=session.tenant_id, 
            details={"context_id": context_id}
        )
        await db.commit()
        
        # Issue new token
        from app.core.services.context_service import create_context_token
        new_token = create_context_token(
            actor_user_id=str(user.id),
            tenant_id=str(session.tenant_id),
            mode=session.mode,
            reason=session.reason,
            ticket_ref=session.ticket_ref,
            duration_minutes=duration_minutes,
            context_id=str(session.id)
        )
        
        return {
            "context_token": new_token,
            "expires_at": new_expires_at.isoformat() + "Z"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Oturum yenilenemedi: {str(e)}")

@router.post("/context/revoke/{session_id}", tags=["platform"])
async def revoke_context(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    
    from app.db.models import PlatformContextSession
    from datetime import datetime, timezone
    session = await db.get(PlatformContextSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Destek oturumu bulunamadı.")
        
    session.status = "revoked"
    session.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.ended_reason = "Platform yöneticisi tarafından sonlandırıldı (Force Revoked)"
    db.add(session)
    
    await _log_action(
        db, 
        actor=user, 
        action="context_revoked", 
        tenant_id=session.tenant_id, 
        details={"context_id": str(session_id)}
    )
    await db.commit()
    return {"status": "ok"}

@router.get("/context/active", response_model=list[ContextSessionRead], tags=["platform"])
async def list_active_contexts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    
    from app.db.models import PlatformContextSession
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    # Also auto-expire any active session in the database whose time has passed
    expire_stmt = select(PlatformContextSession).where(
        PlatformContextSession.status == "active",
        PlatformContextSession.expires_at < now
    )
    to_expire = (await db.execute(expire_stmt)).scalars().all()
    for s in to_expire:
        s.status = "expired"
        s.ended_at = s.expires_at
        db.add(s)
    if to_expire:
        await db.commit()
        
    stmt = select(PlatformContextSession).where(
        PlatformContextSession.status == "active",
        PlatformContextSession.expires_at >= now
    ).order_by(PlatformContextSession.started_at.desc())
    
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/context/history", response_model=list[ContextSessionRead], tags=["platform"])
async def list_context_history(
    range_filter: Optional[str] = Query("today", alias="range"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    
    from app.db.models import PlatformContextSession
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    stmt = select(PlatformContextSession)
    
    if range_filter == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = stmt.where(PlatformContextSession.started_at >= start_date)
    elif range_filter == "week":
        start_date = now - timedelta(days=7)
        stmt = stmt.where(PlatformContextSession.started_at >= start_date)
    elif range_filter == "month":
        start_date = now - timedelta(days=30)
        stmt = stmt.where(PlatformContextSession.started_at >= start_date)
        
    stmt = stmt.order_by(PlatformContextSession.started_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/context/analytics", response_model=SupportAnalyticsRead, tags=["platform"])
async def get_support_analytics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    
    from app.db.models import PlatformContextSession
    from datetime import datetime, timezone
    from sqlalchemy import func
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Today's sessions count
    today_count_stmt = select(func.count(PlatformContextSession.id)).where(PlatformContextSession.started_at >= today_start)
    today_sessions_count = (await db.execute(today_count_stmt)).scalar() or 0
    
    # 2. Total sessions count
    total_count_stmt = select(func.count(PlatformContextSession.id))
    total_sessions_count = (await db.execute(total_count_stmt)).scalar() or 0
    
    # 3. Read-only vs Support-write pct
    read_only_pct = 0.0
    support_write_pct = 0.0
    if total_sessions_count > 0:
        ro_stmt = select(func.count(PlatformContextSession.id)).where(PlatformContextSession.mode == "read_only")
        ro_count = (await db.execute(ro_stmt)).scalar() or 0
        read_only_pct = round((ro_count / total_sessions_count) * 100, 1)
        support_write_pct = round(100 - read_only_pct, 1)
        
    # 4. Top tenants
    top_stmt = select(
        PlatformContextSession.tenant_name,
        func.count(PlatformContextSession.id).label("count")
    ).group_by(PlatformContextSession.tenant_name).order_by(func.count(PlatformContextSession.id).desc()).limit(5)
    top_res = await db.execute(top_stmt)
    top_tenants = [{"tenant_name": row[0], "count": row[1]} for row in top_res.all()]
    
    # 5. Average support session duration
    avg_duration_minutes = 0.0
    duration_stmt = select(PlatformContextSession.started_at, PlatformContextSession.ended_at).where(
        PlatformContextSession.ended_at.is_not(None)
    )
    durations = (await db.execute(duration_stmt)).all()
    if durations:
        total_minutes = sum((row[1] - row[0]).total_seconds() / 60.0 for row in durations)
        avg_duration_minutes = round(total_minutes / len(durations), 1)
        
    return {
        "today_sessions_count": today_sessions_count,
        "total_sessions_count": total_sessions_count,
        "read_only_pct": read_only_pct,
        "support_write_pct": support_write_pct,
        "top_tenants": top_tenants,
        "avg_duration_minutes": avg_duration_minutes
    }

@router.get("/context/current", tags=["platform"])
async def current_context(
    x_tenant_context: Optional[str] = Header(None, alias="X-Tenant-Context"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_platform_admin(user)
    if not x_tenant_context:
        return {"active": False}
        
    from app.core.services.context_service import decode_context_token
    try:
        payload = decode_context_token(x_tenant_context)
        from app.db.models import Tenant
        from datetime import datetime, timezone
        tenant = await db.get(Tenant, UUID(payload["tenant_id"]))
        tenant_name = tenant.name if tenant else "Bilinmeyen Firma"
        return {
            "active": True,
            "tenant_id": payload["tenant_id"],
            "tenant_name": tenant_name,
            "mode": payload["mode"],
            "expires_at": datetime.fromtimestamp(payload["exp"], tz=timezone.utc).isoformat(),
        }
    except Exception:
        return {"active": False}



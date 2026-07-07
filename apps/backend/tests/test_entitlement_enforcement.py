"""
Sprint 18.5 — Entitlement Enforcement Tests
============================================
Bu test suite aşağıdaki senaryoları izole biçimde doğrular:

1. Module disabled → 403 MODULE_NOT_ENABLED
2. Module enabled → geçer
3. Feature disabled → 403 FEATURE_NOT_ENABLED
4. Quota exceeded → 429 QUOTA_EXCEEDED
5. Quota within limit → geçer
6. Quota increment idempotency (aynı event_ref → çift sayım olmaz)
7. platform_admin no-context → tenant endpoint 403 ENTITLEMENT_CONTEXT_MISSING
8. platform_admin with context → target tenant entitlement uygulanır
9. Record usage → TenantUsageMeter oluşur ve doğru değeri tutar
10. Tenant override → plan'ın dışında modül açılır / kapatılır
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.core.dependencies import (
    require_feature,
    require_module,
    require_quota,
)
from app.db.models import (
    PlatformPlan,
    PlatformSubscription,
    TenantEntitlementOverride,
    TenantUsageMeter,
    User,
)
from app.services.entitlement_service import EntitlementService, current_period_key

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class MockRequest:
    def __init__(self, headers: dict = {}):
        self.headers = headers


def _make_user(role: str = "admin", tenant_id=None) -> User:
    return User(
        id=uuid.uuid4(),
        email=f"{role}@test.com",
        default_role=role,
        tenant_id=tenant_id or uuid.uuid4(),
        is_active=True,
    )


def _make_db_with_entitlements(modules: list, features: list, quotas: dict):
    """Build a mock db that EntitlementService.resolve_entitlements can consume."""
    db = AsyncMock()
    # No active subscription → registry defaults only
    mock_sub_result = MagicMock()
    mock_sub_result.scalars.return_value.first.return_value = None
    mock_install_result = MagicMock()
    mock_install_result.scalars.return_value.all.return_value = []
    mock_override_result = MagicMock()
    mock_override_result.scalars.return_value.all.return_value = []
    db.execute.side_effect = [
        mock_sub_result,
        mock_install_result,
        mock_override_result,
    ]
    return db


# ---------------------------------------------------------------------------
# EntitlementService unit tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_is_module_enabled_when_in_entitlements():
    """Resolve edilen modüller arasında olan bir modül True döndürür."""
    tenant_id = uuid.uuid4()

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={"modules": ["documents", "work_orders"], "features": [], "quotas": {}}),
    ):
        db = AsyncMock()
        result = await EntitlementService.is_module_enabled(db, tenant_id, "documents")
        assert result is True


@pytest.mark.asyncio
async def test_is_module_disabled_when_not_in_entitlements():
    """Olmayan modül False döndürür."""
    tenant_id = uuid.uuid4()

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={"modules": ["work_orders"], "features": [], "quotas": {}}),
    ):
        db = AsyncMock()
        result = await EntitlementService.is_module_enabled(db, tenant_id, "documents")
        assert result is False


@pytest.mark.asyncio
async def test_is_feature_enabled():
    tenant_id = uuid.uuid4()

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={"modules": [], "features": ["whatsapp.notifications"], "quotas": {}}),
    ):
        db = AsyncMock()
        assert await EntitlementService.is_feature_enabled(db, tenant_id, "whatsapp.notifications") is True
        assert await EntitlementService.is_feature_enabled(db, tenant_id, "ai.assistant") is False


@pytest.mark.asyncio
async def test_quota_available_within_limit():
    """Mevcut kullanım + yeni kullanım ≤ limit → True."""
    tenant_id = uuid.uuid4()

    mock_meter = TenantUsageMeter(
        tenant_id=tenant_id,
        meter_key="whatsapp_messages",
        period_key=current_period_key("monthly"),
        quantity=90,
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_meter

    db = AsyncMock()
    db.execute.return_value = mock_result

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={"modules": [], "features": [], "quotas": {"whatsapp_messages": 100}}),
    ):
        result = await EntitlementService.quota_available(db, tenant_id, "whatsapp_messages", 1)
        assert result is True


@pytest.mark.asyncio
async def test_quota_exceeded():
    """Mevcut kullanım + yeni kullanım > limit → False."""
    tenant_id = uuid.uuid4()

    mock_meter = TenantUsageMeter(
        tenant_id=tenant_id,
        meter_key="whatsapp_messages",
        period_key=current_period_key("monthly"),
        quantity=100,
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_meter

    db = AsyncMock()
    db.execute.return_value = mock_result

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={"modules": [], "features": [], "quotas": {"whatsapp_messages": 100}}),
    ):
        result = await EntitlementService.quota_available(db, tenant_id, "whatsapp_messages", 1)
        assert result is False


@pytest.mark.asyncio
async def test_quota_unlimited_when_limit_zero():
    """Limit 0 ise kota kontrolü atlanır → her zaman True."""
    tenant_id = uuid.uuid4()
    db = AsyncMock()

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={"modules": [], "features": [], "quotas": {"whatsapp_messages": 0}}),
    ):
        result = await EntitlementService.quota_available(db, tenant_id, "whatsapp_messages", 999)
        assert result is True


@pytest.mark.asyncio
async def test_record_usage_idempotency():
    """Aynı event_ref ikinci kez çağrılırsa mevcut kayıt değişmez (çift sayım önlenir)."""
    tenant_id = uuid.uuid4()
    event_ref = str(uuid.uuid4())
    period = current_period_key("monthly")

    existing_meter = TenantUsageMeter(
        tenant_id=tenant_id,
        meter_key="work_orders",
        period_key=period,
        quantity=5,
        source="work_orders.create",
        last_event_ref=event_ref,  # already recorded
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_meter

    db = AsyncMock()
    db.execute.return_value = mock_result

    row = await EntitlementService.record_usage(
        db, tenant_id, "work_orders", 1, source="work_orders.create", event_ref=event_ref
    )
    # Quantity should NOT have increased because same event_ref
    assert row.quantity == 5


@pytest.mark.asyncio
async def test_record_usage_new_event():
    """Farklı event_ref → quantity artmalı."""
    tenant_id = uuid.uuid4()
    period = current_period_key("monthly")

    existing_meter = TenantUsageMeter(
        tenant_id=tenant_id,
        meter_key="work_orders",
        period_key=period,
        quantity=5,
        source="work_orders.create",
        last_event_ref="old-ref",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_meter

    db = AsyncMock()
    db.execute.return_value = mock_result

    row = await EntitlementService.record_usage(
        db, tenant_id, "work_orders", 1, source="work_orders.create", event_ref="new-ref"
    )
    assert row.quantity == 6


@pytest.mark.asyncio
async def test_tenant_override_adds_module():
    """TenantEntitlementOverride ile plan dışı modül açılabilir."""
    tenant_id = uuid.uuid4()

    override = TenantEntitlementOverride(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        target_type="module",
        target_id="inventory",
        enabled=True,
        limit_value=None,
    )

    # Mock db responses: subscription=None, marketplace=[], overrides=[override]
    db = AsyncMock()
    mock_sub = MagicMock(); mock_sub.scalars.return_value.first.return_value = None
    mock_market = MagicMock(); mock_market.scalars.return_value.all.return_value = []
    mock_override = MagicMock(); mock_override.scalars.return_value.all.return_value = [override]
    db.execute.side_effect = [mock_sub, mock_market, mock_override]

    result = await EntitlementService.resolve_entitlements(db, tenant_id)
    assert "inventory" in result["modules"]
    assert any(o["target_id"] == "inventory" for o in result["entitlement_source"]["tenant_override"])


@pytest.mark.asyncio
async def test_tenant_override_removes_module():
    """TenantEntitlementOverride ile plan içi modül kapatılabilir."""
    tenant_id = uuid.uuid4()

    # Plan grants "documents"
    mock_plan = PlatformPlan(
        id=uuid.uuid4(),
        code="starter",
        name="Starter",
        modules='["documents", "work_orders"]',
        features='[]',
        quotas_json='{}',
        max_users=5,
        storage_limit_gb=10,
    )
    mock_sub = PlatformSubscription(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        plan_id=mock_plan.id,
        status="active",
        overrides_json="{}",
        created_at=datetime.utcnow(),
    )
    override = TenantEntitlementOverride(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        target_type="module",
        target_id="documents",
        enabled=False,  # disable it
        limit_value=None,
    )

    db = AsyncMock()
    # sub result
    mock_sub_res = MagicMock(); mock_sub_res.scalars.return_value.first.return_value = mock_sub
    db.get.return_value = mock_plan
    # marketplace result
    mock_market = MagicMock(); mock_market.scalars.return_value.all.return_value = []
    # override result
    mock_override_res = MagicMock(); mock_override_res.scalars.return_value.all.return_value = [override]
    db.execute.side_effect = [mock_sub_res, mock_market, mock_override_res]

    result = await EntitlementService.resolve_entitlements(db, tenant_id)
    # documents should have been removed by override
    assert "documents" not in result["modules"]
    assert "work_orders" in result["modules"]


@pytest.mark.asyncio
async def test_quota_override_sets_period():
    tenant_id = uuid.uuid4()
    override = TenantEntitlementOverride(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        target_type="quota",
        target_id="workflow_runs",
        enabled=True,
        limit_value=25,
        period="weekly",
    )

    db = AsyncMock()
    mock_sub = MagicMock(); mock_sub.scalars.return_value.first.return_value = None
    mock_market = MagicMock(); mock_market.scalars.return_value.all.return_value = []
    mock_override = MagicMock(); mock_override.scalars.return_value.all.return_value = [override]
    db.execute.side_effect = [mock_sub, mock_market, mock_override]

    result = await EntitlementService.resolve_entitlements(db, tenant_id)

    assert result["quotas"]["workflow_runs"] == 25
    assert result["quota_periods"]["workflow_runs"] == "weekly"
    assert result["entitlement_source"]["tenant_override"][0]["period"] == "weekly"


@pytest.mark.asyncio
async def test_record_usage_uses_quota_override_period():
    tenant_id = uuid.uuid4()
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_result

    with patch.object(
        EntitlementService,
        "resolve_entitlements",
        new=AsyncMock(return_value={
            "modules": [],
            "features": [],
            "quotas": {"workflow_runs": 10},
            "quota_periods": {"workflow_runs": "weekly"},
        }),
    ):
        row = await EntitlementService.record_usage(db, tenant_id, "workflow_runs", 1, source="test")

    assert row.period_key == current_period_key("weekly")


# ---------------------------------------------------------------------------
# require_module dependency tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_require_module_raises_when_disabled():
    """Module disabled → 403 MODULE_NOT_ENABLED."""
    user = _make_user()
    tenant_id = user.tenant_id

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(user.id), "roles": ["admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=user)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=tenant_id)), \
         patch("app.services.entitlement_service.EntitlementService.is_module_enabled", new=AsyncMock(return_value=False)):

        checker = require_module("documents")
        db = AsyncMock()
        with pytest.raises(HTTPException) as exc:
            await checker(request=MockRequest(), token="tok", db=db)
        assert exc.value.status_code == 403
        assert exc.value.detail.get("code") == "MODULE_NOT_ENABLED"


@pytest.mark.asyncio
async def test_require_module_passes_when_enabled():
    """Module enabled → kullanıcı döner, exception yok."""
    user = _make_user()
    tenant_id = user.tenant_id

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(user.id), "roles": ["admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=user)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=tenant_id)), \
         patch("app.services.entitlement_service.EntitlementService.is_module_enabled", new=AsyncMock(return_value=True)):

        checker = require_module("documents")
        db = AsyncMock()
        result = await checker(request=MockRequest(), token="tok", db=db)
        assert result.id == user.id


@pytest.mark.asyncio
async def test_require_feature_raises_when_disabled():
    """Feature disabled → 403 FEATURE_NOT_ENABLED."""
    user = _make_user()
    tenant_id = user.tenant_id

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(user.id), "roles": ["admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=user)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=tenant_id)), \
         patch("app.services.entitlement_service.EntitlementService.is_feature_enabled", new=AsyncMock(return_value=False)):

        checker = require_feature("whatsapp.notifications")
        db = AsyncMock()
        with pytest.raises(HTTPException) as exc:
            await checker(request=MockRequest(), token="tok", db=db)
        assert exc.value.status_code == 403
        assert exc.value.detail.get("code") == "FEATURE_NOT_ENABLED"


@pytest.mark.asyncio
async def test_require_quota_raises_when_exceeded():
    """Quota aşıldı → 429 QUOTA_EXCEEDED."""
    user = _make_user()
    tenant_id = user.tenant_id
    period = current_period_key("monthly")

    mock_meter = TenantUsageMeter(
        tenant_id=tenant_id, meter_key="whatsapp_messages",
        period_key=period, quantity=100,
    )
    mock_meter_res = MagicMock()
    mock_meter_res.scalar_one_or_none.return_value = mock_meter

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(user.id), "roles": ["admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=user)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=tenant_id)), \
         patch("app.services.entitlement_service.EntitlementService.resolve_entitlements",
               new=AsyncMock(return_value={"modules": [], "features": [], "quotas": {"whatsapp_messages": 100}})):

        checker = require_quota("whatsapp_messages", 1)
        db = AsyncMock()
        db.execute.return_value = mock_meter_res
        with pytest.raises(HTTPException) as exc:
            await checker(request=MockRequest(), token="tok", db=db)
        assert exc.value.status_code == 429
        assert exc.value.detail.get("code") == "QUOTA_EXCEEDED"


@pytest.mark.asyncio
async def test_require_quota_passes_within_limit():
    """Quota aşılmadı → kullanıcı döner."""
    user = _make_user()
    tenant_id = user.tenant_id
    period = current_period_key("monthly")

    mock_meter = TenantUsageMeter(
        tenant_id=tenant_id, meter_key="whatsapp_messages",
        period_key=period, quantity=50,
    )
    mock_meter_res = MagicMock()
    mock_meter_res.scalar_one_or_none.return_value = mock_meter

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(user.id), "roles": ["admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=user)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=tenant_id)), \
         patch("app.services.entitlement_service.EntitlementService.resolve_entitlements",
               new=AsyncMock(return_value={"modules": [], "features": [], "quotas": {"whatsapp_messages": 100}})):

        checker = require_quota("whatsapp_messages", 1)
        db = AsyncMock()
        db.execute.return_value = mock_meter_res
        result = await checker(request=MockRequest(), token="tok", db=db)
        assert result.id == user.id


@pytest.mark.asyncio
async def test_platform_admin_no_context_raises_entitlement_context_missing():
    """Platform admin, tenant bağlamı yoksa require_module 403 ENTITLEMENT_CONTEXT_MISSING döndürür."""
    admin = User(
        id=uuid.uuid4(),
        email="platform@golabstek.com",
        default_role="platform_admin",
        tenant_id=None,
        is_active=True,
    )

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(admin.id), "roles": ["platform_admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=admin)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=None)):

        checker = require_module("documents")
        db = AsyncMock()
        with pytest.raises(HTTPException) as exc:
            await checker(request=MockRequest(), token="tok", db=db)
        assert exc.value.status_code == 403
        assert exc.value.detail.get("code") == "ENTITLEMENT_CONTEXT_MISSING"


@pytest.mark.asyncio
async def test_platform_admin_with_context_uses_target_tenant_entitlement():
    """Platform admin, tenant bağlamı varsa hedef tenant'ın entitlement'ına göre çalışır."""
    admin = User(
        id=uuid.uuid4(),
        email="platform@golabstek.com",
        default_role="platform_admin",
        tenant_id=None,
        is_active=True,
    )
    target_tenant_id = uuid.uuid4()

    with patch("app.core.dependencies.decode_token", return_value={"sub": str(admin.id), "roles": ["platform_admin"]}), \
         patch("app.core.dependencies._get_user_by_sub", new=AsyncMock(return_value=admin)), \
         patch("app.core.dependencies.get_current_tenant_id", new=AsyncMock(return_value=target_tenant_id)), \
         patch("app.services.entitlement_service.EntitlementService.is_module_enabled", new=AsyncMock(return_value=True)):

        checker = require_module("documents")
        db = AsyncMock()
        result = await checker(request=MockRequest(), token="tok", db=db)
        # tenant_id should be set to target_tenant_id on user
        assert result.tenant_id == target_tenant_id

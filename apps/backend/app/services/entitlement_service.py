from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    MarketplaceInstallation,
    PlatformPlan,
    PlatformSubscription,
    TenantEntitlementOverride,
    TenantUsageMeter,
)


REGISTRY_DIR = Path(__file__).resolve().parents[2] / "registry"


def _load_registry_file(name: str) -> list[dict[str, Any]]:
    path = REGISTRY_DIR / name
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    return [str(x) for x in parsed] if isinstance(parsed, list) else []


def _json_dict(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def current_period_key(period: str = "monthly") -> str:
    now = datetime.now(timezone.utc)
    if period == "daily":
        return now.strftime("%Y-%m-%d")
    if period == "yearly":
        return now.strftime("%Y")
    if period == "lifetime":
        return "lifetime"
    return now.strftime("%Y-%m")


class EntitlementService:
    @staticmethod
    def modules_registry() -> list[dict[str, Any]]:
        return _load_registry_file("modules.json")

    @staticmethod
    def features_registry() -> list[dict[str, Any]]:
        return _load_registry_file("features.json")

    @staticmethod
    def quotas_registry() -> list[dict[str, Any]]:
        return _load_registry_file("quotas.json")

    @staticmethod
    def marketplace_registry() -> list[dict[str, Any]]:
        return _load_registry_file("marketplace.json")

    @staticmethod
    async def get_active_subscription(db: AsyncSession, tenant_id: UUID) -> PlatformSubscription | None:
        stmt = (
            select(PlatformSubscription)
            .where(PlatformSubscription.tenant_id == tenant_id, PlatformSubscription.status == "active")
            .order_by(PlatformSubscription.created_at.desc())
        )
        return (await db.execute(stmt)).scalars().first()

    @staticmethod
    async def resolve_entitlements(db: AsyncSession, tenant_id: UUID) -> dict[str, Any]:
        modules: set[str] = {m["id"] for m in EntitlementService.modules_registry() if m.get("plan_tier") == "core"}
        features: set[str] = {f["id"] for f in EntitlementService.features_registry() if f.get("enabled_by_default")}
        quotas: dict[str, int] = {q["id"]: int(q.get("default_limit", 0)) for q in EntitlementService.quotas_registry()}
        source: dict[str, Any] = {
            "plan": None,
            "subscription_override": {},
            "tenant_override": [],
            "marketplace_install": [],
        }

        sub = await EntitlementService.get_active_subscription(db, tenant_id)
        plan: PlatformPlan | None = None
        if sub:
            plan = await db.get(PlatformPlan, sub.plan_id)
        if plan:
            source["plan"] = {"id": str(plan.id), "code": plan.code, "name": plan.name}
            modules.update(_json_list(plan.modules))
            features.update(_json_list(plan.features))
            quotas.update({k: int(v) for k, v in _json_dict(plan.quotas_json).items() if isinstance(v, (int, float, str)) and str(v).isdigit()})
            sub_overrides = _json_dict(sub.overrides_json)
            source["subscription_override"] = sub_overrides
            modules.update(str(x) for x in sub_overrides.get("modules", []) if x)
            features.update(str(x) for x in sub_overrides.get("features", []) if x)
            quotas.update({k: int(v) for k, v in sub_overrides.get("quotas", {}).items() if isinstance(v, (int, float, str)) and str(v).isdigit()})

        installs = await db.execute(
            select(MarketplaceInstallation).where(MarketplaceInstallation.tenant_id == tenant_id, MarketplaceInstallation.status == "installed")
        )
        marketplace_by_id = {item.get("id"): item for item in EntitlementService.marketplace_registry()}
        for install in installs.scalars().all():
            listing = marketplace_by_id.get(install.listing_id)
            if listing:
                source["marketplace_install"].append({"listing_id": install.listing_id, "status": install.status})
                modules.update(str(x) for x in listing.get("module_ids", []) if x)
                features.update(str(x) for x in listing.get("feature_ids", []) if x)

        overrides = await db.execute(select(TenantEntitlementOverride).where(TenantEntitlementOverride.tenant_id == tenant_id))
        for override in overrides.scalars().all():
            source["tenant_override"].append({
                "target_type": override.target_type,
                "target_id": override.target_id,
                "enabled": override.enabled,
                "limit_value": override.limit_value,
            })
            if override.target_type == "module":
                (modules.add if override.enabled else modules.discard)(override.target_id)
            elif override.target_type == "feature":
                (features.add if override.enabled else features.discard)(override.target_id)
            elif override.target_type == "quota" and override.limit_value is not None:
                quotas[override.target_id] = override.limit_value

        return {
            "tenant_id": str(tenant_id),
            "plan_id": str(plan.id) if plan else None,
            "subscription_id": str(sub.id) if sub else None,
            "modules": sorted(modules),
            "features": sorted(features),
            "quotas": quotas,
            "entitlement_source": source,
        }

    @staticmethod
    def quota_period(quota_key: str) -> str:
        for quota in EntitlementService.quotas_registry():
            if quota.get("id") == quota_key:
                return str(quota.get("period", "monthly"))
        return "monthly"

    @staticmethod
    async def is_module_enabled(db: AsyncSession, tenant_id: UUID, module_id: str) -> bool:
        entitlements = await EntitlementService.resolve_entitlements(db, tenant_id)
        return module_id in entitlements["modules"]

    @staticmethod
    async def is_feature_enabled(db: AsyncSession, tenant_id: UUID, feature_id: str) -> bool:
        entitlements = await EntitlementService.resolve_entitlements(db, tenant_id)
        return feature_id in entitlements["features"]

    @staticmethod
    async def quota_available(db: AsyncSession, tenant_id: UUID, quota_key: str, increment: int = 1) -> bool:
        entitlements = await EntitlementService.resolve_entitlements(db, tenant_id)
        limit = entitlements.get("quotas", {}).get(quota_key)
        if limit is None or int(limit) <= 0:
            return True
        period = current_period_key(EntitlementService.quota_period(quota_key))
        stmt = select(TenantUsageMeter).where(
            TenantUsageMeter.tenant_id == tenant_id,
            TenantUsageMeter.meter_key == quota_key,
            TenantUsageMeter.period_key == period,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        return ((row.quantity if row else 0) + increment) <= int(limit)

    @staticmethod
    async def record_usage(
        db: AsyncSession,
        tenant_id: UUID,
        meter_key: str,
        quantity: int = 1,
        source: str = "system",
        event_ref: str | None = None,
        period_key: str | None = None,
    ) -> TenantUsageMeter:
        period = period_key or current_period_key(EntitlementService.quota_period(meter_key))
        stmt = select(TenantUsageMeter).where(
            TenantUsageMeter.tenant_id == tenant_id,
            TenantUsageMeter.meter_key == meter_key,
            TenantUsageMeter.period_key == period,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row is not None and event_ref and row.last_event_ref == event_ref:
            return row
        if row is None:
            row = TenantUsageMeter(tenant_id=tenant_id, meter_key=meter_key, period_key=period, quantity=0, source=source)
        row.quantity += max(quantity, 0)
        row.source = source
        row.last_event_ref = event_ref
        db.add(row)
        await db.flush()
        return row

    @staticmethod
    async def usage_summary(db: AsyncSession, tenant_id: UUID) -> dict[str, Any]:
        entitlements = await EntitlementService.resolve_entitlements(db, tenant_id)
        result = await db.execute(select(TenantUsageMeter).where(TenantUsageMeter.tenant_id == tenant_id))
        meters = result.scalars().all()
        usage = {m.meter_key: {"period_key": m.period_key, "quantity": m.quantity, "limit": entitlements["quotas"].get(m.meter_key)} for m in meters}
        return {"tenant_id": str(tenant_id), "usage": usage, "quotas": entitlements["quotas"]}

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def test_legacy_service_imports_reexport_core_services():
    from app.core.services.entitlement_service import EntitlementService as CoreEntitlementService
    from app.core.services.workflow_engine import WorkflowEngine as CoreWorkflowEngine
    from app.core.services.workflow_validator import validate_workflow_dsl as core_validate_workflow_dsl
    from app.services.entitlement_service import EntitlementService
    from app.services.workflow_engine import WorkflowEngine
    from app.services.workflow_validator import validate_workflow_dsl

    assert EntitlementService is CoreEntitlementService
    assert WorkflowEngine is CoreWorkflowEngine
    assert validate_workflow_dsl is core_validate_workflow_dsl


@pytest.mark.asyncio
async def test_seed_runner_smoke_with_injected_session():
    from app.seeds.runner import run_seeders

    db = AsyncMock()
    db.execute = AsyncMock()

    seeded = await run_seeders(db)

    assert seeded == ["roles", "workflow", "module_registry"]
    assert db.execute.await_count > 0


@pytest.mark.asyncio
async def test_workflow_rate_limiter_dependency_smoke():
    from app.core.rate_limiter import check_workflow_trigger_rate_limit

    pipe = AsyncMock()
    pipe.__aenter__.return_value = pipe
    pipe.__aexit__.return_value = None

    redis = MagicMock()
    redis.get = AsyncMock(side_effect=["0", "0"])
    redis.pipeline.return_value = pipe

    with patch("app.core.rate_limiter.get_redis_client", return_value=redis):
        await check_workflow_trigger_rate_limit("tenant-1")

    assert redis.get.await_count == 2
    assert pipe.incr.await_count == 2
    assert pipe.expire.await_count == 2
    pipe.execute.assert_awaited_once()

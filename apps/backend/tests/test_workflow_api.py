import uuid
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.db.models import WorkflowDefinition, WorkflowVersion, WorkflowRun, WorkflowTemplate, Tenant, User
from app.db.schemas import (
    WorkflowDefinitionCreate,
    WorkflowDefinitionUpdate,
    WorkflowVersionCreate,
    WorkflowRunCreate,
    WorkflowTemplateClone
)
from app.api.v1.routes.workflow import (
    create_workflow, get_workflows, get_workflow, update_workflow, delete_workflow,
    create_workflow_version, get_workflow_versions, trigger_workflow, clone_workflow_template
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tenant() -> Tenant:
    return Tenant(id=uuid.uuid4(), name="Test Tenant")

def _make_user(tenant_id: uuid.UUID) -> User:
    return User(id=uuid.uuid4(), tenant_id=tenant_id, is_active=True, default_role="admin")

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@patch("app.api.v1.routes.workflow.validate_workflow_dsl")
async def test_create_workflow_success(mock_validate):
    tenant = _make_tenant()
    user = _make_user(tenant.id)
    db = AsyncMock()
    
    workflow_in = WorkflowDefinitionCreate(
        name="Test Workflow",
        trigger_type="manual",
        dsl_json='{"nodes": [{"id": "n1", "type": "start"}, {"id": "n2", "type": "end"}], "edges": [{"from": "n1", "to": "n2"}]}'
    )
    
    res = await create_workflow(workflow_in, db, tenant.id, user)
    
    assert res.name == "Test Workflow"
    assert res.tenant_id == tenant.id
    db.add.assert_called()
    db.commit.assert_called_once()
    mock_validate.assert_called_once_with(workflow_in.dsl_json, db)


@pytest.mark.asyncio
async def test_get_workflow_tenant_isolation():
    tenant_a = _make_tenant()
    tenant_b = _make_tenant()
    db = AsyncMock()
    
    workflow = WorkflowDefinition(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        name="Tenant A Workflow",
        trigger_type="manual"
    )
    db.get.return_value = workflow
    
    # Same tenant -> success
    res = await get_workflow(workflow.id, db, tenant_a.id)
    assert res.name == "Tenant A Workflow"
    
    # Different tenant -> 404
    with pytest.raises(HTTPException) as exc:
        await get_workflow(workflow.id, db, tenant_b.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
@patch("app.api.v1.routes.workflow.execute_workflow_run_task")
async def test_trigger_workflow_idempotency(mock_celery_task):
    tenant = _make_tenant()
    db = AsyncMock()
    workflow_id = uuid.uuid4()
    
    workflow = WorkflowDefinition(id=workflow_id, tenant_id=tenant.id, trigger_type="manual")
    latest_version = WorkflowVersion(id=uuid.uuid4(), definition_id=workflow_id, version_number=1, dsl_json="{}")
    existing_run = WorkflowRun(id=uuid.uuid4(), tenant_id=tenant.id, trigger_event_ref="evt-123", status="completed")
    
    db.get.return_value = workflow
    
    # mock logic for versions and existing run
    mock_db_execute_version = MagicMock()
    mock_db_execute_version.scalars().first.return_value = latest_version
    
    mock_db_execute_run = MagicMock()
    mock_db_execute_run.scalars().first.return_value = existing_run
    
    db.execute.side_effect = [mock_db_execute_version, mock_db_execute_run]
    
    run_in = WorkflowRunCreate(definition_id=workflow_id, trigger_event_ref="evt-123")
    
    res = await trigger_workflow(workflow_id, run_in, db, tenant.id)
    
    assert res.id == existing_run.id
    assert res.status == "completed"
    # Idempotent return should NOT spawn a celery task or add a new run
    db.add.assert_not_called()
    mock_celery_task.delay.assert_not_called()


@pytest.mark.asyncio
@patch("app.core.services.entitlement_service.EntitlementService")
async def test_clone_workflow_template_success(mock_entitlement_service):
    tenant = _make_tenant()
    user = _make_user(tenant.id)
    db = AsyncMock()
    
    template_id = uuid.uuid4()
    template = WorkflowTemplate(
        id=template_id,
        name="Standard Approval",
        is_published=True,
        required_modules="approvals",
        required_features="",
        dsl_json='{"trigger_type": "approval_requested"}'
    )
    db.get.return_value = template
    
    mock_entitlement_service.resolve_entitlements = AsyncMock(return_value={
        "modules": ["approvals", "workflow"],
        "features": []
    })
    
    clone_in = WorkflowTemplateClone(name="My Approval Flow")
    
    res = await clone_workflow_template(template_id, clone_in, db, tenant.id, user)
    
    assert res.name == "My Approval Flow"
    assert res.trigger_type == "approval_requested"
    assert res.tenant_id == tenant.id
    db.commit.assert_called_once()


@pytest.mark.asyncio
@patch("app.core.services.entitlement_service.EntitlementService")
async def test_clone_workflow_template_missing_module(mock_entitlement_service):
    tenant = _make_tenant()
    user = _make_user(tenant.id)
    db = AsyncMock()
    
    template = WorkflowTemplate(
        id=uuid.uuid4(),
        name="Finance Flow",
        is_published=True,
        required_modules="finance",
        dsl_json="{}"
    )
    db.get.return_value = template
    
    mock_entitlement_service.resolve_entitlements = AsyncMock(return_value={
        "modules": ["workflow"],
        "features": []
    })
    
    clone_in = WorkflowTemplateClone()
    
    with pytest.raises(HTTPException) as exc:
        await clone_workflow_template(template.id, clone_in, db, tenant.id, user)
        
    assert exc.value.status_code == 403
    assert "requires module: finance" in exc.value.detail

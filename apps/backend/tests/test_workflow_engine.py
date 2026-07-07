import json
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.db.models import WorkflowRun, WorkflowVersion, WorkflowRunNode
from app.services.workflow_engine import WorkflowEngine

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_action_service():
    service = AsyncMock()
    # Mocking dispatch to always return success payload
    service.dispatch_action.return_value = {"status": "success", "mocked": True}
    return service

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.query = MagicMock()
    return db

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_workflow_engine_execution_success(mock_db, mock_action_service):
    """Test successful idempotent DAG execution"""
    engine = WorkflowEngine(mock_db, mock_action_service)
    
    tenant_id = uuid.uuid4()
    run_id = uuid.uuid4()
    version_id = uuid.uuid4()
    
    run = WorkflowRun(
        id=run_id,
        tenant_id=tenant_id,
        definition_id=uuid.uuid4(),
        version_id=version_id,
        status="pending",
        trigger_payload='{"foo": "bar"}'
    )
    
    dsl = {
        "nodes": [
            {"id": "node-1", "type": "start"},
            {"id": "node-2", "type": "action", "action_type": "notify", "config": {}},
            {"id": "node-3", "type": "end"}
        ],
        "edges": [
            {"from": "node-1", "to": "node-2"},
            {"from": "node-2", "to": "node-3"}
        ]
    }
    version = WorkflowVersion(
        id=version_id,
        definition_id=run.definition_id,
        version_number=1,
        dsl_json=json.dumps(dsl),
        published_by=uuid.uuid4()
    )
    
    async def db_get(model, pk):
        if model == WorkflowRun and pk == run_id:
            return run
        if model == WorkflowVersion and pk == version_id:
            return version
        return None
    mock_db.get = AsyncMock(side_effect=db_get)
    
    # Node hasn't run before
    mock_db_execute = MagicMock()
    mock_db_execute.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_db_execute
    
    result = await engine.execute_run(run_id)
    
    assert result is True
    assert run.status == "completed"
    mock_action_service.dispatch_action.assert_called_once()


@pytest.mark.asyncio
async def test_workflow_engine_already_completed(mock_db, mock_action_service):
    """Test run skipping if already completed"""
    engine = WorkflowEngine(mock_db, mock_action_service)
    run_id = uuid.uuid4()
    run = WorkflowRun(
        id=run_id, tenant_id=uuid.uuid4(), definition_id=uuid.uuid4(),
        version_id=uuid.uuid4(), status="completed"
    )
    mock_db.get.return_value = run
    
    result = await engine.execute_run(run_id)
    
    assert result is True
    mock_action_service.dispatch_action.assert_not_called()


@pytest.mark.asyncio
async def test_workflow_engine_idempotency_skip_completed_node(mock_db, mock_action_service):
    """Test that a completed node is skipped on subsequent runs"""
    engine = WorkflowEngine(mock_db, mock_action_service)
    
    tenant_id = uuid.uuid4()
    run_id = uuid.uuid4()
    version_id = uuid.uuid4()
    
    run = WorkflowRun(
        id=run_id, tenant_id=tenant_id, definition_id=uuid.uuid4(),
        version_id=version_id, status="running", trigger_payload='{}'
    )
    
    dsl = {
        "nodes": [
            {"id": "node-1", "type": "start"},
            {"id": "node-2", "type": "action", "action_type": "notify", "config": {}},
        ],
        "edges": [{"from": "node-1", "to": "node-2"}]
    }
    version = WorkflowVersion(
        id=version_id, definition_id=run.definition_id, version_number=1,
        dsl_json=json.dumps(dsl), published_by=uuid.uuid4()
    )
    
    async def db_get(model, pk):
        if model == WorkflowRun and pk == run_id: return run
        if model == WorkflowVersion and pk == version_id: return version
        return None
    mock_db.get = AsyncMock(side_effect=db_get)
    
    # Simulate that node-1 and node-2 are already completed in DB
    existing_node = WorkflowRunNode(id=uuid.uuid4(), run_id=run_id, node_id="node-2", node_type="action", status="completed")
    mock_db_execute = MagicMock()
    mock_db_execute.scalars.return_value.first.return_value = existing_node
    mock_db.execute.return_value = mock_db_execute
    
    result = await engine.execute_run(run_id)
    
    assert result is True
    # since node is already completed, dispatch should not be called
    mock_action_service.dispatch_action.assert_not_called()


@pytest.mark.asyncio
async def test_workflow_engine_action_failure_fails_run(mock_db, mock_action_service):
    """Test if an action fails, the run stops and is marked as failed."""
    mock_action_service.dispatch_action.side_effect = PermissionError("Feature not enabled")
    engine = WorkflowEngine(mock_db, mock_action_service)
    
    tenant_id = uuid.uuid4()
    run_id = uuid.uuid4()
    version_id = uuid.uuid4()
    
    run = WorkflowRun(
        id=run_id, tenant_id=tenant_id, definition_id=uuid.uuid4(),
        version_id=version_id, status="pending", trigger_payload='{}'
    )
    dsl = {
        "nodes": [
            {"id": "node-1", "type": "start"},
            {"id": "node-2", "type": "action", "action_type": "restricted_action", "config": {}},
        ],
        "edges": [{"from": "node-1", "to": "node-2"}]
    }
    version = WorkflowVersion(
        id=version_id, definition_id=run.definition_id, version_number=1,
        dsl_json=json.dumps(dsl), published_by=uuid.uuid4()
    )
    
    async def db_get(model, pk):
        if model == WorkflowRun and pk == run_id: return run
        if model == WorkflowVersion and pk == version_id: return version
        return None
    mock_db.get = AsyncMock(side_effect=db_get)
    
    mock_db_execute = MagicMock()
    mock_db_execute.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_db_execute
    
    result = await engine.execute_run(run_id)
    
    assert result is False
    assert run.status == "failed"
    assert "Feature not enabled" in run.error_message


# ---------------------------------------------------------------------------
# evaluate_condition unit tests
# ---------------------------------------------------------------------------

from app.services.workflow_engine import evaluate_condition, _resolve_field


def test_resolve_field_simple():
    assert _resolve_field({"amount": 200}, "amount") == 200


def test_resolve_field_dot_notation():
    data = {"payload": {"amount": 500}}
    assert _resolve_field(data, "payload.amount") == 500


def test_resolve_field_missing():
    assert _resolve_field({}, "missing.key") is None


def test_evaluate_condition_equals_true():
    node = {"config": {"field": "status", "operator": "equals", "value": "approved"}}
    assert evaluate_condition(node, {"status": "approved"}) is True


def test_evaluate_condition_equals_false():
    node = {"config": {"field": "status", "operator": "equals", "value": "approved"}}
    assert evaluate_condition(node, {"status": "pending"}) is False


def test_evaluate_condition_not_equals():
    node = {"config": {"field": "status", "operator": "not_equals", "value": "cancelled"}}
    assert evaluate_condition(node, {"status": "approved"}) is True


def test_evaluate_condition_greater_than():
    node = {"config": {"field": "amount", "operator": "greater_than", "value": "100"}}
    assert evaluate_condition(node, {"amount": 200}) is True
    assert evaluate_condition(node, {"amount": 50}) is False


def test_evaluate_condition_less_than():
    node = {"config": {"field": "amount", "operator": "less_than", "value": "100"}}
    assert evaluate_condition(node, {"amount": 50}) is True
    assert evaluate_condition(node, {"amount": 200}) is False


def test_evaluate_condition_contains():
    node = {"config": {"field": "name", "operator": "contains", "value": "test"}}
    assert evaluate_condition(node, {"name": "testing"}) is True
    assert evaluate_condition(node, {"name": "production"}) is False


def test_evaluate_condition_exists_true():
    node = {"config": {"field": "email", "operator": "exists", "value": ""}}
    assert evaluate_condition(node, {"email": "user@example.com"}) is True


def test_evaluate_condition_exists_false():
    node = {"config": {"field": "email", "operator": "exists", "value": ""}}
    assert evaluate_condition(node, {}) is False


def test_evaluate_condition_no_field_defaults_true():
    node = {"config": {"operator": "equals", "value": "x"}}
    assert evaluate_condition(node, {}) is True

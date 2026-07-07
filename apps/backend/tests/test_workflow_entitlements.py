import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.workers.tasks import execute_workflow_run_task
from app.db.models import WorkflowRun

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@patch("app.services.workflow_engine.WorkflowEngine")
@patch("app.services.workflow_action_service.WorkflowActionService")
@patch("app.services.entitlement_service.EntitlementService")
@patch("app.db.models.TenantUsageMeter")
@patch("app.core.workers.tasks.AsyncSessionLocal")
def test_execute_workflow_run_task_meters_usage(
    mock_session_local,
    mock_usage_meter,
    mock_ent_svc,
    mock_action_svc,
    mock_engine
):
    """Test that a successful workflow run increments the workflow_runs quota."""
    
    tenant_id = uuid.uuid4()
    run_id = uuid.uuid4()
    
    run = WorkflowRun(
        id=run_id,
        tenant_id=tenant_id,
        definition_id=uuid.uuid4(),
        version_id=uuid.uuid4(),
        status="pending"
    )
    
    # Mock session
    mock_session = AsyncMock()
    mock_session.get.return_value = run
    mock_session_local.return_value.__aenter__.return_value = mock_session
    
    # Mock engine success
    mock_engine_instance = mock_engine.return_value
    mock_engine_instance.execute_run = AsyncMock(return_value=True)
    
    # Mock usage meter
    mock_meter_instance = mock_usage_meter.return_value
    mock_meter_instance.record_usage = AsyncMock()
    
    # We call the task. Since it uses asyncio.run internally, we run it as a regular sync function.
    from app.core.workers.tasks import execute_workflow_run_task
    res = execute_workflow_run_task(str(run_id))
    
    assert res["status"] == "completed"
    
    # Verify usage meter was called with correct quota code and event ref
    mock_meter_instance.record_usage.assert_called_once_with(
        tenant_id=tenant_id,
        quota_code="workflow_runs",
        increment_by=1,
        event_ref=str(run_id)
    )
    mock_session.commit.assert_called()

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.routes.workflow import simulate_workflow
from app.core.services.workflow_simulator import WorkflowSimulator
from app.db.models import WorkflowDefinition, WorkflowVersion
from app.db.schemas import WorkflowSimulationRequest


def _linear_dsl() -> str:
    return json.dumps({
        "nodes": [
            {"id": "start", "type": "start"},
            {"id": "notify", "type": "action", "action_type": "notify", "config": {"title": "Test"}},
            {"id": "end", "type": "end"},
        ],
        "edges": [
            {"from": "start", "to": "notify"},
            {"from": "notify", "to": "end"},
        ],
    })


def _condition_dsl() -> str:
    return json.dumps({
        "nodes": [
            {"id": "start", "type": "start"},
            {"id": "check", "type": "condition", "config": {"field": "amount", "operator": "greater_than", "value": 100}},
            {"id": "high", "type": "action", "action_type": "notify", "config": {}},
            {"id": "low", "type": "action", "action_type": "notify", "config": {}},
            {"id": "end", "type": "end"},
        ],
        "edges": [
            {"from": "start", "to": "check"},
            {"from": "check", "to": "high", "sourceHandle": "true"},
            {"from": "check", "to": "low", "sourceHandle": "false"},
            {"from": "high", "to": "end"},
            {"from": "low", "to": "end"},
        ],
    })


def test_successful_linear_simulation():
    result = WorkflowSimulator().simulate(_linear_dsl(), {"source": "test"})

    assert result["status"] == "completed"
    assert [item["node_id"] for item in result["trace"]] == ["start", "notify", "end"]
    assert result["trace"][1]["output"]["status"] == "simulated"
    assert result["trace"][1]["simulated"] is True


def test_condition_true_branch_simulation():
    result = WorkflowSimulator().simulate(_condition_dsl(), {"amount": 250})

    assert [item["node_id"] for item in result["trace"]] == ["start", "check", "high", "end"]
    assert result["trace"][1]["branch_decision"] is True


def test_condition_false_branch_simulation():
    result = WorkflowSimulator().simulate(_condition_dsl(), {"amount": 50})

    assert [item["node_id"] for item in result["trace"]] == ["start", "check", "low", "end"]
    assert result["trace"][1]["branch_decision"] is False


@pytest.mark.asyncio
@patch("app.api.v1.routes.workflow.validate_workflow_dsl")
async def test_invalid_dsl_simulation_400(mock_validate):
    workflow_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    db = AsyncMock()
    db.get.return_value = WorkflowDefinition(id=workflow_id, tenant_id=tenant_id, name="WF", trigger_type="manual")
    mock_validate.side_effect = HTTPException(status_code=400, detail="DSL is not valid JSON.")

    with pytest.raises(HTTPException) as exc:
        await simulate_workflow(
            workflow_id,
            WorkflowSimulationRequest(dsl_json="not-json", payload={}),
            db,
            tenant_id,
        )

    assert exc.value.status_code == 400


@pytest.mark.asyncio
@patch("app.api.v1.routes.workflow.execute_workflow_run_task")
@patch("app.api.v1.routes.workflow.validate_workflow_dsl", new_callable=AsyncMock)
async def test_simulation_does_not_dispatch_actions_or_mutate_quota(mock_validate, mock_task):
    workflow_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    version_id = uuid.uuid4()
    db = AsyncMock()
    db.get.side_effect = [
        WorkflowDefinition(id=workflow_id, tenant_id=tenant_id, name="WF", trigger_type="manual"),
        WorkflowVersion(id=version_id, definition_id=workflow_id, version_number=1, dsl_json=_linear_dsl(), published_by=uuid.uuid4()),
    ]

    res = await simulate_workflow(
        workflow_id,
        WorkflowSimulationRequest(version_id=version_id, payload={"source": "dry-run"}),
        db,
        tenant_id,
    )

    assert res["status"] == "completed"
    assert res["version_id"] == version_id
    db.add.assert_not_called()
    db.commit.assert_not_called()
    db.flush.assert_not_called()
    mock_task.delay.assert_not_called()


@pytest.mark.asyncio
async def test_simulation_tenant_isolation():
    workflow_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    db = AsyncMock()
    db.get.return_value = WorkflowDefinition(id=workflow_id, tenant_id=uuid.uuid4(), name="WF", trigger_type="manual")

    with pytest.raises(HTTPException) as exc:
        await simulate_workflow(
            workflow_id,
            WorkflowSimulationRequest(dsl_json=_linear_dsl(), payload={}),
            db,
            tenant_id,
        )

    assert exc.value.status_code == 404

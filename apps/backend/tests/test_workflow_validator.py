import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from app.services.workflow_validator import validate_workflow_dsl

# Set all tests in this module to run with asyncio
pytestmark = pytest.mark.asyncio

async def test_validate_dsl_invalid_json():
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await validate_workflow_dsl("not json", db)
    assert exc.value.status_code == 400
    assert "not valid JSON" in exc.value.detail


async def test_validate_dsl_missing_start_node():
    db = AsyncMock()
    dsl = {
        "nodes": [{"id": "n1", "type": "action", "action_type": "notify"}],
        "edges": []
    }
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [MagicMock(action_type="notify")]
    db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "must contain a 'start' node" in exc.value.detail


async def test_validate_dsl_cycle_detection():
    db = AsyncMock()
    dsl = {
        "nodes": [
            {"id": "n1", "type": "start"},
            {"id": "n2", "type": "action", "action_type": "notify"},
            {"id": "n3", "type": "end"}
        ],
        "edges": [
            {"from": "n1", "to": "n2"},
            {"from": "n2", "to": "n3"},
            {"from": "n3", "to": "n2"} # cycle here
        ]
    }
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [MagicMock(action_type="notify")]
    db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "Cycle detected" in exc.value.detail


async def test_validate_dsl_orphan_node():
    db = AsyncMock()
    dsl = {
        "nodes": [
            {"id": "n1", "type": "start"},
            {"id": "n2", "type": "end"},
            {"id": "n3", "type": "action", "action_type": "notify"} # orphan
        ],
        "edges": [
            {"from": "n1", "to": "n2"}
        ]
    }
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [MagicMock(action_type="notify")]
    db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "orphan" in exc.value.detail


async def test_validate_dsl_invalid_action():
    db = AsyncMock()
    dsl = {
        "nodes": [
            {"id": "n1", "type": "start"},
            {"id": "n2", "type": "action", "action_type": "hacker_script"},
            {"id": "n3", "type": "end"}
        ],
        "edges": [
            {"from": "n1", "to": "n2"},
            {"from": "n2", "to": "n3"}
        ]
    }
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "not registered or active" in exc.value.detail


async def test_validate_dsl_success():
    db = AsyncMock()
    dsl = {
        "nodes": [
            {"id": "n1", "type": "start"},
            {"id": "n2", "type": "action", "action_type": "notify"},
            {"id": "n3", "type": "end"}
        ],
        "edges": [
            {"from": "n1", "to": "n2"},
            {"from": "n2", "to": "n3"}
        ]
    }
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [MagicMock(action_type="notify")]
    db.execute.return_value = mock_result
    
    # Should not raise
    await validate_workflow_dsl(json.dumps(dsl), db)

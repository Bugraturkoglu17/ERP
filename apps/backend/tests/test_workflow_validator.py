import json
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

from app.services.workflow_validator import validate_workflow_dsl

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_validate_dsl_invalid_json():
    db = MagicMock()
    with pytest.raises(HTTPException) as exc:
        validate_workflow_dsl("not json", db)
    assert exc.value.status_code == 400
    assert "not valid JSON" in exc.value.detail


def test_validate_dsl_missing_start_node():
    db = MagicMock()
    dsl = {
        "nodes": [{"id": "n1", "type": "action", "action_type": "notify"}],
        "edges": []
    }
    # Mock active actions
    db.exec.return_value.all.return_value = [MagicMock(action_type="notify")]
    
    with pytest.raises(HTTPException) as exc:
        validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "must contain a 'start' node" in exc.value.detail


def test_validate_dsl_cycle_detection():
    db = MagicMock()
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
    db.exec.return_value.all.return_value = [MagicMock(action_type="notify")]
    
    with pytest.raises(HTTPException) as exc:
        validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "Cycle detected" in exc.value.detail


def test_validate_dsl_orphan_node():
    db = MagicMock()
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
    db.exec.return_value.all.return_value = [MagicMock(action_type="notify")]
    
    with pytest.raises(HTTPException) as exc:
        validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "orphan" in exc.value.detail


def test_validate_dsl_invalid_action():
    db = MagicMock()
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
    # No active actions in DB mock
    db.exec.return_value.all.return_value = []
    
    with pytest.raises(HTTPException) as exc:
        validate_workflow_dsl(json.dumps(dsl), db)
    assert exc.value.status_code == 400
    assert "not registered or active" in exc.value.detail

def test_validate_dsl_success():
    db = MagicMock()
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
    db.exec.return_value.all.return_value = [MagicMock(action_type="notify")]
    
    # Should not raise
    validate_workflow_dsl(json.dumps(dsl), db)

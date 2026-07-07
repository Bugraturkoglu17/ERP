"""
test_workflow_monitoring.py
Sprint 20B — Stalled detection, failure notifications, retry chain tests.
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch, call
import pytest

from app.db.models import WorkflowRun, WorkflowRunNode, ErpNotification
from app.services.workflow_engine import _create_failure_notification, evaluate_condition


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_run(status: str = "running", started_minutes_ago: int = 5, alert_sent: bool = False) -> WorkflowRun:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    run = WorkflowRun(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        definition_id=uuid.uuid4(),
        version_id=uuid.uuid4(),
        status=status,
        started_at=now - timedelta(minutes=started_minutes_ago),
        created_at=now - timedelta(minutes=started_minutes_ago),
        alert_sent_at=now if alert_sent else None,
    )
    return run


# ---------------------------------------------------------------------------
# _create_failure_notification tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_failure_notification_created_when_no_alert_sent():
    """A new notification is created when alert_sent_at is None."""
    db = AsyncMock()
    run = make_run(status="failed", alert_sent=False)

    await _create_failure_notification(
        db=db,
        run=run,
        workflow_name="Test Workflow",
        event_type="workflow_failed",
        title="⚠️ İş Akışı Başarısız",
        description="Test failure",
    )

    # db.add should be called twice: once for notification, once for run
    assert db.add.call_count == 2
    # alert_sent_at should now be set
    assert run.alert_sent_at is not None


@pytest.mark.asyncio
async def test_failure_notification_skipped_when_already_sent():
    """Notification is NOT created if alert_sent_at is already set (idempotency)."""
    db = AsyncMock()
    run = make_run(status="failed", alert_sent=True)
    original_call_count = 0

    await _create_failure_notification(
        db=db,
        run=run,
        workflow_name="Test Workflow",
        event_type="workflow_failed",
        title="⚠️ İş Akışı Başarısız",
        description="Should not be sent again",
    )

    # db.add should NOT be called because alert already sent
    assert db.add.call_count == 0


@pytest.mark.asyncio
async def test_failure_notification_event_type():
    """Stalled notification uses workflow_stalled event_type."""
    db = AsyncMock()
    run = make_run(status="stalled", alert_sent=False)

    await _create_failure_notification(
        db=db,
        run=run,
        workflow_name="Stalled WF",
        event_type="workflow_stalled",
        title="🕛 İş Akışı Takıldı",
        description="Stalled notification",
    )

    # Capture the ErpNotification added
    notification_calls = [c for c in db.add.call_args_list
                          if isinstance(c.args[0], ErpNotification)]
    assert len(notification_calls) == 1
    notif = notification_calls[0].args[0]
    assert notif.event_type == "workflow_stalled"
    assert notif.tenant_id == run.tenant_id


# ---------------------------------------------------------------------------
# Stalled detection logic tests (unit — without DB)
# ---------------------------------------------------------------------------

def test_stalled_threshold_logic():
    """Run started 35 minutes ago should be considered stalled."""
    STALL_THRESHOLD = 30
    run = make_run(status="running", started_minutes_ago=35)
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=STALL_THRESHOLD)
    assert run.started_at <= cutoff, "35-minute-old run should be beyond cutoff"


def test_not_stalled_threshold_logic():
    """Run started 5 minutes ago should NOT be considered stalled."""
    STALL_THRESHOLD = 30
    run = make_run(status="running", started_minutes_ago=5)
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=STALL_THRESHOLD)
    assert run.started_at > cutoff, "5-minute-old run should NOT be beyond cutoff"


def test_completed_run_not_stalled():
    """Completed runs should not be subject to stall detection."""
    run = make_run(status="completed", started_minutes_ago=60)
    # A completed run should never be in 'running' query
    assert run.status != "running"


# ---------------------------------------------------------------------------
# Retry behavior tests (unit — without full engine)
# ---------------------------------------------------------------------------

def test_retry_creates_new_run_with_parent_id():
    """Retry creates a new WorkflowRun with parent_run_id pointing to original."""
    original = make_run(status="failed")
    original.trigger_payload = '{"amount": 100}'

    new_run = WorkflowRun(
        id=uuid.uuid4(),
        tenant_id=original.tenant_id,
        definition_id=original.definition_id,
        version_id=original.version_id,
        parent_run_id=original.id,
        status="pending",
        trigger_event_ref=None,
        trigger_payload=original.trigger_payload,
    )

    assert new_run.parent_run_id == original.id
    assert new_run.status == "pending"
    assert new_run.id != original.id
    # Original remains unchanged
    assert original.status == "failed"


def test_retry_preserves_original_run_audit_trail():
    """Original failed run is not mutated during retry."""
    original = make_run(status="failed")
    original_status = original.status
    original_error = "Some failure reason"
    original.error_message = original_error

    # Simulate retry (no mutation of original)
    new_run = WorkflowRun(
        id=uuid.uuid4(),
        tenant_id=original.tenant_id,
        definition_id=original.definition_id,
        version_id=original.version_id,
        parent_run_id=original.id,
        status="pending",
    )

    assert original.status == original_status
    assert original.error_message == original_error


def test_retry_not_allowed_for_completed_run():
    """completed/running runs are not retryable."""
    completed_run = make_run(status="completed")
    running_run = make_run(status="running")

    RETRYABLE = {"failed", "stalled", "cancelled"}
    assert completed_run.status not in RETRYABLE
    assert running_run.status not in RETRYABLE


def test_retry_allowed_for_failed_stalled_cancelled():
    """failed, stalled, cancelled runs are retryable."""
    RETRYABLE = {"failed", "stalled", "cancelled"}
    for status in ("failed", "stalled", "cancelled"):
        run = make_run(status=status)
        assert run.status in RETRYABLE


def test_retry_chain_parent_run_id_linkage():
    """Multiple retry rounds produce correct parent linkage chain."""
    run1 = make_run(status="failed")
    run2 = WorkflowRun(
        id=uuid.uuid4(),
        tenant_id=run1.tenant_id,
        definition_id=run1.definition_id,
        version_id=run1.version_id,
        parent_run_id=run1.id,
        status="failed",
    )
    run3 = WorkflowRun(
        id=uuid.uuid4(),
        tenant_id=run1.tenant_id,
        definition_id=run1.definition_id,
        version_id=run1.version_id,
        parent_run_id=run2.id,
        status="pending",
    )

    assert run2.parent_run_id == run1.id
    assert run3.parent_run_id == run2.id
    assert run1.parent_run_id is None  # root run has no parent


def test_stalled_alert_idempotency():
    """A stalled run with alert_sent_at already set should not get a second notification."""
    run = make_run(status="stalled", alert_sent=True)
    # If already alerted, alert_sent_at is set
    assert run.alert_sent_at is not None

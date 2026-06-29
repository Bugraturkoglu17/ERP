import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

# Helpers
def _make_user(tenant_id: uuid.UUID | None = None, role: str = "admin") -> MagicMock:
    user = MagicMock()
    user.id = uuid.uuid4()
    user.tenant_id = tenant_id or uuid.uuid4()
    user.default_role = role
    user.is_active = True
    user.discipline_only = False
    user.discipline = None
    return user


def _make_project(tenant_id: uuid.UUID) -> MagicMock:
    project = MagicMock()
    project.id = uuid.uuid4()
    project.tenant_id = tenant_id
    return project


# ═══════════════════════════════════════════════════════════════════════════════
# Unit Tests for new verification helpers in permissions.py
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_verify_approval_tenant():
    from app.core.permissions import verify_approval_tenant
    from app.db.models import StoreApprovalRequest

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a)
    user_b = _make_user(tenant_id=tenant_b)
    platform_admin = _make_user(tenant_id=None, role="platform_admin")

    approval = StoreApprovalRequest(
        id=uuid.uuid4(),
        tenant_id=tenant_a,
        project_id=uuid.uuid4(),
        title="Approval A",
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = approval
    db.execute.return_value = mock_res

    # Same tenant -> allowed
    res = await verify_approval_tenant(db, approval.id, user_a)
    assert res == approval

    # Platform admin -> allowed
    res = await verify_approval_tenant(db, approval.id, platform_admin)
    assert res == approval

    # Different tenant -> 403
    with pytest.raises(HTTPException) as exc:
        await verify_approval_tenant(db, approval.id, user_b)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_service_form_tenant():
    from app.core.permissions import verify_service_form_tenant
    from app.db.models import StoreServiceForm

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a)
    user_b = _make_user(tenant_id=tenant_b)

    form = StoreServiceForm(
        id=uuid.uuid4(),
        tenant_id=tenant_a,
        project_id=uuid.uuid4(),
        year=2026,
        month=6,
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = form
    db.execute.return_value = mock_res

    # Same tenant -> allowed
    res = await verify_service_form_tenant(db, form.id, user_a)
    assert res == form

    # Different tenant -> 403
    with pytest.raises(HTTPException) as exc:
        await verify_service_form_tenant(db, form.id, user_b)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_invoice_tenant():
    from app.core.permissions import verify_invoice_tenant
    from app.db.models import StoreInvoiceRecord

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a)
    user_b = _make_user(tenant_id=tenant_b)

    inv = StoreInvoiceRecord(
        id=uuid.uuid4(),
        tenant_id=tenant_a,
        project_id=uuid.uuid4(),
        invoice_type="ara_fatura",
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = inv
    db.execute.return_value = mock_res

    # Same tenant -> allowed
    res = await verify_invoice_tenant(db, inv.id, user_a)
    assert res == inv

    # Different tenant -> 403
    with pytest.raises(HTTPException) as exc:
        await verify_invoice_tenant(db, inv.id, user_b)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_payment_tenant():
    from app.core.permissions import verify_payment_tenant
    from app.db.models import StoreProgressPayment

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a)
    user_b = _make_user(tenant_id=tenant_b)

    payment = StoreProgressPayment(
        id=uuid.uuid4(),
        tenant_id=tenant_a,
        project_id=uuid.uuid4(),
        payment_type="bakim",
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = payment
    db.execute.return_value = mock_res

    # Same tenant -> allowed
    res = await verify_payment_tenant(db, payment.id, user_a)
    assert res == payment

    # Different tenant -> 403
    with pytest.raises(HTTPException) as exc:
        await verify_payment_tenant(db, payment.id, user_b)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_process_tenant():
    from app.core.permissions import verify_process_tenant
    from app.db.models import StoreProcess

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a)
    user_b = _make_user(tenant_id=tenant_b)

    proc = StoreProcess(
        id=uuid.uuid4(),
        tenant_id=tenant_a,
        project_id=uuid.uuid4(),
        work_type="tadilat",
        title="Tadilat A",
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = proc
    db.execute.return_value = mock_res

    # Same tenant -> allowed
    res = await verify_process_tenant(db, proc.id, user_a)
    assert res == proc

    # Different tenant -> 403
    with pytest.raises(HTTPException) as exc:
        await verify_process_tenant(db, proc.id, user_b)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_work_order_tenant():
    from app.core.permissions import verify_work_order_tenant
    from app.db.models import WorkOrder, WorkOrderType

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a)
    user_b = _make_user(tenant_id=tenant_b)

    wo = WorkOrder(
        id=uuid.uuid4(),
        tenant_id=tenant_a,
        project_id=uuid.uuid4(),
        work_type=WorkOrderType.MAINTENANCE,
        title="Work Order A",
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = wo
    db.execute.return_value = mock_res

    # Same tenant -> allowed
    res = await verify_work_order_tenant(db, wo.id, user_a)
    assert res == wo

    # Different tenant -> 403
    with pytest.raises(HTTPException) as exc:
        await verify_work_order_tenant(db, wo.id, user_b)
    assert exc.value.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# WhatsApp webhook/test-template authentication & tenant isolation checks
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_whatsapp_test_template_tenant_check():
    from app.api.v1.routes.whatsapp import test_template, TestTemplateRequest

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    user_a = _make_user(tenant_id=tenant_a, role="admin")
    user_b = _make_user(tenant_id=tenant_b, role="admin")

    req_payload = TestTemplateRequest(
        tenant_id=tenant_a,
        phone_number="5551234567",
        technician_name="John Doe",
        project_name="Project X",
    )

    db = AsyncMock()

    # Same tenant -> allowed and enqueues task
    with patch("app.api.v1.routes.whatsapp.send_whatsapp_message_task") as mock_task:
        res = await test_template(req_payload, db, user_a)
        assert res["status"] == "queued"
        mock_task.delay.assert_called_once()

    # Different tenant -> 403 Forbidden
    with pytest.raises(HTTPException) as exc:
        await test_template(req_payload, db, user_b)
    assert exc.value.status_code == 403

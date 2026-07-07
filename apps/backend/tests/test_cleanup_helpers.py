import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from datetime import datetime

from app.core.utils.helpers import utc_now
from app.core.services.user_service import UserService
from app.core.services.activity_logger import ActivityLoggerService
from app.core.security.validators import (
    has_admin_role,
    tenant_mismatch,
    require_tenant_user,
    same_tenant
)
from app.db.models import User

@pytest.mark.asyncio
async def test_utc_now():
    now = utc_now()
    assert isinstance(now, datetime)
    assert now.tzinfo is None  # Verify tzinfo is stripped

@pytest.mark.asyncio
async def test_user_service_get_tenant_admin_emails():
    db = AsyncMock()
    tenant_id = uuid4()
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = ["admin@golabs.local"]
    db.execute = AsyncMock(return_value=mock_result)
    
    emails = await UserService.get_tenant_admin_emails(db, tenant_id)
    assert emails == ["admin@golabs.local"]

@pytest.mark.asyncio
async def test_activity_logger_service():
    db = AsyncMock()
    db.add = MagicMock()
    project_id = uuid4()
    tenant_id = uuid4()
    user = User(id=uuid4(), email="user@golabs.local", full_name="John Doe")
    
    activity = await ActivityLoggerService.log_activity(
        db=db,
        project_id=project_id,
        tenant_id=tenant_id,
        user=user,
        activity_type="test_action",
        title="Test Title",
        description="Test Desc"
    )
    
    assert activity.project_id == project_id
    assert activity.tenant_id == tenant_id
    assert activity.user_id == user.id
    assert activity.user_name == "John Doe"
    assert activity.activity_type == "test_action"
    assert activity.title == "Test Title"
    assert activity.description == "Test Desc"
    db.add.assert_called_once()

def test_validators_has_admin_role():
    u_admin = User(default_role="admin")
    u_tech = User(default_role="technician")
    assert has_admin_role(u_admin) is True
    assert has_admin_role(u_tech) is False

def test_validators_tenant_mismatch():
    t_id1 = uuid4()
    t_id2 = uuid4()
    u_platform = User(default_role="platform_admin", tenant_id=t_id1)
    u_tenant = User(default_role="technician", tenant_id=t_id1)
    
    # Platform admin never mismatches
    assert tenant_mismatch(u_platform, t_id2) is False
    
    # Regular tenant mismatches if different
    assert tenant_mismatch(u_tenant, t_id2) is True
    assert tenant_mismatch(u_tenant, t_id1) is False

def test_validators_require_tenant_user():
    u_none = User(tenant_id=None)
    u_valid = User(tenant_id=uuid4())
    u_platform = User(default_role="platform_admin", tenant_id=None)
    
    # Platform admin allowed even if None tenant
    require_tenant_user(u_platform)
    
    # Valid tenant user allowed
    require_tenant_user(u_valid)
    
    # Regular user with None tenant raises 403
    with pytest.raises(HTTPException) as exc:
        require_tenant_user(u_none)
    assert exc.value.status_code == 403

def test_validators_same_tenant():
    t_id = uuid4()
    u = User(tenant_id=t_id)
    assert same_tenant(u, t_id) is True
    assert same_tenant(u, uuid4()) is False

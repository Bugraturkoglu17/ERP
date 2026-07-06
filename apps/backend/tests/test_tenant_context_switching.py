import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status

from app.core.dependencies import get_current_tenant_id, require_role
from app.db.models import User, PlatformContextSession, Tenant
from app.services.context_service import create_context_token
from app.api.v1.routes.platform import (
    start_context,
    renew_context,
    revoke_context,
    get_support_analytics,
    ContextStartRequest
)

class MockRequest:
    def __init__(self, headers: dict):
        self.headers = headers


@pytest.mark.asyncio
async def test_get_current_tenant_id_platform_admin_no_context():
    """Context header'ı yokken platform admin'in tenant_id'si None dönmeli."""
    mock_user = User(
        id=uuid.uuid4(),
        email="platform.admin@golabstek.com",
        default_role="platform_admin",
        tenant_id=None,
        is_active=True
    )
    request = MockRequest(headers={})
    
    with patch("app.core.dependencies.decode_token") as mock_decode, \
         patch("app.core.dependencies._get_user_by_sub") as mock_get_user:
        
        mock_decode.return_value = {"sub": str(mock_user.id), "roles": ["platform_admin"]}
        mock_get_user.return_value = mock_user
        
        db = AsyncMock()
        res = await get_current_tenant_id(request, token="token", db=db)
        assert res is None


@pytest.mark.asyncio
async def test_get_current_tenant_id_platform_admin_with_context():
    """Geçerli ve aktif context session varken platform admin'in tenant_id'si bağlamdaki tenant_id dönmeli."""
    mock_user = User(
        id=uuid.uuid4(),
        email="platform.admin@golabstek.com",
        default_role="platform_admin",
        tenant_id=None,
        is_active=True
    )
    target_tenant_id = uuid.uuid4()
    context_id = uuid.uuid4()
    
    context_token = create_context_token(
        actor_user_id=str(mock_user.id),
        tenant_id=str(target_tenant_id),
        mode="read_only",
        context_id=str(context_id)
    )
    
    request = MockRequest(headers={"X-Tenant-Context": context_token})
    
    # Mock PlatformContextSession query
    mock_session = PlatformContextSession(
        id=context_id,
        platform_admin_id=mock_user.id,
        tenant_id=target_tenant_id,
        tenant_name="Migros A.Ş.",
        mode="read_only",
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=30)
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    
    db = AsyncMock()
    db.execute.return_value = mock_result
    
    with patch("app.core.dependencies.decode_token") as mock_decode, \
         patch("app.core.dependencies._get_user_by_sub") as mock_get_user:
        
        mock_decode.return_value = {"sub": str(mock_user.id), "roles": ["platform_admin"]}
        mock_get_user.return_value = mock_user
        
        res = await get_current_tenant_id(request, token="token", db=db)
        assert res == target_tenant_id


@pytest.mark.asyncio
async def test_get_current_tenant_id_platform_admin_revoked():
    """PlatformContextSession iptal edilmişse (revoked) platform admin işlemi reddedilmeli (403)."""
    mock_user = User(
        id=uuid.uuid4(),
        email="platform.admin@golabstek.com",
        default_role="platform_admin",
        tenant_id=None,
        is_active=True
    )
    target_tenant_id = uuid.uuid4()
    context_id = uuid.uuid4()
    
    context_token = create_context_token(
        actor_user_id=str(mock_user.id),
        tenant_id=str(target_tenant_id),
        mode="read_only",
        context_id=str(context_id)
    )
    
    request = MockRequest(headers={"X-Tenant-Context": context_token})
    
    # Mock revoked session
    mock_session = PlatformContextSession(
        id=context_id,
        platform_admin_id=mock_user.id,
        tenant_id=target_tenant_id,
        tenant_name="Migros A.Ş.",
        mode="read_only",
        status="revoked",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=30)
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    
    db = AsyncMock()
    db.execute.return_value = mock_result
    
    with patch("app.core.dependencies.decode_token") as mock_decode, \
         patch("app.core.dependencies._get_user_by_sub") as mock_get_user:
        
        mock_decode.return_value = {"sub": str(mock_user.id), "roles": ["platform_admin"]}
        mock_get_user.return_value = mock_user
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_tenant_id(request, token="token", db=db)
        assert exc_info.value.status_code == 403
        assert "Destek oturumu sonlandırılmış" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_tenant_id_platform_admin_expired():
    """PlatformContextSession süresi geçmişse platform admin işlemi reddedilmeli (403)."""
    mock_user = User(
        id=uuid.uuid4(),
        email="platform.admin@golabstek.com",
        default_role="platform_admin",
        tenant_id=None,
        is_active=True
    )
    target_tenant_id = uuid.uuid4()
    context_id = uuid.uuid4()
    
    context_token = create_context_token(
        actor_user_id=str(mock_user.id),
        tenant_id=str(target_tenant_id),
        mode="read_only",
        context_id=str(context_id)
    )
    
    request = MockRequest(headers={"X-Tenant-Context": context_token})
    
    # Mock expired session (started 2 hours ago, expired 1.5 hours ago)
    mock_session = PlatformContextSession(
        id=context_id,
        platform_admin_id=mock_user.id,
        tenant_id=target_tenant_id,
        tenant_name="Migros A.Ş.",
        mode="read_only",
        status="active",
        started_at=datetime.utcnow() - timedelta(hours=2),
        expires_at=datetime.utcnow() - timedelta(hours=1.5)
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_session
    
    db = AsyncMock()
    db.execute.return_value = mock_result
    
    with patch("app.core.dependencies.decode_token") as mock_decode, \
         patch("app.core.dependencies._get_user_by_sub") as mock_get_user:
        
        mock_decode.return_value = {"sub": str(mock_user.id), "roles": ["platform_admin"]}
        mock_get_user.return_value = mock_user
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_tenant_id(request, token="token", db=db)
        assert exc_info.value.status_code == 403
        assert "süresi dolmuş" in exc_info.value.detail


@pytest.mark.asyncio
async def test_start_context_requires_reason_for_support_write():
    """start_context: support_write modunda en az 10 karakterlik reason zorunlu olmalı."""
    mock_admin = User(id=uuid.uuid4(), email="admin@golabstek.com", default_role="platform_admin")
    
    # 1. Invalid request: No reason
    req_no_reason = ContextStartRequest(
        tenant_id=uuid.uuid4(),
        mode="support_write",
        reason=""
    )
    
    db = AsyncMock()
    
    with pytest.raises(HTTPException) as exc_info:
        await start_context(payload=req_no_reason, db=db, user=mock_admin)
    assert exc_info.value.status_code == 400
    assert "en az 10 karakter" in exc_info.value.detail

    # 2. Invalid request: Reason too short
    req_short_reason = ContextStartRequest(
        tenant_id=uuid.uuid4(),
        mode="support_write",
        reason="test"
    )
    with pytest.raises(HTTPException) as exc_info:
        await start_context(payload=req_short_reason, db=db, user=mock_admin)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_revoke_context_updates_db_status():
    """revoke_context: session durumunu revoked yapmalı."""
    mock_admin = User(id=uuid.uuid4(), email="admin@golabstek.com", default_role="platform_admin")
    session_id = uuid.uuid4()
    
    # Mock existing active session
    mock_session = PlatformContextSession(
        id=session_id,
        platform_admin_id=mock_admin.id,
        tenant_id=uuid.uuid4(),
        tenant_name="Firma 1",
        mode="read_only",
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=30)
    )
    
    db = AsyncMock()
    db.get.return_value = mock_session
    
    res = await revoke_context(session_id=session_id, db=db, user=mock_admin)
    assert res == {"status": "ok"}
    assert mock_session.status == "revoked"
    assert mock_session.ended_at is not None
    assert "Force Revoked" in mock_session.ended_reason


@pytest.mark.asyncio
async def test_renew_context_extends_time():
    """renew_context: session süresini 30 dk uzatmalı."""
    mock_admin = User(id=uuid.uuid4(), email="admin@golabstek.com", default_role="platform_admin")
    session_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    
    # Generate token
    token = create_context_token(
        actor_user_id=str(mock_admin.id),
        tenant_id=str(tenant_id),
        mode="read_only",
        context_id=str(session_id)
    )
    
    # Mock existing active session
    mock_session = PlatformContextSession(
        id=session_id,
        platform_admin_id=mock_admin.id,
        tenant_id=tenant_id,
        tenant_name="Firma 1",
        mode="read_only",
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=30)
    )
    
    db = AsyncMock()
    db.get.return_value = mock_session
    
    res = await renew_context(x_tenant_context=token, db=db, user=mock_admin)
    assert "context_token" in res
    assert "expires_at" in res
    # Expiry should be roughly 30 minutes from now
    expected_expiry = datetime.utcnow() + timedelta(minutes=30)
    assert abs((mock_session.expires_at - expected_expiry).total_seconds()) < 5


@pytest.mark.asyncio
async def test_get_support_analytics_computes_percentages():
    """get_support_analytics: destek analitik değerlerini doğru hesaplamalı."""
    mock_admin = User(id=uuid.uuid4(), email="admin@golabstek.com", default_role="platform_admin")
    
    db = AsyncMock()
    
    # Mock query executions for counts
    mock_execute_res = MagicMock()
    # today_sessions_count, total_sessions_count, read_only_count, top_tenants_rows, duration_rows
    # Let's return mock queries results
    mock_execute_res.scalar.side_effect = [
        3,  # today_sessions_count
        4,  # total_sessions_count
        3,  # read_only_count (3 out of 4)
    ]
    
    # top_tenants result mock
    mock_top_rows = [
        ("Migros A.Ş.", 3),
        ("Firma 2", 1)
    ]
    # duration result mock: started_at, ended_at
    now = datetime.utcnow()
    mock_duration_rows = [
        (now, now + timedelta(minutes=10)),
        (now, now + timedelta(minutes=20))
    ]
    
    mock_execute_res.all.side_effect = [
        mock_top_rows,
        mock_duration_rows
    ]
    
    db.execute.return_value = mock_execute_res
    
    res = await get_support_analytics(db=db, user=mock_admin)
    assert res["today_sessions_count"] == 3
    assert res["total_sessions_count"] == 4
    assert res["read_only_pct"] == 75.0
    assert res["support_write_pct"] == 25.0
    assert len(res["top_tenants"]) == 2
    assert res["top_tenants"][0]["tenant_name"] == "Migros A.Ş."
    assert res["top_tenants"][0]["count"] == 3
    assert res["avg_duration_minutes"] == 15.0

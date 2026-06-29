import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.main import app
from app.core.security import create_access_token
from app.db.models import User

# Test veritabanı veya mock kullanacağız
@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_correlation_id_header():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
        assert "x-correlation-id" in response.headers
        assert len(response.headers["x-correlation-id"]) > 10


@pytest.mark.asyncio
async def test_readiness_probe_mocks():
    # Mock everything to return ok
    with patch("app.api.v1.routes.meta.aioredis.Redis.from_url") as mock_redis, \
         patch("app.api.v1.routes.meta.celery_app") as mock_celery:
        
        # Redis mock
        mock_r_instance = AsyncMock()
        mock_redis.return_value = mock_r_instance
        
        # Celery mock
        mock_celery.conf.broker_url = "redis://localhost:6379/0"
        
        # DB Mock inside the test dependency override
        from app.core.database import get_db
        mock_db = AsyncMock(spec=AsyncSession)
        
        async def override_get_db():
            yield mock_db
            
        app.dependency_overrides[get_db] = override_get_db
        
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/v1/ready")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ready"
            assert data["details"]["postgres"] == "ok"
            assert data["details"]["redis"] == "ok"
            assert data["details"]["celery"] == "ok"
            
        app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_meta_routes_auth_required():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/meta/routes")
        # Should be unauthorized
        assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_meta_routes_with_admin():
    mock_user = User(id="admin_user_id", email="admin@test.com", role="platform_admin", tenant_id="tenant1")
    
    with patch("app.core.dependencies.decode_token") as mock_decode, \
         patch("app.core.dependencies._get_user_by_sub") as mock_get_user:
        
        mock_decode.return_value = {"sub": "admin_user_id", "roles": ["platform_admin"]}
        mock_get_user.return_value = mock_user
        
        from app.core.database import get_db
        mock_db = AsyncMock(spec=AsyncSession)
        async def override_get_db():
            yield mock_db
            
        app.dependency_overrides[get_db] = override_get_db
        
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/v1/meta/routes", headers={"Authorization": "Bearer token123"})
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) > 0
            assert "path" in data[0]
            
        app.dependency_overrides = {}

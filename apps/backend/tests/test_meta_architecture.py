import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.db.models import User

@pytest.mark.asyncio
async def test_meta_architecture_auth_required():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/meta/architecture")
        assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_meta_architecture_with_admin():
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
            response = await ac.get("/api/v1/meta/architecture", headers={"Authorization": "Bearer token123"})
            assert response.status_code == 200
            data = response.json()
            assert "domains" in data
            assert "summary" in data
            assert data["summary"]["total_domains"] > 0
            assert data["summary"]["total_entities"] > 0
            
        app.dependency_overrides = {}

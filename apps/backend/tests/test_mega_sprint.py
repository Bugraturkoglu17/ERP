import pytest
import subprocess
import os
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.db.models import User
from sqlalchemy.ext.asyncio import AsyncSession

def get_backend_dir():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@pytest.mark.asyncio
async def test_impact_analysis_endpoint():
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
            response = await ac.get("/api/v1/meta/impact-analysis?entity=WorkOrder", headers={"Authorization": "Bearer token123"})
            assert response.status_code == 200
            data = response.json()
            assert "affected" in data
            assert "risk_level" in data
            
        app.dependency_overrides = {}

@pytest.mark.asyncio
async def test_meta_dashboard_endpoint():
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
            response = await ac.get("/api/v1/meta/dashboard", headers={"Authorization": "Bearer token123"})
            assert response.status_code == 200
            data = response.json()
            assert "domains" in data
            assert "events" in data
            assert "tasks" in data
            
        app.dependency_overrides = {}

def test_architecture_linter_default_mode():
    script_path = os.path.join(get_backend_dir(), "scripts", "lint_architecture.py")
    result = subprocess.run(["python", script_path], capture_output=True, text=True)
    # Default mode should not fail (exit 0) even if there are warnings/errors
    assert result.returncode == 0
    assert "Architecture Linter Report" in result.stdout

def test_agent_tooling_smoke():
    script_path = os.path.join(get_backend_dir(), "scripts", "agent_context.py")
    result = subprocess.run(["python", script_path, "security"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "Security Matrix Overview" in result.stdout

def test_scaffold_domain_dry_run():
    script_path = os.path.join(get_backend_dir(), "scripts", "scaffold_domain.py")
    domain_name = "test_dry_run_domain"
    result = subprocess.run(["python", script_path, domain_name, "--entities", "TestEntity"], capture_output=True, text=True)
    assert result.returncode == 0
    assert "Scaffolding complete" in result.stdout
    
    # Cleanup
    backend_dir = get_backend_dir()
    files_to_remove = [
        os.path.join(backend_dir, "architecture", f"{domain_name}.json"),
        os.path.join(backend_dir, "app", "api", "v1", "routes", f"{domain_name}.py"),
        os.path.join(backend_dir, "app", "db", f"_{domain_name}_models_stub.py"),
        os.path.join(backend_dir, "tests", f"test_{domain_name}.py")
    ]
    for f in files_to_remove:
        if os.path.exists(f):
            os.remove(f)

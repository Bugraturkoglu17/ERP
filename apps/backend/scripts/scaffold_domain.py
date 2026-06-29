import os
import sys
import argparse
import json

def get_backend_dir():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(content.strip() + "\n")
        print(f"[CREATED] {path}")
    else:
        print(f"[SKIPPED] {path} already exists.")

def scaffold_domain(domain: str, entities: list):
    backend_dir = get_backend_dir()
    
    # 1. Manifest
    manifest_path = os.path.join(backend_dir, "architecture", f"{domain}.json")
    manifest_content = {
        "domain": domain,
        "description": "Scaffolded domain",
        "entities": entities,
        "routes": [f"app.api.v1.routes.{domain}"],
        "roles": ["admin"],
        "tenant_helper": f"verify_{domain}_tenant",
        "public_endpoints": [],
        "dependencies": []
    }
    create_file(manifest_path, json.dumps(manifest_content, indent=2))
    
    # 2. Route
    route_path = os.path.join(backend_dir, "app", "api", "v1", "routes", f"{domain}.py")
    route_content = f"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
# from app.core.permissions import verify_{domain}_tenant
from app.db.models import User

router = APIRouter(tags=["{domain}"])

@router.get("/", dependencies=[Depends(require_role("admin"))])
async def list_{domain}(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # TODO: await verify_{domain}_tenant(db, current_user, tenant_id)
    return {{"message": "{domain} list"}}
"""
    create_file(route_path, route_content)
    
    # 3. Model Stub (informational, we won't edit models.py directly to avoid breaking things, just create a separate file or instructions)
    model_stub_path = os.path.join(backend_dir, "app", "db", f"_{domain}_models_stub.py")
    model_content = f"""
# Copy this to app.db.models.py
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

"""
    for entity in entities:
        model_content += f"""
class {entity}(Base):
    __tablename__ = "{entity.lower()}"
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
"""
    create_file(model_stub_path, model_content)
    
    # 4. Test Stub
    test_path = os.path.join(backend_dir, "tests", f"test_{domain}.py")
    test_content = f"""
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_list_{domain}_unauthorized():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/{domain.replace('_', '-')}/")
        assert response.status_code in [401, 403]
"""
    create_file(test_path, test_content)
    
    print("\nScaffolding complete! Be sure to integrate the new route in app.api.v1.routes.__init__.py")

def main():
    parser = argparse.ArgumentParser(description="Scaffold a new modular domain.")
    parser.add_argument("domain", type=str, help="Name of the domain (e.g. inventory)")
    parser.add_argument("--entities", type=str, nargs="+", default=[], help="List of entities to scaffold")
    
    args = parser.parse_args()
    scaffold_domain(args.domain, args.entities)

if __name__ == "__main__":
    main()

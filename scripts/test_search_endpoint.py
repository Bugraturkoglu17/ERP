import sys
import os

# Assume running inside docker where /app is backend root
sys.path.append("/app")

from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user
from app.db.models import User
import uuid

# Mock user
mock_user = User(
    id=uuid.uuid4(),
    email="test@test.com",
    full_name="Test User",
    hashed_password="...",
    default_role="admin",
    tenant_id=uuid.uuid4()
)

def mock_get_current_user():
    return mock_user

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)
try:
    response = client.get("/api/v1/search/?q=test")
    print("Status Code 1:", response.status_code)
    print("Response JSON 1:", response.json())
    
    response2 = client.get("/api/v1/search?q=test")
    print("Status Code 2:", response2.status_code)
    print("Response JSON 2:", response2.json())
except Exception as e:
    print("Exception during test:", e)

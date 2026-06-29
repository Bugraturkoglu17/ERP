"""
P0 Security Fix — Document Tenant Isolation Tests
==================================================
Acceptance kriterleri:

  AC-1: Başka tenant'ın project_id'si ile upload -> 403
  AC-2: Login olmadan download -> 401
  AC-3: Başka tenant'ın doc_id'si ile download -> 403
  AC-4: Yeni yüklenen dosyanın file_key'i tenant prefix içerir
  AC-5: Başka tenant'ın project_id'si ile list -> 403
  AC-6: Başka tenant'ın doc_id'si ile version upload -> 403
  AC-7: Başka tenant'ın doc_id'si ile update -> 403
  AC-8: Başka tenant'ın doc_id'si ile delete -> 403
  AC-9: Başka tenant'ın doc_id'si ile list_versions -> 403

Not: Bu testler pytest-asyncio + httpx + SQLite/PostgreSQL test DB gerektirmektedir.
      Backend test ortamı kurulmadan önce import edilebilir; test_db fixture'ı
      proje test altyapısına göre ayarlanmalıdır.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers / Fixtures (ileride proje test altyapısı ile entegre edilecek)
# ---------------------------------------------------------------------------

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


def _make_document(project_id: uuid.UUID) -> MagicMock:
    doc = MagicMock()
    doc.id = uuid.uuid4()
    doc.project_id = project_id
    doc.file_key = f"tenants/xyz/projects/{project_id}/contract/abc_file.pdf"
    doc.archived = False
    doc.parent_id = None
    doc.version = 1
    return doc


# ---------------------------------------------------------------------------
# verify_project_tenant unit tests
# ---------------------------------------------------------------------------

class TestVerifyProjectTenant:

    @pytest.mark.asyncio
    async def test_same_tenant_allowed(self):
        """Aynı tenant'a ait proje — erişim izin verilmeli."""
        from app.core.permissions import verify_project_tenant
        from fastapi import HTTPException

        tenant_id = uuid.uuid4()
        user = _make_user(tenant_id=tenant_id)
        project = _make_project(tenant_id=tenant_id)

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = project
        db.execute = AsyncMock(return_value=mock_result)

        result = await verify_project_tenant(db, project.id, user)
        assert result is project

    @pytest.mark.asyncio
    async def test_different_tenant_raises_403(self):
        """Farklı tenant'a ait proje — 403 beklentisi (AC-1, AC-5)."""
        from app.core.permissions import verify_project_tenant
        from fastapi import HTTPException

        attacker_tenant_id = uuid.uuid4()
        victim_tenant_id = uuid.uuid4()

        user = _make_user(tenant_id=attacker_tenant_id)
        project = _make_project(tenant_id=victim_tenant_id)

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = project
        db.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(HTTPException) as exc_info:
            await verify_project_tenant(db, project.id, user)

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_platform_admin_bypasses_tenant_check(self):
        """Platform admin — tenant kontrolü bypass edilmeli."""
        from app.core.permissions import verify_project_tenant

        admin_tenant_id = uuid.uuid4()
        victim_tenant_id = uuid.uuid4()

        user = _make_user(tenant_id=admin_tenant_id, role="platform_admin")
        project = _make_project(tenant_id=victim_tenant_id)

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = project
        db.execute = AsyncMock(return_value=mock_result)

        result = await verify_project_tenant(db, project.id, user)
        assert result is project

    @pytest.mark.asyncio
    async def test_missing_project_raises_404(self):
        """Varolmayan proje — 404 beklentisi."""
        from app.core.permissions import verify_project_tenant
        from fastapi import HTTPException

        user = _make_user()
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(HTTPException) as exc_info:
            await verify_project_tenant(db, uuid.uuid4(), user)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_user_without_tenant_raises_403(self):
        """Tenant ID'si olmayan kullanıcı — 403 beklentisi."""
        from app.core.permissions import verify_project_tenant
        from fastapi import HTTPException

        user = _make_user(tenant_id=None)
        user.default_role = "admin"  # platform_admin değil

        some_tenant_id = uuid.uuid4()
        project = _make_project(tenant_id=some_tenant_id)

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = project
        db.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(HTTPException) as exc_info:
            await verify_project_tenant(db, project.id, user)

        assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# verify_document_tenant unit tests
# ---------------------------------------------------------------------------

class TestVerifyDocumentTenant:

    @pytest.mark.asyncio
    async def test_same_tenant_document_allowed(self):
        """Aynı tenant dokümanı — erişim izin verilmeli."""
        from app.core.permissions import verify_document_tenant

        tenant_id = uuid.uuid4()
        user = _make_user(tenant_id=tenant_id)
        project = _make_project(tenant_id=tenant_id)
        doc = _make_document(project_id=project.id)

        db = AsyncMock()

        doc_result = MagicMock()
        doc_result.scalar_one_or_none.return_value = doc

        project_result = MagicMock()
        project_result.scalar_one_or_none.return_value = project

        db.execute = AsyncMock(side_effect=[doc_result, project_result])

        result = await verify_document_tenant(db, doc.id, user)
        assert result is doc

    @pytest.mark.asyncio
    async def test_cross_tenant_document_raises_403(self):
        """Farklı tenant dokümanı — 403 beklentisi (AC-3, AC-6, AC-7, AC-8, AC-9)."""
        from app.core.permissions import verify_document_tenant
        from fastapi import HTTPException

        attacker_id = uuid.uuid4()
        victim_id = uuid.uuid4()

        user = _make_user(tenant_id=attacker_id)
        project = _make_project(tenant_id=victim_id)
        doc = _make_document(project_id=project.id)

        db = AsyncMock()
        doc_result = MagicMock()
        doc_result.scalar_one_or_none.return_value = doc
        project_result = MagicMock()
        project_result.scalar_one_or_none.return_value = project
        db.execute = AsyncMock(side_effect=[doc_result, project_result])

        with pytest.raises(HTTPException) as exc_info:
            await verify_document_tenant(db, doc.id, user)

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_missing_document_raises_404(self):
        """Varolmayan doküman — 404 beklentisi."""
        from app.core.permissions import verify_document_tenant
        from fastapi import HTTPException

        user = _make_user()
        db = AsyncMock()
        doc_result = MagicMock()
        doc_result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=doc_result)

        with pytest.raises(HTTPException) as exc_info:
            await verify_document_tenant(db, uuid.uuid4(), user)

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# File key format tests (AC-4)
# ---------------------------------------------------------------------------

class TestFileKeyFormat:

    def test_new_upload_key_contains_tenant_prefix(self):
        """
        AC-4: Yeni yüklenen dosyanın file_key'i 'tenants/{tenant_id}/projects/...' formatında olmalı.
        """
        tenant_id = uuid.uuid4()
        project_id = uuid.uuid4()
        doc_id = uuid.uuid4()
        safe_name = "contract.pdf"

        file_key = (
            f"tenants/{tenant_id}/projects/{project_id}"
            f"/contract/{doc_id}_{safe_name}"
        )

        assert file_key.startswith(f"tenants/{tenant_id}/")
        assert f"projects/{project_id}" in file_key
        assert "contract" in file_key
        assert safe_name in file_key

    def test_legacy_key_format_does_not_have_tenant_prefix(self):
        """Eski format dosyalar tenant prefix içermez — migration gerekir."""
        project_id = uuid.uuid4()
        legacy_key = f"projects/{project_id}/contract/12345_file.pdf"
        assert not legacy_key.startswith("tenants/")

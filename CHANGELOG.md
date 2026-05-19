# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) principles where applicable.

## [Unreleased]

### Added
- Multi-tenant platform administration backend route group (`/api/v1/platform/*`).
- Tenant baseline migration (`apps/backend/alembic/versions/20260518_01_tenant_baseline.py`).
- Platform bootstrap utility for admin setup (`apps/backend/app/bootstrap_admin.py`).
- Frontend tenant management page (`apps/frontend/app/platform/tenants/page.tsx`).
- Frontend auth helper additions for platform/admin workflows (`apps/frontend/lib/auth.ts`).
- Tenant-aware email notification rollout migration with outbound dead-letter support (`apps/backend/alembic/versions/20260519_02_notification_rollout.py`).
- Email template set for platform and module notifications (`apps/backend/app/core/email_templates.py`).

### Changed
- API surface updated for platform/project/auth integration and dependency handling:
  - `apps/backend/app/api/v1/routes/auth.py`
  - `apps/backend/app/api/v1/routes/projects.py`
  - `apps/backend/app/core/dependencies.py`
  - `apps/backend/app/core/security.py`
- Backend schema/model layer expanded to support tenant-aware structures:
  - `apps/backend/app/db/models.py`
  - `apps/backend/app/db/schemas.py`
- Tenant mail settings now support notification preferences (`email_notifications_enabled`, `email_digest_mode`, `email_opt_out_templates`) and tenant identity fallback rules.
- Mail dispatch moved to async Celery queue with audit-first flow (`queued/sent/failed/skipped`) and retry-aware dead-letter persistence.
- Module notifications wired to core flows:
  - Project assignment (`project_assignment`)
  - Invoice creation and near-due reminders (`invoice_created`, `invoice_due_soon`)
  - Inventory low stock alerts (`inventory_low_stock`)
- Platform admin password reset now supports targeted admin selection via `admin_user_id` (instead of implicit first-admin reset).
- Frontend navigation and sidebar updated to expose platform admin flows:
  - `apps/frontend/components/layout/sidebar.tsx`
  - `apps/frontend/lib/navigation.ts`
- Frontend API and generated types updated for new endpoints:
  - `apps/frontend/lib/api.ts`
  - `apps/frontend/types/api.ts`
- Platform tenants UI reset form updated to select a specific tenant admin before password reset.

### Fixed
- Frontend production build type-safety fixes across finance, inventory, login, and projects pages.
- Documents download response typing fix for frontend build compatibility.
- Users admin type-safe reload state update fix.
- Hierarchy page type guard fix for customer list mapping.

---

## [0.1.0] - 2026-05-18

### Added
- Initial modular ERP foundation:
  - Auth & RBAC
  - Projects
  - Inventory
  - Finance
- Dockerized infrastructure with PostgreSQL, Redis, FastAPI, and Celery.
- Seed data flow for base roles, users, and domain entities.

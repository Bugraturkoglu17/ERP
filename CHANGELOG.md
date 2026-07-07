# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) principles where applicable.

## [Unreleased]

### Sprint 18 — Modular Entitlement Platform
#### Added
- Module Registry, Feature Registry, Quota Registry, Marketplace Registry
- EntitlementService, TenantUsageMeter, Tenant overrides
- Marketplace installation altyapısı
- Navigation Registry v2 entitlement filtering
- Tenant context entitlement response
- require_module / require_feature / require_quota
- Usage metering
- Error translations
#### Tests
- 25 passed (17 entitlement, 8 tenant context switching)
#### Internal / Agent DX
- Agent DX registry/impact updates

### Sprint 19A — Workflow Backend Engine
#### Added
- 7 new models: WorkflowDefinition, WorkflowVersion, WorkflowRun, WorkflowRunNode, WorkflowTrigger, WorkflowAction, WorkflowTemplate
- Migration: `fb1e7542ac9e_sprint19_workflow_engine.py`
- Backend services: `workflow_trigger_service.py`, `workflow_action_service.py`, `workflow_engine.py`, `workflow_validator.py`
- Celery task: `execute_workflow_run_task`
- API endpoints: `/api/v1/workflows`, `/api/v1/workflows/{id}/versions`, `/api/v1/workflows/{id}/trigger`, `/api/v1/workflow-runs`, `/api/v1/workflow-runs/{run_id}`, `/api/v1/workflow-triggers`, `/api/v1/workflow-actions`, `/api/v1/workflow-templates`, `/api/v1/workflow-templates/{id}/clone`
- Registry updates: `modules.json` (workflow updated), `features.json` (workflow.templates added), `quotas.json` (workflow_runs added), `architecture/workflow.json` (added)
#### Security
- Tenant isolation, Entitlement enforcement, Idempotency, DAG validation
#### Tests
- 16 workflow backend tests passed
#### Internal / Agent DX
- Usage metering

### Sprint 19B — Visual Workflow Designer
#### Added
- Frontend pages: `/workflow`, `/workflow/new`, `/workflow/templates`, `/workflow/[id]`, `/workflow/[id]/runs`, `/workflow/[id]/runs/[runId]`
- Components: `workflow-canvas.tsx`, `start-node.tsx`, `action-node.tsx`, `condition-node.tsx`, `end-node.tsx`, `node-config-panel.tsx`
- API hook: `use-workflow-api.ts`
- Features: React Flow drag/drop canvas, DSL import/export, Start/Action/Condition/End node support, template gallery, template clone, run history, run detail/node timeline, entitlement-aware navigation
#### Fixed
- Fixed Typescript typing issues in `use-workflow-api.ts`
#### Tests
- Lint passed (2 legacy warnings)
- Production build passed


### Added
- Multi-tenant platform administration backend route group (`/api/v1/platform/*`).
- Tenant baseline migration (`apps/backend/alembic/versions/20260518_01_tenant_baseline.py`).
- Platform bootstrap utility for admin setup (`apps/backend/app/bootstrap_admin.py`).
- Frontend tenant management page (`apps/frontend/app/platform/tenants/page.tsx`).
- Frontend auth helper additions for platform/admin workflows (`apps/frontend/lib/auth.ts`).
- Tenant-aware email notification rollout migration with outbound dead-letter support (`apps/backend/alembic/versions/20260519_02_notification_rollout.py`).
- Email template set for platform and module notifications (`apps/backend/app/core/email_templates.py`).

### Changed
- Docker healthchecks now target the versioned FastAPI health/readiness endpoints:
  - API container checks `/api/v1/ready` from Compose and `/api/v1/health` from the backend image fallback.
  - Celery worker uses `celery inspect ping` instead of inheriting an HTTP healthcheck.
  - Celery beat disables HTTP healthcheck because it does not expose an HTTP server.
- Alembic migration history now has a single head by attaching the observability index migration to the main chain.
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
- Docker backend stack no longer reports API/Celery containers as unhealthy due to the obsolete `/health` probe.
- Startup migrations no longer fail on multiple Alembic heads or duplicate stock/user/role unique constraints during a clean local database bootstrap.
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

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlmodel import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_tenant_id, require_feature, require_module, require_quota
from app.db.models import (
    Tenant,
    User,
    WorkflowAction,
    WorkflowDefinition,
    WorkflowRun,
    WorkflowRunNode,
    WorkflowTemplate,
    WorkflowTrigger,
    WorkflowVersion,
)
from app.db.schemas import (
    WorkflowActionRead,
    WorkflowDefinitionCreate,
    WorkflowDefinitionRead,
    WorkflowDefinitionUpdate,
    WorkflowRunCreate,
    WorkflowRunDetail,
    WorkflowRunNodeRead,
    WorkflowRunRead,
    WorkflowTemplateClone,
    WorkflowTemplateRead,
    WorkflowTriggerRead,
    WorkflowVersionCreate,
    WorkflowVersionRead,
)
from app.core.workers.tasks import execute_workflow_run_task
from app.services.workflow_validator import validate_workflow_dsl

router = APIRouter(prefix="/workflows", tags=["Workflows"])

# ─────────────────────────────────────────────────────────────────────────────
# Workflows (Definitions)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=WorkflowDefinitionRead,
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def create_workflow(
    workflow_in: WorkflowDefinitionCreate,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user: User = Depends(get_current_user),
):
    # Validate DSL
    validate_workflow_dsl(workflow_in.dsl_json, db)

    # Create Definition
    definition = WorkflowDefinition(
        tenant_id=tenant_id,
        name=workflow_in.name,
        description=workflow_in.description,
        trigger_type=workflow_in.trigger_type,
        trigger_config=workflow_in.trigger_config,
        module_id=workflow_in.module_id,
        created_by=user.id
    )
    db.add(definition)
    await db.flush()

    # Create Initial Version
    version = WorkflowVersion(
        definition_id=definition.id,
        version_number=1,
        dsl_json=workflow_in.dsl_json,
        published_by=user.id
    )
    db.add(version)
    await db.commit()
    await db.refresh(definition)
    return definition

@router.get(
    "",
    response_model=List[WorkflowDefinitionRead],
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def get_workflows(
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    stmt = select(WorkflowDefinition).where(WorkflowDefinition.tenant_id == tenant_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get(
    "/{id}",
    response_model=WorkflowDefinitionRead,
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def get_workflow(
    id: UUID,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    workflow = await db.get(WorkflowDefinition, id)
    if not workflow or workflow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.patch(
    "/{id}",
    response_model=WorkflowDefinitionRead,
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def update_workflow(
    id: UUID,
    workflow_in: WorkflowDefinitionUpdate,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    workflow = await db.get(WorkflowDefinition, id)
    if not workflow or workflow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = workflow_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(workflow, k, v)
        
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def delete_workflow(
    id: UUID,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    workflow = await db.get(WorkflowDefinition, id)
    if not workflow or workflow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    workflow.is_active = False
    db.add(workflow)
    await db.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Workflow Versions
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{id}/versions",
    response_model=WorkflowVersionRead,
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def create_workflow_version(
    id: UUID,
    version_in: WorkflowVersionCreate,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user: User = Depends(get_current_user),
):
    # Validate DSL
    validate_workflow_dsl(version_in.dsl_json, db)

    workflow = await db.get(WorkflowDefinition, id)
    if not workflow or workflow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    stmt = select(WorkflowVersion).where(WorkflowVersion.definition_id == id).order_by(WorkflowVersion.version_number.desc())
    res = await db.execute(stmt)
    last_version = res.scalars().first()
    next_number = (last_version.version_number + 1) if last_version else 1

    version = WorkflowVersion(
        definition_id=workflow.id,
        version_number=next_number,
        dsl_json=version_in.dsl_json,
        published_by=user.id
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version

@router.get(
    "/{id}/versions",
    response_model=List[WorkflowVersionRead],
    dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))],
)
async def get_workflow_versions(
    id: UUID,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    workflow = await db.get(WorkflowDefinition, id)
    if not workflow or workflow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    stmt = select(WorkflowVersion).where(WorkflowVersion.definition_id == id).order_by(WorkflowVersion.version_number.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

# ─────────────────────────────────────────────────────────────────────────────
# Workflow Runs / Triggers
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{id}/trigger",
    response_model=WorkflowRunRead,
    dependencies=[
        Depends(require_module("workflow")), 
        Depends(require_feature("workflow.studio")),
        Depends(require_quota("workflow_runs", 1))
    ],
)
async def trigger_workflow(
    id: UUID,
    run_in: WorkflowRunCreate,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    workflow = await db.get(WorkflowDefinition, id)
    if not workflow or workflow.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    stmt = select(WorkflowVersion).where(WorkflowVersion.definition_id == id).order_by(WorkflowVersion.version_number.desc())
    res = await db.execute(stmt)
    latest_version = res.scalars().first()
    
    if not latest_version:
        raise HTTPException(status_code=400, detail="No version found for this workflow")

    if run_in.trigger_event_ref:
        stmt = select(WorkflowRun).where(
            WorkflowRun.tenant_id == tenant_id,
            WorkflowRun.trigger_event_ref == run_in.trigger_event_ref
        )
        res = await db.execute(stmt)
        existing_run = res.scalars().first()
        if existing_run:
            return existing_run

    run = WorkflowRun(
        tenant_id=tenant_id,
        definition_id=workflow.id,
        version_id=latest_version.id,
        status="pending",
        trigger_event_ref=run_in.trigger_event_ref,
        trigger_payload=run_in.trigger_payload
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Dispatch Celery Task
    execute_workflow_run_task.delay(str(run.id))

    return run

# ─────────────────────────────────────────────────────────────────────────────
# Catalog Routes
# ─────────────────────────────────────────────────────────────────────────────
catalog_router = APIRouter(tags=["Workflow Catalogs"])

@catalog_router.get("/workflow-runs", response_model=List[WorkflowRunRead], dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))])
async def get_workflow_runs(db: Session = Depends(get_db), tenant_id: UUID = Depends(get_current_tenant_id)):
    stmt = select(WorkflowRun).where(WorkflowRun.tenant_id == tenant_id).order_by(WorkflowRun.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()

@catalog_router.get("/workflow-runs/{run_id}", response_model=WorkflowRunDetail, dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))])
async def get_workflow_run_detail(run_id: UUID, db: Session = Depends(get_db), tenant_id: UUID = Depends(get_current_tenant_id)):
    run = await db.get(WorkflowRun, run_id)
    if not run or run.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Run not found")
        
    stmt = select(WorkflowRunNode).where(WorkflowRunNode.run_id == run.id).order_by(WorkflowRunNode.started_at.asc())
    res = await db.execute(stmt)
    nodes = res.scalars().all()
    
    # Enrichment
    run_dict = run.model_dump()
    run_dict["nodes"] = nodes
    return run_dict

@catalog_router.get("/workflow-triggers", response_model=List[WorkflowTriggerRead], dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))])
async def get_workflow_triggers(db: Session = Depends(get_db)):
    stmt = select(WorkflowTrigger).where(WorkflowTrigger.is_active == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@catalog_router.get("/workflow-actions", response_model=List[WorkflowActionRead], dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.studio"))])
async def get_workflow_actions(db: Session = Depends(get_db)):
    stmt = select(WorkflowAction).where(WorkflowAction.is_active == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@catalog_router.get("/workflow-templates", response_model=List[WorkflowTemplateRead], dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.templates"))])
async def get_workflow_templates(db: Session = Depends(get_db)):
    stmt = select(WorkflowTemplate).where(WorkflowTemplate.is_published == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@catalog_router.post("/workflow-templates/{id}/clone", response_model=WorkflowDefinitionRead, dependencies=[Depends(require_module("workflow")), Depends(require_feature("workflow.templates"))])
async def clone_workflow_template(
    id: UUID,
    clone_in: WorkflowTemplateClone,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user: User = Depends(get_current_user),
):
    template = await db.get(WorkflowTemplate, id)
    if not template or not template.is_published:
        raise HTTPException(status_code=404, detail="Template not found or not published")

    # validate modules and features required by template
    if template.required_modules:
        modules = template.required_modules.split(",")
        # The endpoint requires 'workflow' module already, but we need to check dynamically if others are needed
        from app.services.entitlement_service import EntitlementService
        entitlements = await EntitlementService.resolve_entitlements(db, tenant_id)
        for mod in modules:
            if mod.strip() not in entitlements["modules"]:
                raise HTTPException(status_code=403, detail=f"This template requires module: {mod.strip()}")

    if template.required_features:
        features = template.required_features.split(",")
        for feat in features:
            if feat.strip() not in entitlements["features"]:
                raise HTTPException(status_code=403, detail=f"This template requires feature: {feat.strip()}")

    # Parse template DSL
    import json
    dsl_dict = json.loads(template.dsl_json)
    trigger_type = dsl_dict.get("trigger_type", "manual")
    trigger_config = dsl_dict.get("trigger_config")

    # Create Definition
    definition = WorkflowDefinition(
        tenant_id=tenant_id,
        name=clone_in.name if clone_in.name else f"{template.name} (Copy)",
        description=template.description,
        trigger_type=trigger_type,
        trigger_config=json.dumps(trigger_config) if trigger_config else None,
        created_by=user.id
    )
    db.add(definition)
    await db.flush()

    # Create Initial Version
    version = WorkflowVersion(
        definition_id=definition.id,
        version_number=1,
        dsl_json=template.dsl_json,
        published_by=user.id
    )
    db.add(version)
    await db.commit()
    await db.refresh(definition)
    return definition

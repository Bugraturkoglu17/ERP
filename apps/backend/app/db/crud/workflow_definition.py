from app.db.crud.base import CRUDBase
from app.db.models import WorkflowDefinition
from app.db.schemas import WorkflowDefinitionCreate, WorkflowDefinitionUpdate

class CRUDWorkflowDefinition(CRUDBase[WorkflowDefinition, WorkflowDefinitionCreate, WorkflowDefinitionUpdate]):
    pass

crud_workflow_definition = CRUDWorkflowDefinition(WorkflowDefinition)

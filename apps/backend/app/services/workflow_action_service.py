import logging
from typing import Any, Dict, List

from sqlmodel import Session, select
from uuid import UUID

from app.db.models import WorkflowAction
from app.services.entitlement_service import EntitlementService

logger = logging.getLogger(__name__)

INITIAL_ACTIONS = [
    {
        "action_type": "notify",
        "module_id": "notifications",
        "label_tr": "Sistem Bildirimi Gönder",
        "required_feature": None,
        "celery_task": "app.core.workers.tasks.send_notification_task"
    },
    {
        "action_type": "send_whatsapp",
        "module_id": "whatsapp",
        "label_tr": "WhatsApp Mesajı Gönder",
        "required_feature": "whatsapp.outbound",
        "celery_task": "app.core.workers.tasks.send_whatsapp_message_task"
    },
    {
        "action_type": "create_approval",
        "module_id": "approvals",
        "label_tr": "Onay Talebi Oluştur",
        "required_feature": None,
        "celery_task": None # handled via local service
    },
    {
        "action_type": "update_work_order",
        "module_id": "work_orders",
        "label_tr": "İş Emrini Güncelle",
        "required_feature": None,
        "celery_task": None
    },
    {
        "action_type": "add_process_note",
        "module_id": "store_process",
        "label_tr": "Sürece Not Ekle",
        "required_feature": None,
        "celery_task": None
    },
    {
        "action_type": "request_document_revision",
        "module_id": "documents",
        "label_tr": "Döküman Revizyonu İste",
        "required_feature": "documents.revisions",
        "celery_task": None
    }
]

class WorkflowActionService:
    def __init__(self, db: Session, entitlement_service: EntitlementService):
        self.db = db
        self.entitlement_service = entitlement_service

    async def get_active_actions(self) -> List[WorkflowAction]:
        stmt = select(WorkflowAction).where(WorkflowAction.is_active == True)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_action_by_type(self, action_type: str) -> WorkflowAction | None:
        stmt = select(WorkflowAction).where(WorkflowAction.action_type == action_type)
        res = await self.db.execute(stmt)
        return res.scalars().first()

    async def init_actions(self):
        """Tohum (seed) verilerini veritabanına yazar."""
        for action_data in INITIAL_ACTIONS:
            existing = await self.get_action_by_type(action_data["action_type"])
            if not existing:
                new_action = WorkflowAction(
                    action_type=action_data["action_type"],
                    module_id=action_data["module_id"],
                    label_tr=action_data["label_tr"],
                    required_feature=action_data["required_feature"],
                    celery_task=action_data["celery_task"],
                    is_active=True
                )
                self.db.add(new_action)
                logger.info(f"Seeded workflow action: {action_data['action_type']}")
            else:
                existing.label_tr = action_data["label_tr"]
                existing.module_id = action_data["module_id"]
                existing.required_feature = action_data["required_feature"]
                existing.celery_task = action_data["celery_task"]
                self.db.add(existing)

        await self.db.commit()

    async def dispatch_action(self, tenant_id: UUID, action_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapter pattern dispatch.
        Gerçek business logic task/servislerini çağırır.
        """
        action = await self.get_action_by_type(action_type)
        if not action:
            raise ValueError(f"Bilinmeyen action_type: {action_type}")

        # Entitlement kontrolü (Node seviyesinde action feature aktif mi?)
        if action.required_feature:
            has_feature = await self.entitlement_service.check_feature_access(tenant_id, action.required_feature)
            if not has_feature:
                raise PermissionError(f"Bu eylemi kullanmak için '{action.required_feature}' özelliği gerekli.")

        logger.info(f"Dispatching action {action_type} for tenant {tenant_id} with config: {config}")

        # P0 safe implementation
        if action_type == "notify":
            # TODO: trigger actual notification creation
            return {"status": "success", "message": "Notification dispatched (mock)"}
        elif action_type == "send_whatsapp":
            # TODO: trigger whatsapp celery task
            return {"status": "success", "message": "WhatsApp dispatched (mock)"}
        elif action_type == "create_approval":
            # TODO: invoke approval service
            return {"status": "success", "message": "Approval created (mock)"}
        elif action_type == "update_work_order":
            # TODO: invoke work order service
            return {"status": "success", "message": "Work order updated (mock)"}
        elif action_type == "add_process_note":
            return {"status": "success", "message": "Process note added (mock)"}
        elif action_type == "request_document_revision":
            return {"status": "success", "message": "Document revision requested (mock)"}
        else:
            return {"status": "success", "message": f"Action {action_type} executed (no-op)"}

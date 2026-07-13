import logging
from typing import List

from sqlmodel import Session, select

from app.db.models import WorkflowTrigger

logger = logging.getLogger(__name__)

INITIAL_TRIGGERS = [
    {
        "event_name": "work_order_created",
        "module_id": "work_orders",
        "label_tr": "İş Emri Oluşturulduğunda",
        "payload_schema": "{\"work_order_id\": \"UUID\"}"
    },
    {
        "event_name": "work_order_assigned",
        "module_id": "work_orders",
        "label_tr": "İş Emri Atandığında",
        "payload_schema": "{\"work_order_id\": \"UUID\", \"assignee_id\": \"UUID\"}"
    },
    {
        "event_name": "approval_requested",
        "module_id": "approvals",
        "label_tr": "Onay Talep Edildiğinde",
        "payload_schema": "{\"approval_request_id\": \"UUID\"}"
    },
    {
        "event_name": "approval_approved",
        "module_id": "approvals",
        "label_tr": "Onay Verildiğinde",
        "payload_schema": "{\"approval_request_id\": \"UUID\"}"
    },
    {
        "event_name": "document_uploaded",
        "module_id": "documents",
        "label_tr": "Döküman Yüklendiğinde",
        "payload_schema": "{\"document_id\": \"UUID\"}"
    },
    {
        "event_name": "invoice_created",
        "module_id": "finance",
        "label_tr": "Fatura Oluşturulduğunda",
        "payload_schema": "{\"invoice_id\": \"UUID\"}"
    },
    {
        "event_name": "service_form_submitted",
        "module_id": "work_orders",
        "label_tr": "Servis Formu Yüklendiğinde",
        "payload_schema": "{\"work_order_id\": \"UUID\", \"form_id\": \"UUID\"}"
    },
    {
        "event_name": "field_report_submitted",
        "module_id": "field_reports",
        "label_tr": "Saha Raporu Gönderildiğinde",
        "payload_schema": "{\"report_id\": \"UUID\"}"
    },
    {
        "event_name": "stock_low",
        "module_id": "inventory",
        "label_tr": "Stok Kritik Seviyeye Düştüğünde",
        "payload_schema": "{\"material_id\": \"UUID\", \"warehouse_id\": \"UUID\"}"
    },
    {
        "event_name": "purchase_order_received",
        "module_id": "purchasing",
        "label_tr": "Satınalma Siparişi Teslim Alındığında",
        "payload_schema": "{\"purchase_order_id\": \"UUID\"}"
    },
    {
        "event_name": "subscription_assigned",
        "module_id": "platform",
        "label_tr": "Abonelik Atandığında",
        "payload_schema": "{\"tenant_id\": \"UUID\", \"plan_id\": \"str\"}"
    }
]

class WorkflowTriggerService:
    def __init__(self, db: Session):
        self.db = db

    def get_active_triggers(self) -> List[WorkflowTrigger]:
        stmt = select(WorkflowTrigger).where(WorkflowTrigger.is_active == True)
        return self.db.exec(stmt).all()

    def get_trigger_by_name(self, event_name: str) -> WorkflowTrigger | None:
        stmt = select(WorkflowTrigger).where(WorkflowTrigger.event_name == event_name)
        return self.db.exec(stmt).first()

    def init_triggers(self):
        """Tohum (seed) verilerini veritabanına yazar."""
        for trigger_data in INITIAL_TRIGGERS:
            existing = self.get_trigger_by_name(trigger_data["event_name"])
            if not existing:
                new_trigger = WorkflowTrigger(
                    event_name=trigger_data["event_name"],
                    module_id=trigger_data["module_id"],
                    label_tr=trigger_data["label_tr"],
                    payload_schema=trigger_data["payload_schema"],
                    is_active=True
                )
                self.db.add(new_trigger)
                logger.info(f"Seeded workflow trigger: {trigger_data['event_name']}")
            else:
                existing.label_tr = trigger_data["label_tr"]
                existing.module_id = trigger_data["module_id"]
                existing.payload_schema = trigger_data["payload_schema"]
                self.db.add(existing)

        self.db.commit()

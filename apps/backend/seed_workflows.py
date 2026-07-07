import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Seed WorkflowTriggers
        triggers = [
            {
                "event_name": "invoice_created",
                "module_id": "finance",
                "label_tr": "Yeni Fatura Oluşturulduğunda",
                "payload_schema": '{"type": "object", "properties": {"invoice_id": {"type": "string"}}}'
            },
            {
                "event_name": "purchase_order_approved",
                "module_id": "procurement",
                "label_tr": "Satın Alma Siparişi Onaylandığında",
                "payload_schema": '{"type": "object", "properties": {"po_id": {"type": "string"}}}'
            },
            {
                "event_name": "stock_low",
                "module_id": "inventory",
                "label_tr": "Stok Kritik Seviyeye Düştüğünde",
                "payload_schema": '{"type": "object", "properties": {"material_id": {"type": "string"}}}'
            },
            {
                "event_name": "manual",
                "module_id": "workflow",
                "label_tr": "Manuel / Test Tetikleyici",
                "payload_schema": '{"type": "object"}'
            }
        ]
        
        for t in triggers:
            await db.execute(text("""
                INSERT INTO workflow_triggers (id, event_name, module_id, label_tr, payload_schema, is_active)
                VALUES (gen_random_uuid(), :event_name, :module_id, :label_tr, :payload_schema, true)
                ON CONFLICT (event_name) DO NOTHING
            """), t)

        # Seed WorkflowActions
        actions = [
            {
                "action_type": "send_email",
                "module_id": "notifications",
                "label_tr": "E-posta Gönder",
                "celery_task": "app.core.workers.tasks.send_email_task"
            },
            {
                "action_type": "send_whatsapp",
                "module_id": "whatsapp",
                "label_tr": "WhatsApp Mesajı Gönder",
                "celery_task": "app.core.workers.tasks.send_whatsapp_task"
            },
            {
                "action_type": "create_approval",
                "module_id": "approvals",
                "label_tr": "Onay Talebi Oluştur",
                "celery_task": "app.core.workers.tasks.create_approval_task"
            }
        ]
        
        for a in actions:
            await db.execute(text("""
                INSERT INTO workflow_actions (id, action_type, module_id, label_tr, celery_task, is_active)
                VALUES (gen_random_uuid(), :action_type, :module_id, :label_tr, :celery_task, true)
                ON CONFLICT (action_type) DO NOTHING
            """), a)

        # Seed WorkflowTemplates
        import json
        template_dsl = {
            "trigger_type": "manual",
            "trigger_config": {},
            "nodes": [
                {
                    "id": "node-start",
                    "type": "start",
                    "name": "Başlangıç",
                    "config": {"trigger_type": "manual"}
                },
                {
                    "id": "node-email-1",
                    "type": "action",
                    "name": "E-posta Bildirimi",
                    "config": {
                        "action_type": "send_email",
                        "to": "admin@example.com",
                        "subject": "Test İş Akışı Başladı",
                        "body": "Sistem üzerinden test iş akışı tetiklendi."
                    }
                }
            ],
            "edges": [
                {
                    "id": "edge-1",
                    "source": "node-start",
                    "target": "node-email-1",
                    "type": "default"
                }
            ]
        }
        
        templates = [
            {
                "name": "Temel Bildirim Şablonu",
                "description": "Manuel tetikleme ile başlayan ve bir kişiye e-posta bildirimi gönderen basit bir iş akışı şablonu.",
                "category": "Genel",
                "dsl_json": json.dumps(template_dsl),
                "required_modules": "notifications",
                "required_features": ""
            }
        ]
        
        for tmpl in templates:
            await db.execute(text("""
                INSERT INTO workflow_templates (id, name, description, category, dsl_json, required_modules, required_features, is_published, created_at)
                VALUES (gen_random_uuid(), :name, :description, :category, :dsl_json, :required_modules, :required_features, true, now())
            """), tmpl)

        await db.commit()
        print("Seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_data())

from __future__ import annotations

from app.core.services.workflow_action_service import INITIAL_ACTIONS
from app.core.services.workflow_trigger_service import INITIAL_TRIGGERS
from app.seeds.base_seeder import BaseSeeder


class WorkflowSeeder(BaseSeeder):
    name = "workflow"

    async def seed(self) -> None:
        for trigger in INITIAL_TRIGGERS:
            await self.execute(
                """
                INSERT INTO workflow_triggers (id, event_name, module_id, label_tr, payload_schema, is_active)
                VALUES (gen_random_uuid(), :event_name, :module_id, :label_tr, :payload_schema, true)
                ON CONFLICT (event_name) DO UPDATE SET
                    module_id = EXCLUDED.module_id,
                    label_tr = EXCLUDED.label_tr,
                    payload_schema = EXCLUDED.payload_schema,
                    is_active = true
                """,
                trigger,
            )

        for action in INITIAL_ACTIONS:
            await self.execute(
                """
                INSERT INTO workflow_actions (
                    id, action_type, module_id, label_tr, required_feature, celery_task, config_schema, is_active
                )
                VALUES (
                    gen_random_uuid(), :action_type, :module_id, :label_tr, :required_feature, :celery_task, :config_schema, true
                )
                ON CONFLICT (action_type) DO UPDATE SET
                    module_id = EXCLUDED.module_id,
                    label_tr = EXCLUDED.label_tr,
                    required_feature = EXCLUDED.required_feature,
                    celery_task = EXCLUDED.celery_task,
                    config_schema = EXCLUDED.config_schema,
                    is_active = true
                """,
                action,
            )

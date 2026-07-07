import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlmodel import Session, select

from app.db.models import ErpNotification, WorkflowRun, WorkflowRunNode, WorkflowVersion
from app.services.workflow_action_service import WorkflowActionService

logger = logging.getLogger(__name__)


def _resolve_field(data: Dict[str, Any], field_path: str) -> Any:
    """
    Resolve a dot-notation field path from data dict.
    e.g. 'payload.amount' -> data['payload']['amount']
    """
    parts = field_path.split('.')
    value = data
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part)
        else:
            return None
    return value


def evaluate_condition(node_def: Dict[str, Any], context_data: Dict[str, Any]) -> bool:
    """
    Evaluate a condition node against context data.
    Returns True (follow 'true' branch) or False (follow 'false' branch).
    """
    config = node_def.get('config', {})
    field = config.get('field', '')
    operator = config.get('operator', 'equals')
    compare_value = config.get('value', '')

    if not field:
        logger.warning('Condition node has no field configured, defaulting to True')
        return True

    actual_value = _resolve_field(context_data, field)

    try:
        if operator == 'equals':
            return str(actual_value) == str(compare_value)
        elif operator == 'not_equals':
            return str(actual_value) != str(compare_value)
        elif operator == 'greater_than':
            return float(actual_value or 0) > float(compare_value or 0)
        elif operator == 'less_than':
            return float(actual_value or 0) < float(compare_value or 0)
        elif operator == 'contains':
            return str(compare_value) in str(actual_value or '')
        elif operator == 'exists':
            return actual_value is not None
        else:
            logger.warning(f'Unknown operator: {operator}, defaulting to True')
            return True
    except (TypeError, ValueError) as e:
        logger.warning(f'Condition evaluation error (field={field}, op={operator}): {e}')
        return False

from app.core.utils.helpers import utc_now


async def _create_failure_notification(
    db: Session,
    run: WorkflowRun,
    workflow_name: str,
    event_type: str,
    title: str,
    description: str,
) -> None:
    """
    Idempotent in-app notification for failed/stalled workflow runs.
    Guard: if alert_sent_at is already set, skip.
    """
    from app.db.models import PlatformTenantSettings
    from app.core.workers.tasks import send_tenant_email_task
    import json

    if run.alert_sent_at is not None:
        logger.debug(f"Alert already sent for run {run.id}, skipping.")
        return

    link = f"/workflow/{run.definition_id}/runs/{run.id}"
    notification = ErpNotification(
        id=uuid4(),
        tenant_id=run.tenant_id,
        event_type=event_type,
        title=title,
        description=f"{description} | Run: {str(run.id)[:8]} | {link}",
        is_read=False,
        created_at=utc_now(),
    )
    db.add(notification)
    run.alert_sent_at = utc_now()
    db.add(run)
    logger.info(f"Workflow failure notification created for run {run.id} (event={event_type})")

    # Check tenant settings for email alerts
    settings = db.query(PlatformTenantSettings).filter(PlatformTenantSettings.tenant_id == run.tenant_id).first()
    if settings and settings.workflow_email_alerts_enabled:
        recipients_str = settings.workflow_alert_recipients
        if recipients_str:
            try:
                recipients = json.loads(recipients_str)
                if isinstance(recipients, list) and len(recipients) > 0:
                    send_tenant_email_task.delay({
                        "tenant_id": str(run.tenant_id),
                        "template": "workflow_failure_alert",
                        "to": recipients,
                        "subject": f"[Alert] Workflow {title}",
                        "text": f"Workflow execution failed/stalled.\n\nWorkflow Name: {workflow_name}\nRun ID: {run.id}\nDetail: {description}\n\nLink: {link}",
                        "html": None
                    })
            except Exception as e:
                logger.error(f"Failed to parse workflow_alert_recipients for tenant {run.tenant_id}: {e}")

class WorkflowEngine:
    def __init__(self, db: Session, action_service: WorkflowActionService):
        self.db = db
        self.action_service = action_service

    async def execute_run(self, run_id: UUID) -> bool:
        """
        Idempotent sequential DAG execution.
        Returns True if successful, False if failed.
        """
        run = await self.db.get(WorkflowRun, run_id)
        if not run:
            logger.error(f"WorkflowRun {run_id} not found.")
            return False

        if run.status in ["completed", "failed", "cancelled"]:
            logger.warning(f"WorkflowRun {run_id} already finished with status: {run.status}")
            return run.status == "completed"

        version = await self.db.get(WorkflowVersion, run.version_id)
        if not version:
            run.status = "failed"
            run.error_message = "WorkflowVersion not found"
            run.ended_at = utc_now()
            self.db.add(run)
            await self.db.commit()
            return False

        # Status u running yap
        if run.status == "pending":
            run.status = "running"
            run.started_at = utc_now()
            self.db.add(run)
            await self.db.commit()

        try:
            dsl = json.loads(version.dsl_json)
            nodes = {n["id"]: n for n in dsl.get("nodes", [])}
            edges = dsl.get("edges", [])

            # Build adjacency list that respects sourceHandle for condition branches
            # adj[node_id] = {"true": [node_ids], "false": [node_ids], "default": [node_ids]}
            adj: Dict[str, Dict[str, List[str]]] = {n: {"true": [], "false": [], "default": []} for n in nodes}
            for e in edges:
                src = e.get("from") or e.get("source")
                tgt = e.get("to") or e.get("target")
                handle = e.get("sourceHandle") or "default"
                if src in adj:
                    adj[src][handle].append(tgt)
                    if handle not in ("true", "false"):
                        adj[src]["default"].append(tgt)

            # Bul start node
            start_nodes = [nid for nid, n in nodes.items() if n.get("type") == "start"]
            if not start_nodes:
                raise ValueError("Workflow definition has no 'start' node.")
            
            current_node_id = start_nodes[0]

            # Trigger payload
            context_data = {}
            if run.trigger_payload:
                context_data = json.loads(run.trigger_payload)

            # Sequential DAG execution
            visited = set()

            while current_node_id:
                if current_node_id in visited:
                    raise ValueError(f"Cycle detected at node {current_node_id}")
                
                visited.add(current_node_id)
                node_def = nodes[current_node_id]
                node_type = node_def.get("type")
                
                # Check if already executed successfully (Idempotency check)
                stmt = select(WorkflowRunNode).where(
                    WorkflowRunNode.run_id == run.id,
                    WorkflowRunNode.node_id == current_node_id,
                    WorkflowRunNode.status == "completed"
                )
                existing_res = await self.db.execute(stmt)
                existing_node_run = existing_res.scalars().first()

                if not existing_node_run:
                    # Execute
                    node_run = WorkflowRunNode(
                        run_id=run.id,
                        node_id=current_node_id,
                        node_type=node_type,
                        status="running",
                        attempt_count=1,
                        input_data=json.dumps(context_data),
                        started_at=utc_now()
                    )
                    self.db.add(node_run)
                    await self.db.commit()

                    condition_result: Optional[bool] = None
                    try:
                        if node_type == "action":
                            action_type = node_def.get("action_type")
                            config = node_def.get("config", {})
                            merged_config = {**config, "trigger_context": context_data}
                            result = await self.action_service.dispatch_action(run.tenant_id, action_type, merged_config)
                            node_run.output_data = json.dumps(result)
                            context_data[current_node_id] = result

                        elif node_type == "condition":
                            condition_result = evaluate_condition(node_def, context_data)
                            node_run.output_data = json.dumps({"result": condition_result})
                            logger.info(f"Condition node {current_node_id} evaluated to: {condition_result}")

                        elif node_type in ["start", "end"]:
                            pass  # No-op

                        node_run.status = "completed"
                        node_run.ended_at = utc_now()
                        self.db.add(node_run)
                        await self.db.commit()

                    except Exception as e:
                        logger.error(f"Node execution failed: {str(e)}", exc_info=True)
                        node_run.status = "failed"
                        node_run.error_message = str(e)
                        node_run.ended_at = utc_now()
                        self.db.add(node_run)

                        run.status = "failed"
                        run.error_message = f"Failed at node {current_node_id}: {str(e)}"
                        run.ended_at = utc_now()
                        self.db.add(run)

                        await _create_failure_notification(
                            db=self.db,
                            run=run,
                            workflow_name=str(run.definition_id),
                            event_type="workflow_failed",
                            title="⚠️ İş Akışı Başarısız",
                            description=f"Node '{current_node_id}' başarısız: {str(e)[:200]}",
                        )
                        await self.db.commit()
                        return False

                # Move to next node — respecting condition branches
                branches = adj.get(current_node_id, {})
                if node_type == "condition" and condition_result is not None:
                    branch_key = "true" if condition_result else "false"
                    next_nodes = branches.get(branch_key, []) or branches.get("default", [])
                else:
                    next_nodes = branches.get("default", [])
                    if not next_nodes:
                        # fallback: collect all
                        next_nodes = branches.get("true", []) + branches.get("false", [])

                if not next_nodes:
                    break
                current_node_id = next_nodes[0]

            run.status = "completed"
            run.ended_at = utc_now()
            self.db.add(run)
            await self.db.commit()
            return True

        except Exception as e:
            logger.error(f"Run execution failed: {str(e)}", exc_info=True)
            run.status = "failed"
            run.error_message = str(e)
            run.ended_at = utc_now()
            self.db.add(run)

            await _create_failure_notification(
                db=self.db,
                run=run,
                workflow_name=str(run.definition_id),
                event_type="workflow_failed",
                title="⚠️ İş Akışı Başarısız",
                description=f"Beklenmedik hata: {str(e)[:200]}",
            )
            await self.db.commit()
            return False

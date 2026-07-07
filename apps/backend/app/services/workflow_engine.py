import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID

from sqlmodel import Session, select

from app.db.models import WorkflowRun, WorkflowRunNode, WorkflowVersion
from app.services.workflow_action_service import WorkflowActionService

logger = logging.getLogger(__name__)

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

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

            # Adj list
            adj: Dict[str, List[str]] = {n: [] for n in nodes}
            for e in edges:
                if e["from"] in adj:
                    adj[e["from"]].append(e["to"])

            # Bul start node
            start_nodes = [nid for nid, n in nodes.items() if n.get("type") == "start"]
            if not start_nodes:
                raise ValueError("Workflow definition has no 'start' node.")
            
            current_node_id = start_nodes[0]

            # Trigger payload
            context_data = {}
            if run.trigger_payload:
                context_data = json.loads(run.trigger_payload)

            # Simple sequential execution (P0)
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

                    try:
                        if node_type == "action":
                            action_type = node_def.get("action_type")
                            config = node_def.get("config", {})
                            # Pass context to config
                            merged_config = {**config, "trigger_context": context_data}
                            
                            result = await self.action_service.dispatch_action(run.tenant_id, action_type, merged_config)
                            node_run.output_data = json.dumps(result)
                            # Update context data with action results
                            context_data[current_node_id] = result
                            
                        elif node_type == "condition":
                            # P0: Assume condition always true or requires basic parsing
                            # Not implemented full expression evaluator yet
                            pass
                            
                        elif node_type in ["start", "end"]:
                            pass # No-op
                            
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
                        await self.db.commit()
                        return False

                # Move to next node
                next_nodes = adj.get(current_node_id, [])
                if not next_nodes:
                    break
                elif len(next_nodes) > 1:
                    # P0: Sadece ilk edge'i takip ediyoruz condition olmadan
                    current_node_id = next_nodes[0]
                else:
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
            await self.db.commit()
            return False

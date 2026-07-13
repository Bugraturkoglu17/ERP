from __future__ import annotations

import copy
import json
from typing import Any

from app.services.workflow_engine import evaluate_condition


class WorkflowSimulator:
    def simulate(self, dsl_json: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        dsl = json.loads(dsl_json)
        nodes = {node["id"]: node for node in dsl.get("nodes", [])}
        edges = dsl.get("edges", [])
        adjacency = self._build_adjacency(nodes, edges)
        start_node_id = self._find_start_node(nodes)

        trace: list[dict[str, Any]] = []
        errors: list[str] = []
        context_data = copy.deepcopy(payload or {})
        current_node_id: str | None = start_node_id
        visited: set[str] = set()

        while current_node_id:
            if current_node_id in visited:
                errors.append(f"Cycle detected at node {current_node_id}")
                return {"status": "failed", "trace": trace, "errors": errors}

            visited.add(current_node_id)
            node_def = nodes[current_node_id]
            node_type = node_def.get("type")
            node_input = copy.deepcopy(context_data)
            output: dict[str, Any] = {}
            branch_decision: bool | None = None

            try:
                if node_type == "action":
                    action_type = node_def.get("action_type")
                    output = {
                        "status": "simulated",
                        "action_type": action_type,
                        "message": f"Action '{action_type}' was not dispatched during dry run.",
                    }
                    context_data[current_node_id] = output
                elif node_type == "condition":
                    branch_decision = evaluate_condition(node_def, context_data)
                    output = {"result": branch_decision}
                elif node_type in ("start", "end"):
                    output = {}
                else:
                    raise ValueError(f"Unsupported node type: {node_type}")

                trace.append({
                    "node_id": current_node_id,
                    "node_type": node_type,
                    "status": "completed",
                    "input": node_input,
                    "output": output,
                    "branch_decision": branch_decision,
                    "simulated": True,
                    "error": None,
                })
            except Exception as exc:
                error = str(exc)
                errors.append(error)
                trace.append({
                    "node_id": current_node_id,
                    "node_type": node_type,
                    "status": "failed",
                    "input": node_input,
                    "output": output,
                    "branch_decision": branch_decision,
                    "simulated": True,
                    "error": error,
                })
                return {"status": "failed", "trace": trace, "errors": errors}

            branches = adjacency.get(current_node_id, {})
            if node_type == "condition" and branch_decision is not None:
                branch_key = "true" if branch_decision else "false"
                next_nodes = branches.get(branch_key, []) or branches.get("default", [])
            else:
                next_nodes = branches.get("default", [])
                if not next_nodes:
                    next_nodes = branches.get("true", []) + branches.get("false", [])

            current_node_id = next_nodes[0] if next_nodes else None

        return {"status": "completed", "trace": trace, "errors": errors}

    def _build_adjacency(self, nodes: dict[str, dict[str, Any]], edges: list[dict[str, Any]]) -> dict[str, dict[str, list[str]]]:
        adjacency: dict[str, dict[str, list[str]]] = {node_id: {"true": [], "false": [], "default": []} for node_id in nodes}
        for edge in edges:
            source = edge.get("from") or edge.get("source")
            target = edge.get("to") or edge.get("target")
            handle = edge.get("sourceHandle") or "default"
            if source in adjacency and target:
                adjacency[source][handle].append(target)
                if handle not in ("true", "false"):
                    adjacency[source]["default"].append(target)
        return adjacency

    def _find_start_node(self, nodes: dict[str, dict[str, Any]]) -> str:
        start_nodes = [node_id for node_id, node in nodes.items() if node.get("type") == "start"]
        if not start_nodes:
            raise ValueError("Workflow definition has no 'start' node.")
        return start_nodes[0]

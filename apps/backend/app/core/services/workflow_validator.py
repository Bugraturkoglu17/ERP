import json
from typing import Dict, List, Any

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.db.models import WorkflowAction

async def validate_workflow_dsl(dsl_str: str, db: AsyncSession) -> None:
    """
    Validates a Workflow DSL string.
    Raises HTTPException 400 with a detailed message if validation fails.
    """
    try:
        dsl = json.loads(dsl_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="DSL is not valid JSON.")

    if not isinstance(dsl, dict):
        raise HTTPException(status_code=400, detail="DSL root must be an object.")

    nodes: List[Dict[str, Any]] = dsl.get("nodes", [])
    edges: List[Dict[str, str]] = dsl.get("edges", [])

    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise HTTPException(status_code=400, detail="Nodes and edges must be lists.")

    if not nodes:
        raise HTTPException(status_code=400, detail="Workflow must have at least one node.")

    node_dict = {n.get("id"): n for n in nodes if "id" in n}
    if len(node_dict) != len(nodes):
        raise HTTPException(status_code=400, detail="All nodes must have a unique 'id'.")

    # 1. Type validations
    valid_node_types = {"start", "end", "action", "condition"}
    start_nodes = []
    end_nodes = []

    # Pre-fetch actions
    stmt = select(WorkflowAction).where(WorkflowAction.is_active == True)
    res = await db.execute(stmt)
    active_actions = {a.action_type for a in res.scalars().all()}

    for node in nodes:
        node_id = node.get("id")
        n_type = node.get("type")
        
        if n_type not in valid_node_types:
            raise HTTPException(status_code=400, detail=f"Invalid node type '{n_type}' for node '{node_id}'.")
        
        if n_type == "start":
            start_nodes.append(node_id)
        elif n_type == "end":
            end_nodes.append(node_id)
        elif n_type == "action":
            a_type = node.get("action_type")
            if not a_type:
                raise HTTPException(status_code=400, detail=f"Action node '{node_id}' is missing 'action_type'.")
            if a_type not in active_actions:
                raise HTTPException(status_code=400, detail=f"Action type '{a_type}' is not registered or active.")

    if not start_nodes:
        raise HTTPException(status_code=400, detail="Workflow must contain a 'start' node.")
    if len(start_nodes) > 1:
        raise HTTPException(status_code=400, detail="Workflow can only contain one 'start' node.")
    if not end_nodes:
        raise HTTPException(status_code=400, detail="Workflow must contain at least one 'end' node.")

    # 2. Graph & Cycle validation
    adj: Dict[str, List[str]] = {n_id: [] for n_id in node_dict}
    for edge in edges:
        f = edge.get("from")
        t = edge.get("to")
        if not f or not t:
            raise HTTPException(status_code=400, detail="Edges must have 'from' and 'to' fields.")
        if f not in node_dict or t not in node_dict:
            raise HTTPException(status_code=400, detail=f"Edge references unknown node(s): from '{f}' to '{t}'.")
        adj[f].append(t)

    # Detect cycles using DFS (0: unvisited, 1: visiting, 2: visited)
    state = {n_id: 0 for n_id in node_dict}
    
    def dfs_cycle_detect(n: str):
        state[n] = 1
        for neighbor in adj[n]:
            if state[neighbor] == 1:
                return True # cycle detected
            if state[neighbor] == 0:
                if dfs_cycle_detect(neighbor):
                    return True
        state[n] = 2
        return False

    # Start DFS from start node
    start_id = start_nodes[0]
    if dfs_cycle_detect(start_id):
        raise HTTPException(status_code=400, detail="Cycle detected in workflow DSL. Only Directed Acyclic Graphs (DAGs) are allowed.")

    # 3. Orphan validation (all nodes must be reachable from start)
    # Check if there are unvisited nodes
    unreachable = [n for n, s in state.items() if s == 0]
    if unreachable:
        raise HTTPException(status_code=400, detail=f"Workflow contains unreachable (orphan) nodes: {', '.join(unreachable)}")

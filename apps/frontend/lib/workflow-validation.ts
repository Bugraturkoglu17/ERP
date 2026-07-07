import { Node, Edge } from '@xyflow/react';

export function parseBackendDsl(dslJson: string | null): { nodes: Node[], edges: Edge[] } {
  if (!dslJson) {
    return { nodes: [], edges: [] };
  }

  try {
    const dsl = JSON.parse(dslJson);
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (dsl.nodes && Array.isArray(dsl.nodes)) {
      dsl.nodes.forEach((n: any, i: number) => {
        nodes.push({
          id: n.id,
          type: n.type,
          position: n.position || { x: 100, y: i * 150 + 50 },
          data: {
            name: n.name || n.id,
            action_type: n.action_type || undefined,
            config: n.config || {}
          }
        });
      });
    }

    if (dsl.edges && Array.isArray(dsl.edges)) {
      dsl.edges.forEach((e: any, i: number) => {
        edges.push({
          id: `edge-${i}-${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          type: 'smoothstep'
        });
      });
    }

    return { nodes, edges };
  } catch (err) {
    console.error("Failed to parse DSL JSON", err);
    return { nodes: [], edges: [] };
  }
}

export function exportToBackendDsl(nodes: Node[], edges: Edge[]): string {
  const dsl = {
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      name: n.data.name,
      action_type: n.data.action_type,
      config: n.data.config,
      position: n.position
    })),
    edges: edges.map(e => ({
      from: e.source,
      to: e.target
    }))
  };

  return JSON.stringify(dsl);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];

  const startNodes = nodes.filter(n => n.type === 'start');
  const endNodes = nodes.filter(n => n.type === 'end');

  if (startNodes.length === 0) {
    errors.push("Workflow must have exactly one Start Node.");
  } else if (startNodes.length > 1) {
    errors.push("Workflow can only have one Start Node.");
  }

  if (endNodes.length === 0) {
    errors.push("Workflow must have at least one End Node.");
  }

  // Check action node configs
  const actionNodes = nodes.filter(n => n.type === 'action');
  actionNodes.forEach(n => {
    if (!n.data.action_type) {
      errors.push(`Action Node "${n.data.name}" is missing an Action Type.`);
    }
  });

  // Basic connectivity checks: Every node except start should have an incoming edge
  nodes.forEach(n => {
    if (n.type !== 'start') {
      const incoming = edges.some(e => e.target === n.id);
      if (!incoming) {
        errors.push(`Node "${n.data.name}" is unreachable (no incoming connections).`);
      }
    }
  });

  // Every node except end should have an outgoing edge
  nodes.forEach(n => {
    if (n.type !== 'end') {
      const outgoing = edges.some(e => e.source === n.id);
      if (!outgoing) {
        errors.push(`Node "${n.data.name}" does not lead anywhere (no outgoing connections).`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

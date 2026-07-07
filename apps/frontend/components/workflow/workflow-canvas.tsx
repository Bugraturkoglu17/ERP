import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode } from './nodes/start-node';
import { ActionNode } from './nodes/action-node';
import { EndNode } from './nodes/end-node';
import { ConditionNode } from './nodes/condition-node';
import { Play, Zap, Flag, Split } from 'lucide-react';

const nodeTypes = {
  start: StartNode,
  action: ActionNode,
  end: EndNode,
  condition: ConditionNode,
};

let id = 0;
const getId = () => `node_${id++}`;

function DnDSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
      <div className="text-sm font-semibold text-slate-800 mb-2">Node Palette</div>
      <div className="text-xs text-slate-500 mb-4">Drag nodes to the canvas</div>
      
      <div className="p-3 border border-slate-200 rounded-lg cursor-grab hover:bg-slate-50 flex items-center gap-3 transition-colors" onDragStart={(event) => onDragStart(event, 'action')} draggable>
        <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Action Node</span>
      </div>

      <div className="p-3 border border-slate-200 rounded-lg cursor-grab hover:bg-slate-50 flex items-center gap-3 transition-colors" onDragStart={(event) => onDragStart(event, 'condition')} draggable>
        <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Split className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Condition Node</span>
      </div>

      <div className="p-3 border border-slate-200 rounded-lg cursor-grab hover:bg-slate-50 flex items-center gap-3 transition-colors" onDragStart={(event) => onDragStart(event, 'end')} draggable>
        <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
          <Flag className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">End Node</span>
      </div>
    </aside>
  );
}

interface WorkflowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onCanvasChange: (nodes: Node[], edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
}

export function WorkflowCanvas({ initialNodes, initialEdges, onCanvasChange, onNodeSelect }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, type: 'smoothstep' }, eds);
        onCanvasChange(nodes, newEdges);
        return newEdges;
      });
    },
    [nodes, setEdges, onCanvasChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, config: {} },
      };

      setNodes((nds) => {
        const newNodes = nds.concat(newNode);
        onCanvasChange(newNodes, edges);
        return newNodes;
      });
    },
    [reactFlowInstance, edges, setNodes, onCanvasChange]
  );

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    if (nodes.length === 1) {
      onNodeSelect(nodes[0]);
    } else {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  // Handle node changes and propagate
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    // Use timeout to allow state to settle, since onNodesChange doesn't give us the updated nodes directly
    setTimeout(() => {
      setNodes((nds) => {
        onCanvasChange(nds, edges);
        return nds;
      });
    }, 0);
  }, [onNodesChange, edges, onCanvasChange, setNodes]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    setTimeout(() => {
      setEdges((eds) => {
        onCanvasChange(nodes, eds);
        return eds;
      });
    }, 0);
  }, [onEdgesChange, nodes, onCanvasChange, setEdges]);

  return (
    <div className="flex h-full w-full bg-slate-50">
      <DnDSidebar />
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          fitView
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export function WorkflowDesignerWrap(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflow } from "@/hooks/use-workflow-api";
import { apiPatch, apiPost } from "@/lib/api";
import { WorkflowDesignerWrap } from "@/components/workflow/workflow-canvas";
import { NodeConfigPanel } from "@/components/workflow/node-config-panel";
import { parseBackendDsl, exportToBackendDsl, validateWorkflow } from "@/lib/workflow-validation";
import { ArrowLeft, Save, UploadCloud, Play, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";

export default function WorkflowDesignerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { workflow, loading, error, mutate } = useWorkflow(id);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hydrate canvas when workflow loads
  useEffect(() => {
    if (workflow && workflow.dsl_json) {
      const parsed = parseBackendDsl(workflow.dsl_json);
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
    }
  }, [workflow, setNodes, setEdges]);

  // Clear errors on change
  useEffect(() => {
    setValidationErrors([]);
    setSuccessMessage(null);
  }, [nodes, edges]);

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        return { ...n, data };
      }
      return n;
    }));
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setValidationErrors([]);
      setSuccessMessage(null);

      const dslString = exportToBackendDsl(nodes, edges);
      await apiPatch(`/workflows/${id}`, {
        dsl_json: dslString
      });
      
      setSuccessMessage("Workflow saved successfully.");
      mutate();
    } catch (err: any) {
      setValidationErrors([err.message || "Failed to save workflow"]);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const val = validateWorkflow(nodes, edges);
    if (!val.valid) {
      setValidationErrors(val.errors);
      return;
    }

    try {
      setIsPublishing(true);
      setValidationErrors([]);
      setSuccessMessage(null);

      // First save it
      const dslString = exportToBackendDsl(nodes, edges);
      await apiPatch(`/workflows/${id}`, {
        dsl_json: dslString
      });

      // Then publish a new version
      await apiPost(`/workflows/${id}/versions`, {
        changes_description: "Published via visual designer"
      });

      setSuccessMessage("New version published successfully!");
      mutate();
    } catch (err: any) {
      setValidationErrors([err.response?.data?.detail || err.message || "Failed to publish workflow"]);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleManualTrigger = async () => {
    try {
      setIsTriggering(true);
      setValidationErrors([]);
      setSuccessMessage(null);

      const run: any = await apiPost(`/workflows/${id}/trigger`, {
        trigger_event_ref: "manual",
        payload: { source: "designer_manual_trigger" }
      });

      setSuccessMessage("Workflow triggered! Redirecting to run history...");
      setTimeout(() => {
        router.push(`/workflow/${id}/runs/${run.id}`);
      }, 1500);

    } catch (err: any) {
      setValidationErrors([err.response?.data?.detail || err.message || "Failed to trigger workflow"]);
    } finally {
      setIsTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-sm font-medium">Loading Designer...</span>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 p-6">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Failed to load workflow: {error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Navbar */}
      <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link 
            href="/workflow"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-slate-200 mx-1" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">{workflow.name}</h2>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">
              Active Version: {workflow.active_version_id ? workflow.active_version_id.split("-")[0] : "None"} • 
              Trigger: {workflow.trigger_type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Publish Version
          </button>

          <div className="h-6 w-px bg-slate-200 mx-2" />

          <button
            onClick={handleManualTrigger}
            disabled={isTriggering || !workflow.active_version_id}
            title={!workflow.active_version_id ? "Publish a version first" : "Trigger manually"}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50 disabled:grayscale"
          >
            {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Trigger
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 w-full max-w-lg">
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-lg text-sm flex flex-col gap-1">
            <div className="font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Validation Errors:</div>
            <ul className="list-disc pl-5">
              {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg shadow-lg text-sm flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            {successMessage}
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <WorkflowDesignerWrap
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          setNodes={setNodes}
          setEdges={setEdges}
          onNodeSelect={handleNodeSelect}
        />
        
        {/* Node Configuration Sidebar */}
        {selectedNode && (
          <NodeConfigPanel
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

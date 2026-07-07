"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflow } from "@/hooks/use-workflow-api";
import { apiPatch, apiPost } from "@/lib/api";
import { WorkflowDesignerWrap } from "@/components/workflow/workflow-canvas";
import { NodeConfigPanel } from "@/components/workflow/node-config-panel";
import { parseBackendDsl, exportToBackendDsl, validateWorkflow } from "@/lib/workflow-validation";
import { ArrowLeft, Save, UploadCloud, Play, AlertCircle, CheckCircle2, History, FlaskConical, X } from "lucide-react";
import Link from "next/link";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import { VersionHistoryPanel } from "@/components/workflow/version-history-panel";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { DataState } from "@/components/common/data-state";

type SimulationTraceNode = {
  node_id: string;
  node_type: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  branch_decision: boolean | null;
  simulated: boolean;
  error: string | null;
};

type SimulationResult = {
  status: "completed" | "failed";
  workflow_id: string;
  version_id: string | null;
  trace: SimulationTraceNode[];
  errors: string[];
};

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
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationPayload, setSimulationPayload] = useState("{}\n");
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  
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
  }, [setNodes]);

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

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      setValidationErrors([]);
      setSuccessMessage(null);

      const parsedPayload = simulationPayload.trim() ? JSON.parse(simulationPayload) : {};
      const result = await apiPost<SimulationResult>(`/workflows/${id}/simulate`, {
        dsl_json: exportToBackendDsl(nodes, edges),
        payload: parsedPayload,
      });

      setSimulationResult(result);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setValidationErrors([typeof detail === "string" ? detail : err.message || "Failed to simulate workflow"]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <DataState loading={loading} error={error} isEmpty={!workflow}>
        {workflow && (
          <>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  loading={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </Button>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  loading={isPublishing}
                  className="flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Publish Version
                </Button>

                <div className="h-6 w-px bg-slate-200 mx-2" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSimulationOpen(true)}
                  className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 flex items-center gap-2"
                >
                  <FlaskConical className="w-4 h-4" />
                  Simulate
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualTrigger}
                  loading={isTriggering}
                  disabled={!workflow.active_version_id}
                  title={!workflow.active_version_id ? "Publish a version first" : "Trigger manually"}
                  className="text-green-700 bg-green-50 border-green-200 hover:bg-green-100 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Trigger
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsVersionHistoryOpen(true)}
                  className="flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  History
                </Button>
              </div>
            </div>

            {/* Notifications */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 w-full max-w-lg">
              {validationErrors.length > 0 && (
                <Alert variant="danger" title="Validation Errors" icon={<AlertCircle className="w-5 h-5" />}>
                  <ul className="list-disc pl-5">
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </Alert>
              )}
              {successMessage && (
                <Alert variant="success" icon={<CheckCircle2 className="w-5 h-5" />}>
                  {successMessage}
                </Alert>
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
              
              {/* Version History Sidebar */}
              {isVersionHistoryOpen && (
                <VersionHistoryPanel
                  workflowId={id}
                  activeVersionId={workflow.active_version_id}
                  onClose={() => setIsVersionHistoryOpen(false)}
                />
              )}

              {isSimulationOpen && (
                <div className="absolute right-4 top-4 bottom-4 z-20 w-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Simulation Dry Run</h3>
                      <p className="text-xs text-slate-500">Runs the current canvas without dispatching actions.</p>
                    </div>
                    <button
                      onClick={() => setIsSimulationOpen(false)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex h-[calc(100%-57px)] flex-col gap-4 overflow-y-auto p-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Payload JSON
                      </label>
                      <textarea
                        value={simulationPayload}
                        onChange={(event) => setSimulationPayload(event.target.value)}
                        className="h-36 w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        spellCheck={false}
                      />
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunSimulation}
                      loading={isSimulating}
                      className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <FlaskConical className="h-4 w-4" />
                      Run Simulation
                    </Button>

                    {simulationResult && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <span className="text-xs font-semibold text-slate-500">Result</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${simulationResult.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {simulationResult.status}
                          </span>
                        </div>

                        {simulationResult.trace.map((item, index) => (
                          <div key={`${item.node_id}-${index}`} className="rounded-lg border border-slate-200 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.node_id}</p>
                                <p className="text-xs text-slate-500">{item.node_type}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.branch_decision !== null && (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.branch_decision ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                    branch: {String(item.branch_decision)}
                                  </span>
                                )}
                                {item.simulated && item.node_type === "action" && (
                                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                    Simulated
                                  </span>
                                )}
                              </div>
                            </div>
                            <pre className="max-h-28 overflow-auto rounded-md bg-slate-950 p-2 text-[11px] text-slate-100">
                              {JSON.stringify(item.output, null, 2)}
                            </pre>
                            {item.error && <p className="mt-2 text-xs text-red-600">{item.error}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}

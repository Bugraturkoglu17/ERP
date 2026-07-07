"use client";

import { useParams, useRouter } from "next/navigation";
import { useWorkflowRuns, useWorkflow } from "@/hooks/use-workflow-api";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Play, Loader2, RefreshCw, Activity } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { icon: any; text: string; bg: string; textClass: string }> = {
  pending: { icon: Clock, text: "Pending", bg: "bg-slate-100", textClass: "text-slate-600" },
  running: { icon: RefreshCw, text: "Running", bg: "bg-blue-100", textClass: "text-blue-700" },
  completed: { icon: CheckCircle2, text: "Completed", bg: "bg-green-100", textClass: "text-green-700" },
  failed: { icon: XCircle, text: "Failed", bg: "bg-red-100", textClass: "text-red-700" },
  cancelled: { icon: AlertCircle, text: "Cancelled", bg: "bg-amber-100", textClass: "text-amber-700" }
};

export default function WorkflowRunsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { workflow } = useWorkflow(id);
  const { runs, loading, error, mutate } = useWorkflowRuns(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-sm font-medium">Loading runs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Failed to load run history: {error}</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/workflow"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              Run History: {workflow?.name || "Workflow"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              View past executions and logs for this workflow.
            </p>
          </div>
        </div>
        <button
          onClick={() => mutate()}
          className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm transition-colors"
          title="Refresh List"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {runs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Activity className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No Runs Found</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              This workflow has not been executed yet. Trigger it manually from the designer to test it out.
            </p>
            <Link 
              href={`/workflow/${id}`}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" /> Go to Designer
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Run ID</th>
                  <th className="px-6 py-4">Trigger Ref</th>
                  <th className="px-6 py-4">Started At</th>
                  <th className="px-6 py-4">Completed At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run) => {
                  const conf = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
                  const Icon = conf.icon;
                  return (
                    <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", conf.bg, conf.textClass)}>
                          <Icon className={clsx("w-3.5 h-3.5", run.status === 'running' && "animate-spin")} />
                          {conf.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                        {run.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {run.trigger_event_ref || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {run.ended_at ? new Date(run.ended_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => router.push(`/workflow/${id}/runs/${run.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-xs"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

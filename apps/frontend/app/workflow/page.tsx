"use client";

import { useWorkflows } from "@/hooks/use-workflow-api";
import { useRouter } from "next/navigation";
import { Workflow, Plus, Edit2, Play, Activity, Clock, Loader2, AlertCircle, History } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function WorkflowListPage() {
  const router = useRouter();
  const { workflows, loading, error } = useWorkflows();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-sm font-medium">Loading workflows...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 p-6">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium text-center">Failed to load workflows:<br/>{error}</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {workflows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm mt-8">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Workflow className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Workflows Yet</h2>
          <p className="text-slate-500 mb-6 max-w-md">
            You haven&apos;t created any workflows. Start automating your processes by creating a new workflow from scratch or using a template.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/workflow/new")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Create Workflow
            </button>
            <button
              onClick={() => router.push("/workflow/templates")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Browse Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-start gap-4">
                <div className={clsx(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                  wf.is_active ? "bg-green-50 border-green-100 text-green-600" : "bg-slate-100 border-slate-200 text-slate-400"
                )}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-800">{wf.name}</h3>
                    <span className={clsx(
                      "px-2 py-0.5 text-xs font-semibold rounded-full border",
                      wf.is_active 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {wf.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">{wf.description || "No description provided."}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" /> Trigger: {wf.trigger_type || "manual"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Updated: {new Date(wf.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
                <Link
                  href={`/workflow/${wf.id}/runs`}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors"
                >
                  <History className="w-4 h-4" />
                  Runs
                </Link>
                <Link
                  href={`/workflow/${wf.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Designer
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

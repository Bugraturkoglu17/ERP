"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useWorkflowTriggers } from "@/hooks/use-workflow-api";
import { ArrowLeft, Check, Loader2, Workflow, Zap } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function NewWorkflowPage() {
  const router = useRouter();
  const { triggers, loading: triggersLoading } = useWorkflowTriggers();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workflow name is required.");
      return;
    }
    if (!selectedTrigger) {
      setError("Please select a trigger type.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // Constructing empty DSL matching the backend requirements
      const initialDsl = {
        nodes: [
          {
            id: "node-start",
            type: "start",
            name: "Start Trigger",
            config: { trigger_type: selectedTrigger }
          }
        ],
        edges: []
      };

      const triggerObj = triggers.find(t => t.event_name === selectedTrigger);
      const res: any = await apiPost("/workflows", {
        name,
        description,
        trigger_type: selectedTrigger,
        module_id: triggerObj?.module_id || "workflow",
        is_active: false,
        dsl_json: JSON.stringify(initialDsl)
      });

      if (res && res.id) {
        router.push(`/workflow/${res.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to create workflow");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/workflow"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            Create New Workflow
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Set up the basic details and choose how this workflow will be triggered.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Workflow Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Fatura Onay Süreci"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this workflow does..."
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Trigger Event <span className="text-red-500">*</span>
          </label>
          {triggersLoading ? (
            <div className="flex items-center text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading triggers...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {triggers.length > 0 ? (
                triggers.map((trigger) => (
                  <label
                    key={trigger.event_name}
                    className={clsx(
                      "relative flex flex-col p-4 cursor-pointer border rounded-xl transition-all",
                      selectedTrigger === trigger.event_name
                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="trigger_type"
                      value={trigger.event_name}
                      checked={selectedTrigger === trigger.event_name}
                      onChange={() => setSelectedTrigger(trigger.event_name)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center border",
                          selectedTrigger === trigger.event_name ? "bg-white border-blue-200 text-blue-600" : "bg-slate-100 border-slate-200 text-slate-500"
                        )}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <span className={clsx(
                            "block text-sm font-bold",
                            selectedTrigger === trigger.event_name ? "text-blue-900" : "text-slate-800"
                          )}>
                            {trigger.label_tr}
                          </span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            Modül: {trigger.module_id || "Genel"}
                          </span>
                        </div>
                      </div>
                      {selectedTrigger === trigger.event_name && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </label>
                ))
              ) : (
                <div className="col-span-full p-4 border border-slate-200 border-dashed rounded-xl text-center text-sm text-slate-500 bg-slate-50">
                  No trigger events configured in the system.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-2">
          <Link
            href="/workflow"
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !selectedTrigger}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Workflow className="w-4 h-4" /> Go to Designer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

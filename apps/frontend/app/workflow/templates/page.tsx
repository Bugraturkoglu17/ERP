"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useWorkflowTemplates } from "@/hooks/use-workflow-api";
import { Layers, Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export default function TemplatesGalleryPage() {
  const router = useRouter();
  const { templates, loading, error } = useWorkflowTemplates();
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<{ id: string; message: string } | null>(null);

  const handleClone = async (templateId: string, name: string) => {
    try {
      setCloningId(templateId);
      setCloneError(null);
      // Call backend clone endpoint
      const cloned: any = await apiPost(`/workflow-templates/${templateId}/clone`, {
        name: `${name} (Copy)`,
      });
      // Redirect to the newly created workflow
      if (cloned && cloned.id) {
        router.push(`/workflow/${cloned.id}`);
      }
    } catch (err: any) {
      console.error(err);
      // Usually backend returns 403 with standard format if entitlement is missing
      const msg = err.response?.data?.detail || "Bu şablon için gerekli modüller planınızda aktif değil.";
      setCloneError({ id: templateId, message: msg });
    } finally {
      setCloningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-sm font-medium">Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Failed to load templates: {error}</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Available Templates</h2>
        <p className="text-slate-500 text-sm mt-1">
          Kickstart your automation with pre-configured workflows. Some templates require specific modules to be active on your plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5 flex-1">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4 border border-blue-100">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{tpl.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                {tpl.description || "A standard workflow template designed for common use cases."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {tpl.required_modules && tpl.required_modules.split(",").map((mod: string) => (
                  <span key={mod} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                    Modül: {mod.trim()}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              {cloneError?.id === tpl.id && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cloneError?.message}</span>
                </div>
              )}
              
              <button
                onClick={() => handleClone(tpl.id, tpl.name)}
                disabled={cloningId === tpl.id}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                  cloningId === tpl.id
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                )}
              >
                {cloningId === tpl.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Clone to My Tenant
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-800">No Templates Found</h3>
            <p className="mt-1">There are no published templates available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

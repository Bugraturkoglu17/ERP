import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { X, Loader2, FileJson, Clock, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

export function VersionHistoryPanel({
  workflowId,
  onClose,
  activeVersionId,
}: {
  workflowId: string;
  onClose: () => void;
  activeVersionId: string | null;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const data = await apiGet(`/workflows/${workflowId}/versions`);
        setVersions(data as any[]);
      } catch (err) {
        console.error("Failed to fetch versions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [workflowId]);

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l shadow-2xl flex flex-col z-30">
      <div className="h-14 border-b flex items-center justify-between px-4 bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          Version History
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-sm text-slate-500 text-center p-4">No published versions yet.</div>
        ) : (
          versions.map((v) => {
            const isActive = v.id === activeVersionId;
            return (
              <div
                key={v.id}
                className={clsx(
                  "p-3 rounded-xl border flex flex-col gap-2 transition-all",
                  isActive ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Version {v.version_number}</span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(v.published_at).toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5" />
                  {v.id.split("-")[0]}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function History(props: any) {
  return <Clock {...props} />;
}

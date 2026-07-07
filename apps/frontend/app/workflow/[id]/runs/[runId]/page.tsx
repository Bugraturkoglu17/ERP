"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useWorkflowRun, useWorkflow } from "@/hooks/use-workflow-api";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Layers, RotateCcw, GitBranch } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { icon: any; text: string; bg: string; textClass: string }> = {
  pending: { icon: Clock, text: "Bekliyor", bg: "bg-slate-100", textClass: "text-slate-600" },
  running: { icon: RefreshCw, text: "Çalışıyor", bg: "bg-blue-100", textClass: "text-blue-700" },
  completed: { icon: CheckCircle2, text: "Tamamlandı", bg: "bg-green-100", textClass: "text-green-700" },
  failed: { icon: XCircle, text: "Başarısız", bg: "bg-red-100", textClass: "text-red-700" },
  cancelled: { icon: AlertCircle, text: "İptal edildi", bg: "bg-amber-100", textClass: "text-amber-700" }
};

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

export default function WorkflowRunDetailPage() {
  const { id, runId } = useParams() as { id: string; runId: string };
  const { workflow } = useWorkflow(id);
  const { run, loading, error, mutate, retryRun } = useWorkflowRun(runId);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await retryRun();
    } catch (e: any) {
      setRetryError(e.message);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-sm font-medium">Loading run details...</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Failed to load run details: {error}</span>
      </div>
    );
  }

  const conf = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
  const MainIcon = conf.icon;
  const canRetry = run.status === "failed" || run.status === "cancelled";

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/workflow/${id}/runs`}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Çalışma Detayları</h2>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span>{workflow?.name || "Workflow"}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs">{run.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border", conf.bg, conf.textClass, "border-current opacity-70")}>
            <MainIcon className={clsx("w-4 h-4", run.status === 'running' && "animate-spin")} />
            {conf.text}
          </span>

          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-60"
              title="Başarısız çalışmayı yeniden başlat"
            >
              {retrying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Yeniden Dene
            </button>
          )}

          <button
            onClick={() => mutate()}
            className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {retryError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Yeniden deneme başarısız: {retryError}
        </div>
      )}

      {/* Run overview */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Tetikleyici</div>
            <div className="text-sm text-slate-800">{run.trigger_event_ref || "Manuel"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Versiyon</div>
            <div className="text-sm text-slate-800 font-mono truncate" title={run.version_id}>{run.version_id?.split("-")[0]}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Başlangıç</div>
            <div className="text-sm text-slate-800">{run.started_at ? new Date(run.started_at).toLocaleString("tr-TR") : "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Toplam Süre</div>
            <div className="text-sm text-slate-800 font-medium">{formatDuration(run.started_at, run.ended_at)}</div>
          </div>
        </div>

        {/* Error banner */}
        {run.error_message && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Hata
            </div>
            <div className="font-mono text-xs">{run.error_message}</div>
          </div>
        )}

        {/* Timeline */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-400" />
            Yürütme Zaman Çizelgesi
          </h3>

          {!run.nodes || run.nodes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Henüz node yürütme kaydı yok.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-8 py-2">
              {run.nodes.map((node: any) => {
                const nConf = STATUS_CONFIG[node.status] || STATUS_CONFIG.pending;
                const NIcon = nConf.icon;
                const duration = formatDuration(node.started_at, node.ended_at);

                let outputData: any = null;
                if (node.output_data) {
                  try { outputData = JSON.parse(node.output_data); } catch {}
                }
                const isCondition = outputData?.result !== undefined;

                return (
                  <div key={node.id} className="relative">
                    <div className={clsx(
                      "absolute -left-[35px] w-6 h-6 rounded-full border-2 border-white flex items-center justify-center",
                      nConf.bg, nConf.textClass
                    )}>
                      <NIcon className={clsx("w-3.5 h-3.5", node.status === 'running' && "animate-spin")} />
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{node.node_id}</h4>
                          {isCondition && (
                            <span className={clsx(
                              "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                              outputData.result ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              <GitBranch className="w-3 h-3" />
                              {outputData.result ? "true" : "false"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">{duration}</span>
                          <span className={clsx("text-xs font-medium px-2 py-0.5 rounded", nConf.bg, nConf.textClass)}>
                            {nConf.text}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                        {node.started_at && (
                          <div>Başlangıç: {new Date(node.started_at).toLocaleTimeString("tr-TR")}</div>
                        )}
                        {node.ended_at && (
                          <div>Bitiş: {new Date(node.ended_at).toLocaleTimeString("tr-TR")}</div>
                        )}
                        <div className="col-span-2">
                          Deneme: {node.attempt_count} / {node.max_attempts || 3}
                        </div>
                      </div>

                      {node.error_message && (
                        <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded text-xs text-red-700 font-mono overflow-auto">
                          {node.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

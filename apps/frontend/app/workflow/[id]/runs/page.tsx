"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkflowRuns, useWorkflow } from "@/hooks/use-workflow-api";
import { apiPost } from "@/lib/api";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Play, Loader2, RefreshCw, Activity, Timer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { icon: any; text: string; bg: string; textClass: string; rowBg: string }> = {
  pending:   { icon: Clock,        text: "Bekliyor",    bg: "bg-slate-100",  textClass: "text-slate-600",  rowBg: "" },
  running:   { icon: RefreshCw,    text: "Çalışıyor",  bg: "bg-blue-100",   textClass: "text-blue-700",   rowBg: "bg-blue-50/40" },
  completed: { icon: CheckCircle2, text: "Tamamlandı", bg: "bg-green-100",  textClass: "text-green-700",  rowBg: "" },
  failed:    { icon: XCircle,      text: "Başarısız",  bg: "bg-red-100",    textClass: "text-red-700",    rowBg: "bg-red-50/40" },
  stalled:   { icon: Timer,        text: "Takıldı",    bg: "bg-amber-100",  textClass: "text-amber-700",  rowBg: "bg-amber-50/40" },
  cancelled: { icon: AlertCircle,  text: "İptal",      bg: "bg-slate-100",  textClass: "text-slate-600",  rowBg: "" },
};

const RETRYABLE = new Set(["failed", "stalled", "cancelled"]);

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "running", label: "Çalışıyor" },
  { value: "failed", label: "Başarısız" },
  { value: "stalled", label: "Takıldı" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal" },
];

export default function WorkflowRunsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { workflow } = useWorkflow(id);
  const [statusFilter, setStatusFilter] = useState("");
  const { runs, loading, error, mutate } = useWorkflowRuns(id, statusFilter || undefined);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (runId: string) => {
    setRetryingId(runId);
    try {
      const newRun: any = await apiPost(`/workflow-runs/${runId}/retry`, {});
      await mutate();
      router.push(`/workflow/${id}/runs/${newRun.id}`);
    } catch (e: any) {
      alert(`Yeniden deneme başarısız: ${e.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-sm font-medium">Çalışmalar yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Çalışma geçmişi yüklenemedi: {error}</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col h-full">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/workflow"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Çalışma Geçmişi: {workflow?.name || "Workflow"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">Yürütme geçmişini izleyin ve başarısız çalışmaları yeniden deneyin.</p>
          </div>
        </div>
        <button
          onClick={() => mutate()}
          className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm transition-colors"
          title="Yenile"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={clsx(
              "px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors",
              statusFilter === opt.value
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{runs.length} kayıt</span>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {runs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Activity className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Çalışma Bulunamadı</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              {statusFilter ? `"${statusFilter}" durumunda çalışma yok.` : "Bu workflow henüz çalıştırılmamış."}
            </p>
            {!statusFilter && (
              <Link
                href={`/workflow/${id}`}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" /> Designer&apos;a Git
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3">Run ID</th>
                  <th className="px-5 py-3">Tetikleyici</th>
                  <th className="px-5 py-3">Başlangıç</th>
                  <th className="px-5 py-3">Süre</th>
                  <th className="px-5 py-3 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run) => {
                  const conf = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
                  const Icon = conf.icon;
                  const isRetrying = retryingId === run.id;
                  return (
                    <tr key={run.id} className={clsx("hover:bg-slate-50 transition-colors", conf.rowBg)}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", conf.bg, conf.textClass)}>
                          <Icon className={clsx("w-3.5 h-3.5", run.status === "running" && "animate-spin")} />
                          {conf.text}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-400">
                        {run.id.split("-")[0]}&hellip;
                        {run.parent_run_id && (
                          <span className="ml-1 text-violet-500 text-[10px]" title={`Retry of ${run.parent_run_id}`}>↻ retry</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-xs">
                        {run.trigger_event_ref || "Manuel"}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-xs">
                        {run.started_at ? new Date(run.started_at).toLocaleString("tr-TR") : "—"}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-500">
                        {formatDuration(run.started_at, run.ended_at)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {RETRYABLE.has(run.status) && (
                            <button
                              onClick={() => handleRetry(run.id)}
                              disabled={isRetrying}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-60"
                            >
                              {isRetrying ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              Yeniden Dene
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/workflow/${id}/runs/${run.id}`)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Detaylar
                          </button>
                        </div>
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

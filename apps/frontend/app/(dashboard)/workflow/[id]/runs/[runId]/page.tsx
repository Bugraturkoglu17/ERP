"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkflowRun, useWorkflow } from "@/hooks/use-workflow-api";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Layers, RotateCcw, GitBranch, Timer,
  ChevronDown, ChevronRight, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { icon: any; text: string; bg: string; textClass: string }> = {
  pending:   { icon: Clock,        text: "Bekliyor",    bg: "bg-slate-100",  textClass: "text-slate-600" },
  running:   { icon: RefreshCw,    text: "Çalışıyor",  bg: "bg-blue-100",   textClass: "text-blue-700"  },
  completed: { icon: CheckCircle2, text: "Tamamlandı", bg: "bg-green-100",  textClass: "text-green-700" },
  failed:    { icon: XCircle,      text: "Başarısız",  bg: "bg-red-100",    textClass: "text-red-700"   },
  stalled:   { icon: Timer,        text: "Takıldı",    bg: "bg-amber-100",  textClass: "text-amber-700" },
  cancelled: { icon: AlertCircle,  text: "İptal",      bg: "bg-slate-100",  textClass: "text-slate-600" },
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

function JsonCollapse({ label, json }: { label: string; json: string | null }) {
  let parsed: any;
  try { parsed = json ? JSON.parse(json) : null; } catch { parsed = json; }

  const strJson = parsed ? JSON.stringify(parsed, null, 2) : "";
  const isSmall = strJson.split("\n").length <= 10;
  
  const [open, setOpen] = useState(isSmall);
  if (!json) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {label}
      </button>
      {open && (
        <pre className="mt-1.5 p-3 bg-slate-900 text-green-300 text-xs rounded-lg overflow-auto max-h-48 leading-relaxed font-mono">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function WorkflowRunDetailPage() {
  const { id, runId } = useParams() as { id: string; runId: string };
  const router = useRouter();
  const { workflow } = useWorkflow(id);
  const { run, loading, error, mutate, retryRun } = useWorkflowRun(runId);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const newRun: any = await retryRun();
      if (newRun?.id) {
        router.push(`/workflow/${id}/runs/${newRun.id}`);
      }
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
        <span className="ml-3 text-sm font-medium">Çalışma detayları yükleniyor...</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">Yüklenemedi: {error}</span>
      </div>
    );
  }

  const conf = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
  const MainIcon = conf.icon;
  const canRetry = run.status === "failed" || run.status === "stalled" || run.status === "cancelled";

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border", conf.bg, conf.textClass, "border-current opacity-80")}>
            <MainIcon className={clsx("w-4 h-4", run.status === "running" && "animate-spin")} />
            {conf.text}
          </span>

          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {retrying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Yeniden Dene
            </button>
          )}

          <button
            onClick={() => mutate()}
            className="p-2 text-slate-500 bg-white border border-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm transition-colors"
            title="Yenile"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Retry error */}
      {retryError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Yeniden deneme başarısız: {retryError}
        </div>
      )}

      {/* Stalled warning */}
      {run.status === "stalled" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Timer className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-800 text-sm">İş Akışı Takıldı</div>
            <div className="text-xs text-amber-700 mt-1">
              Bu çalışma 30 dakikadan fazla süredir ilerlemiyor. Sisteme yük bindiren bir işlem olabilir.
              {run.stalled_at && ` Tespit tarihi: ${new Date(run.stalled_at).toLocaleString("tr-TR")}`}
            </div>
          </div>
        </div>
      )}

      {/* Parent run link (retry chain) */}
      {run.parent_run_id && (
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-2 text-sm text-violet-700">
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Bu çalışma, başka bir çalışmanın yeniden denemesidir.</span>
          <button
            onClick={() => router.push(`/workflow/${id}/runs/${run.parent_run_id}`)}
            className="ml-auto flex items-center gap-1 text-xs font-semibold underline hover:no-underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Orijinal Çalışma
          </button>
        </div>
      )}

      {/* Overview */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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
            <div className="text-sm text-slate-800 font-semibold">{formatDuration(run.started_at, run.ended_at)}</div>
          </div>
        </div>

        {/* Run-level error */}
        {run.error_message && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Hata
            </div>
            <div className="font-mono text-xs text-red-800 whitespace-pre-wrap">{run.error_message}</div>
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
            <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6 py-2">
              {run.nodes.map((node: any) => {
                const nConf = STATUS_CONFIG[node.status] || STATUS_CONFIG.pending;
                const NIcon = nConf.icon;
                const duration = formatDuration(node.started_at, node.ended_at);
                const isFailed = node.status === "failed";

                let outputData: any = null;
                if (node.output_data) { try { outputData = JSON.parse(node.output_data); } catch {} }
                const isCondition = outputData?.result !== undefined;

                return (
                  <div key={node.id} className="relative">
                    <div className={clsx(
                      "absolute -left-[35px] w-6 h-6 rounded-full border-2 border-white flex items-center justify-center",
                      isFailed ? "ring-2 ring-red-400" : "",
                      nConf.bg, nConf.textClass
                    )}>
                      <NIcon className={clsx("w-3.5 h-3.5", node.status === "running" && "animate-spin")} />
                    </div>

                    <div className={clsx(
                      "bg-white border rounded-lg shadow-sm p-4",
                      isFailed ? "border-red-300 bg-red-50/30" : "border-slate-200"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className={clsx("font-bold", isFailed ? "text-red-800" : "text-slate-800")}>{node.node_id}</h4>
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

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        {node.started_at && <div>Başlangıç: {new Date(node.started_at).toLocaleTimeString("tr-TR")}</div>}
                        {node.ended_at && <div>Bitiş: {new Date(node.ended_at).toLocaleTimeString("tr-TR")}</div>}
                        <div className="col-span-2">Deneme: {node.attempt_count} / {node.max_attempts || 3}</div>
                      </div>

                      {node.error_message && (
                        <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded text-xs text-red-700 font-mono whitespace-pre-wrap">
                          {node.error_message}
                        </div>
                      )}

                      <JsonCollapse label="Girdi (input_data)" json={node.input_data} />
                      <JsonCollapse label="Çıktı (output_data)" json={node.output_data} />
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

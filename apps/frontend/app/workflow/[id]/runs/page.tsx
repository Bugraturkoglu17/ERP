"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflowRuns, useWorkflow } from "@/hooks/use-workflow-api";
import { apiPost } from "@/lib/api";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Play, RefreshCw, Activity, Timer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { DataState } from "@/components/common/data-state";
import { FilterBar } from "@/components/common/filter-bar";

const STATUS_CONFIG: Record<string, { icon: any; text: string; variant: "info" | "success" | "danger" | "warning" | "secondary"; rowBg: string }> = {
  pending:   { icon: Clock,        text: "Bekliyor",    variant: "secondary",  rowBg: "" },
  running:   { icon: RefreshCw,    text: "Çalışıyor",   variant: "info",       rowBg: "bg-blue-50/40" },
  completed: { icon: CheckCircle2, text: "Tamamlandı",  variant: "success",    rowBg: "" },
  failed:    { icon: XCircle,      text: "Başarısız",   variant: "danger",     rowBg: "bg-red-50/40" },
  stalled:   { icon: Timer,        text: "Takıldı",     variant: "warning",    rowBg: "bg-amber-50/40" },
  cancelled: { icon: AlertCircle,  text: "İptal",       variant: "secondary",  rowBg: "" },
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

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/workflow"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <PageHeader
            title={`Çalışma Geçmişi: ${workflow?.name || "Workflow"}`}
            description="Yürütme geçmişini izleyin ve başarısız çalışmaları yeniden deneyin."
            actions={
              <Button
                variant="outline"
                onClick={() => mutate()}
                title="Yenile"
                className="p-2"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <FilterBar
          options={STATUS_FILTER_OPTIONS}
          selectedValue={statusFilter}
          onChange={setStatusFilter}
        />
        <span className="text-xs text-slate-400">{runs?.length || 0} kayıt</span>
      </div>

      {/* Table & Data State wrapper */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <DataState
          loading={loading}
          error={error}
          isEmpty={!runs || runs.length === 0}
          emptyTitle="Çalışma Bulunamadı"
          emptyDescription={statusFilter ? `"${statusFilter}" durumunda çalışma yok.` : "Bu workflow henüz çalıştırılmamış."}
          emptyIcon={<Activity className="w-12 h-12 text-slate-300" />}
          emptyAction={
            !statusFilter ? (
              <Button variant="primary" onClick={() => router.push(`/workflow/${id}`)} className="flex items-center gap-2">
                <Play className="w-4 h-4" /> Designer&apos;a Git
              </Button>
            ) : undefined
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Durum</TableHead>
                <TableHead>Run ID</TableHead>
                <TableHead>Tetikleyici</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Süre</TableHead>
                <TableHead className="text-right">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs?.map((run) => {
                const conf = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
                const Icon = conf.icon;
                const isRetrying = retryingId === run.id;
                return (
                  <TableRow key={run.id} className={conf.rowBg}>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={conf.variant} className="flex items-center gap-1.5 w-fit">
                        <Icon className={`w-3.5 h-3.5 ${run.status === "running" ? "animate-spin" : ""}`} />
                        {conf.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-slate-400">
                      {run.id.split("-")[0]}&hellip;
                      {run.parent_run_id && (
                        <span className="ml-1 text-violet-500 text-[10px]" title={`Retry of ${run.parent_run_id}`}>↻ retry</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                      {run.trigger_event_ref || "Manuel"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                      {run.started_at ? new Date(run.started_at).toLocaleString("tr-TR") : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {formatDuration(run.started_at, run.ended_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {RETRYABLE.has(run.status) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRetry(run.id)}
                            disabled={isRetrying}
                            className="text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 flex items-center gap-1"
                          >
                            {isRetrying ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Yeniden Dene
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/workflow/${id}/runs/${run.id}`)}
                        >
                          Detaylar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataState>
      </div>
    </div>
  );
}

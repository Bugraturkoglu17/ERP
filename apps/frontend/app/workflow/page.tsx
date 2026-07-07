"use client";

import React from "react";
import { useWorkflows, useWorkflowStats } from "@/hooks/use-workflow-api";
import { useRouter } from "next/navigation";
import { Workflow, Plus, Edit2, Play, Activity, Clock, AlertCircle, History, CheckCircle2, RefreshCw, Timer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataState } from "@/components/common/data-state";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
}: {
  label: string;
  value: string | number;
  icon: any;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <Card className={bgClass}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkflowListPage() {
  const router = useRouter();
  const { workflows, loading, error } = useWorkflows();
  const { stats, loading: statsLoading } = useWorkflowStats();
  const dashboardStats = stats ?? {
    running: 0,
    failed: 0,
    stalled: 0,
    completedToday: 0,
    avgDurationMs: null,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Monitoring Dashboard Cards */}
      <div className={statsLoading ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 opacity-60" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"}>
        <StatCard
          label="Çalışıyor"
          value={dashboardStats.running}
          icon={RefreshCw}
          colorClass="bg-blue-100 text-blue-700"
          bgClass="bg-white border-slate-200"
        />
        <StatCard
          label="Başarısız"
          value={dashboardStats.failed}
          icon={AlertCircle}
          colorClass="bg-red-100 text-red-700"
          bgClass={dashboardStats.failed > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}
        />
        <StatCard
          label="Takıldı"
          value={dashboardStats.stalled}
          icon={Timer}
          colorClass="bg-amber-100 text-amber-700"
          bgClass={dashboardStats.stalled > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}
        />
        <StatCard
          label="Bugün Tamamlandı"
          value={dashboardStats.completedToday}
          icon={CheckCircle2}
          colorClass="bg-green-100 text-green-700"
          bgClass="bg-white border-slate-200"
        />
        <StatCard
          label="Ort. Süre"
          value={formatDuration(dashboardStats.avgDurationMs)}
          icon={Clock}
          colorClass="bg-violet-100 text-violet-700"
          bgClass="bg-white border-slate-200"
        />
      </div>

      {/* Data State wrapper */}
      <DataState
        loading={loading}
        error={error}
        isEmpty={workflows.length === 0}
        emptyTitle="Henüz Workflow Yok"
        emptyDescription="Süreçlerinizi otomatikleştirmek için yeni bir workflow oluşturun veya hazır şablon kullanın."
        emptyIcon={<Workflow className="w-8 h-8 text-blue-600" />}
        emptyAction={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => router.push("/workflow/new")}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Workflow Oluştur
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/workflow/templates")}
            >
              Şablonlara Göz At
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    wf.is_active ? "bg-green-50 border-green-100 text-green-600" : "bg-slate-100 border-slate-200 text-slate-400"
                  }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-800">{wf.name}</h3>
                      <Badge variant={wf.is_active ? "success" : "secondary"}>
                        {wf.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{wf.description || "Açıklama girilmemiş."}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" /> Tetikleyici: {wf.trigger_type || "manuel"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Güncelleme: {new Date(wf.updated_at).toLocaleDateString("tr-TR")}
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
                    Çalışmalar
                  </Link>
                  <Link
                    href={`/workflow/${wf.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Designer
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DataState>
    </div>
  );
}

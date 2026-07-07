"use client";

import React from "react";
import Link from "next/link";
import { FolderOpen, Store } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface ActiveJob {
  process_id: string;
  project_id: string;
  project_name: string;
  project_no?: string;
  process_title: string;
  current_stage?: string;
  target_end_date?: string;
  days_remaining?: number;
  work_type?: string;
}

function calcCountdown(days?: number): { text: string; color: string } {
  if (days == null) return { text: "—", color: "text-slate-400" };
  if (days > 0) return { text: `${days}g kaldı`, color: "text-blue-600" };
  if (days === 0) return { text: "Bugün teslim", color: "text-amber-600" };
  return { text: `${Math.abs(days)}g gecikti`, color: "text-red-600" };
}

interface ProcessListProps {
  jobs: ActiveJob[];
  stageColor?: string;
  hrefBuilder?: (job: ActiveJob) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export const ProcessList: React.FC<ProcessListProps> = ({
  jobs,
  stageColor = "text-amber-700 bg-amber-50",
  hrefBuilder,
  emptyTitle = "Aktif İş Bulunamadı",
  emptyDescription = "Bu alanda henüz aktif bir süreç bulunmamaktadır.",
  emptyAction,
}) => {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Store className="w-10 h-10 text-slate-200" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const cd = calcCountdown(job.days_remaining);
        const isOverdue = (job.days_remaining ?? 0) < 0;
        const href = hrefBuilder ? hrefBuilder(job) : `/workflow`;
        return (
          <Link
            key={job.process_id}
            href={href}
            className={`flex items-center gap-4 rounded-2xl border p-4 hover:shadow-sm transition-all ${
              isOverdue ? "border-red-100 bg-red-50/30" : "border-slate-200 bg-white"
            }`}
          >
            <div className={`h-2 w-2 shrink-0 rounded-full ${isOverdue ? "bg-red-400" : "bg-amber-400"}`} />
            <Store className="h-4 w-4 text-slate-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{job.project_name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400">{job.project_no ?? "—"}</span>
                <span className="text-[10px] text-slate-500">{job.process_title}</span>
                {job.current_stage && (
                  <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${stageColor}`}>
                    {job.current_stage}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-xs font-semibold ${cd.color}`}>{cd.text}</p>
              {job.target_end_date && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(job.target_end_date).toLocaleDateString("tr-TR")}
                </p>
              )}
            </div>
            <FolderOpen className="h-4 w-4 text-slate-300 shrink-0" />
          </Link>
        );
      })}
    </div>
  );
};

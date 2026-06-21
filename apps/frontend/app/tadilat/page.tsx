"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, FolderOpen, HardHat, Plus, Search, Store } from "lucide-react";
import { apiGet } from "@/lib/api";

type Project = {
  id: string; name: string; project_no?: string; status: string;
  scope_codes?: string[]; updated_at?: string;
};
type ActiveJob = {
  project_id: string; project_name: string; project_no?: string;
  work_type: string; process_title: string; current_stage?: string;
  target_end_date?: string; days_remaining?: number;
};

function calcCountdown(days?: number): { text: string; color: string } {
  if (days == null) return { text: "—",              color: "text-slate-400"  };
  if (days > 0)     return { text: `${days}g kaldı`, color: "text-blue-600"   };
  if (days === 0)   return { text: "Bugün teslim",   color: "text-amber-600"  };
  return               { text: `${Math.abs(days)}g gecikti`, color: "text-red-600" };
}

export default function TadilatPage() {
  const [jobs,     setJobs]     = useState<ActiveJob[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [j, p] = await Promise.all([
        apiGet<ActiveJob[]>("/process/active-jobs").catch(() => [] as ActiveJob[]),
        apiGet<Project[]>("/projects?limit=5000").catch(() => [] as Project[]),
      ]);
      setJobs((Array.isArray(j) ? j : []).filter(jb => jb.work_type === "tadilat"));
      setProjects(Array.isArray(p) ? p : []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() =>
    jobs.filter(j =>
      !query || j.project_name.toLowerCase().includes(query.toLowerCase())
    ), [jobs, query]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <HardHat className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Tadilat</h1>
            <p className="text-xs text-slate-500">Aktif tadilat işleri ve süreçleri</p>
          </div>
        </div>
        <Link href="/projects"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <Plus className="h-3.5 w-3.5" /> Tadilat Başlat
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aktif Tadilat",  value: jobs.length,                                           color: "text-blue-600"  },
          { label: "Süre Aşımı",     value: jobs.filter(j => (j.days_remaining ?? 0) < 0).length, color: "text-red-600"   },
          { label: "Bugün Teslim",   value: jobs.filter(j => j.days_remaining === 0).length,       color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Mağaza ara..."
          className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <HardHat className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">
            {jobs.length === 0 ? "Aktif tadilat işi bulunamadı. Mağaza detayından süreç başlatın." : "Arama sonucu bulunamadı."}
          </p>
          {jobs.length === 0 && (
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Mağaza Arşivine Git →</Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((j) => {
            const cd = calcCountdown(j.days_remaining);
            const isOverdue = (j.days_remaining ?? 0) < 0;
            return (
              <Link key={j.project_id}
                href={`/projects/${j.project_id}?tab=process`}
                className={`flex items-center gap-4 rounded-2xl border p-4 hover:shadow-sm transition-all ${
                  isOverdue ? "border-red-100 bg-red-50/30" : "border-slate-200 bg-white"
                }`}>
                <div className={`h-2 w-2 shrink-0 rounded-full ${isOverdue ? "bg-red-400" : "bg-amber-400"}`} />
                <Store className="h-4 w-4 text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{j.project_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400">{j.project_no ?? "—"}</span>
                    <span className="text-[10px] text-slate-500">{j.process_title}</span>
                    {j.current_stage && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5 font-medium">{j.current_stage}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xs font-semibold ${cd.color}`}>{cd.text}</p>
                  {j.target_end_date && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(j.target_end_date).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </div>
                <FolderOpen className="h-4 w-4 text-slate-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

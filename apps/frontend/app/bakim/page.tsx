"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CalendarDays, CheckCircle2, FolderOpen, Loader2,
  Receipt, Store, Upload, Wrench,
} from "lucide-react";
import { apiGet } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  project_no?: string;
  status: string;
  scope_codes?: string[];
  updated_at?: string;
};

type ServiceForm = {
  id: string;
  project_id: string;
  year: number;
  month: number;
  status: string;
  created_at: string;
};

const MONTHS_TR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                   "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

type TabKey = "tumu" | "bekleyen" | "yuklenen";

export default function BakimPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [forms,    setForms]    = useState<ServiceForm[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<TabKey>("tumu");

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps] = await Promise.all([
          apiGet<Project[]>("/projects?limit=5000").catch(() => [] as Project[]),
        ]);
        const allProjects = Array.isArray(ps) ? ps : [];
        // Bakım mağazaları: scope_codes'da 'bakim' veya status'ı belirli olanlar
        const bakimProjects = allProjects.filter(
          (p) => p.scope_codes?.includes("bakim") || p.scope_codes?.includes("seismic")
        );
        setProjects(bakimProjects.length > 0 ? bakimProjects : allProjects.slice(0, 50));
      } finally { setLoading(false); }
    })();
  }, []);

  const projectsWithForm = useMemo(() => {
    const ids = new Set(
      forms.filter(f => f.year === currentYear && f.month === currentMonth).map(f => f.project_id)
    );
    return ids;
  }, [forms, currentYear, currentMonth]);

  const bekleyenler   = projects.filter(p => !projectsWithForm.has(p.id));
  const yuklenmisDizi = projects.filter(p => projectsWithForm.has(p.id));

  const displayed = tab === "tumu" ? projects : tab === "bekleyen" ? bekleyenler : yuklenmisDizi;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
          <Wrench className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Bakım & Onarım</h1>
          <p className="text-xs text-slate-500">Aylık servis formları ve bakım takibi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bakım Mağazası",     value: projects.length,        icon: Store,         color: "text-blue-600"   },
          { label: "Form Bekleyen",       value: bekleyenler.length,     icon: AlertCircle,   color: "text-amber-600"  },
          { label: "Form Yüklenen",       value: yuklenmisDizi.length,   icon: CheckCircle2,  color: "text-green-600"  },
          { label: "Bu Ay",               value: `${MONTHS_TR[currentMonth]} ${currentYear}`, icon: CalendarDays, color: "text-slate-600" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["tumu", "bekleyen", "yuklenen"] as TabKey[]).map((t) => {
          const labels = { tumu: "Tüm Mağazalar", bekleyen: `Form Bekleyen (${bekleyenler.length})`, yuklenen: `Form Yüklenen (${yuklenmisDizi.length})` };
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Wrench className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {displayed.map((p) => {
            const hasCurrent = projectsWithForm.has(p.id);
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className={`h-2 w-2 shrink-0 rounded-full ${hasCurrent ? "bg-green-400" : "bg-amber-400"}`} />
                <Store className="h-4 w-4 text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">{p.project_no ?? "—"}</span>
                    <span className={`text-[10px] font-semibold ${hasCurrent ? "text-green-600" : "text-amber-600"}`}>
                      {hasCurrent ? "Form yüklendi" : "Form bekleniyor"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/projects/${p.id}?tab=servisform`}
                    className="flex items-center gap-1 text-[11px] text-blue-600 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-blue-50">
                    <Upload className="h-3 w-3" /> Servis Formu
                  </Link>
                  <Link href={`/projects/${p.id}?tab=hakkediş`}
                    className="flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50">
                    <Receipt className="h-3 w-3" /> Hakkediş
                  </Link>
                  <Link href={`/projects/${p.id}`}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700">
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

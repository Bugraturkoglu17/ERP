"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, CheckCircle2, Flame, FolderOpen, HardHat,
  Loader2, Plus, Search, Store, Thermometer, Wrench, X,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type Project = {
  id: string; name: string; project_no?: string; status: string;
  scope_codes?: string[]; updated_at?: string;
};
type ActiveJob = {
  project_id: string; project_name: string; project_no?: string;
  process_id: string;
  work_type: string; process_title: string; current_stage?: string;
  target_end_date?: string; days_remaining?: number;
};

const SCOPE_OPTIONS = [
  { value: "yangin_dolabi",   label: "Yangın Tesisatı",           icon: Flame       },
  { value: "sprinkler_hatti", label: "Sprinkler Revizyonu",       icon: Wrench      },
  { value: "havalandirma",    label: "Havalandırma Revizyonu",    icon: Wrench      },
  { value: "kanal_imalati",   label: "Kanal Tadilatı",            icon: Wrench      },
  { value: "klima_sogutma",   label: "Klima / Soğutma Revizyonu", icon: Thermometer },
  { value: "mekanik_tesisat", label: "Mekanik Tesisat Revizyonu", icon: HardHat     },
  { value: "diger",           label: "Diğer",                     icon: Wrench      },
] as const;
type ScopeValue = typeof SCOPE_OPTIONS[number]["value"];

function getScopeLabel(code: string) {
  return SCOPE_OPTIONS.find(o => o.value === code)?.label ?? code;
}

// ── Tadilat Başlat Modalı ─────────────────────────────────────────────────────

function TadilatBaslatModal({ projects, onClose, onDone }: {
  projects: Project[]; onClose: () => void; onDone: () => void;
}) {
  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const [query,      setQuery]      = useState("");
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [scopeCodes, setScopeCodes] = useState<ScopeValue[]>([]);
  const [form,       setForm]       = useState({ title: "", description: "", start_date: new Date().toISOString().split("T")[0], target_end_date: "", responsible_name: "" });
  const [busy,       setBusy]       = useState(false);
  const [err,        setErr]        = useState("");

  const filtered = projects.filter(p =>
    !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.project_no ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const toggleScope = (v: ScopeValue) =>
    setScopeCodes(prev => prev.includes(v) ? prev.filter(c => c !== v) : [...prev, v]);

  const handleSubmit = async () => {
    if (!selProject) return;
    setBusy(true); setErr("");
    try {
      if (scopeCodes.length <= 1) {
        await apiPost(`/process/projects/${selProject.id}/process`, {
          work_type: "tadilat",
          title: form.title.trim() || (scopeCodes[0] ? getScopeLabel(scopeCodes[0]) : "Tadilat Süreci"),
          scope_code: scopeCodes[0] ?? null,
          description: form.description.trim() || null,
          start_date: form.start_date ? `${form.start_date}T00:00:00` : null,
          target_end_date: form.target_end_date ? `${form.target_end_date}T00:00:00` : null,
          responsible_name: form.responsible_name || null,
        });
      } else {
        await apiPost(`/process/projects/${selProject.id}/process/bulk`, {
          work_type: "tadilat",
          title: form.title.trim() || "Tadilat Süreci",
          scope_codes: scopeCodes,
          description: form.description.trim() || null,
          start_date: form.start_date ? `${form.start_date}T00:00:00` : null,
          target_end_date: form.target_end_date ? `${form.target_end_date}T00:00:00` : null,
          responsible_name: form.responsible_name || null,
        });
      }
      onDone(); onClose();
    } catch (ex: any) {
      setErr(ex?.response?.data?.detail ?? "Süreç başlatılamadı.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tadilat Başlat</h3>
            <p className="text-[11px] text-slate-400">Adım {step} / 3</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-300 hover:text-slate-600" /></button>
        </div>

        <div className="flex px-6 pt-4 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? "bg-amber-500" : "bg-slate-100"}`} />
          ))}
        </div>

        <div className="px-6 py-5 space-y-3 min-h-[280px]">

          {/* Adım 1: Mağaza seç */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Mağaza Seçin</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Mağaza adı veya kodu..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              {selProject && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selProject.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{selProject.project_no ?? "—"}</p>
                  </div>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 rounded-xl border border-slate-200">
                {filtered.slice(0, 30).map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setSelProject(p); setQuery(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                      selProject?.id === p.id ? "bg-amber-50" : ""
                    }`}>
                    <Store className="h-4 w-4 text-slate-300 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{p.project_no ?? "—"}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-4 py-6 text-xs text-center text-slate-400">Sonuç bulunamadı.</p>}
              </div>
            </div>
          )}

          {/* Adım 2: Tadilat kapsamı */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Tadilat Kapsamı</p>
                <p className="text-xs text-slate-500 mt-0.5">Her seçim için ayrı süreç kartı oluşturulur.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SCOPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const sel = scopeCodes.includes(opt.value);
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => toggleScope(opt.value)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                        sel ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300"
                      }`}>
                      <Icon className={`h-4 w-4 shrink-0 ${sel ? "text-amber-600" : "text-slate-400"}`} />
                      <span className={`text-xs font-medium ${sel ? "text-amber-700" : "text-slate-700"}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {scopeCodes.length > 0 && (
                <p className="text-[11px] text-amber-600 font-medium">
                  {scopeCodes.length} kapsam seçildi → {scopeCodes.length} süreç kartı oluşturulacak
                </p>
              )}
            </div>
          )}

          {/* Adım 3: Süreç bilgileri */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Süreç Bilgileri</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Süreç Adı (opsiyonel)</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={scopeCodes[0] ? getScopeLabel(scopeCodes[0]) : "Tadilat Süreci"}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Başlangıç Tarihi</label>
                  <input type="date" value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hedef Bitiş</label>
                  <input type="date" value={form.target_end_date}
                    onChange={e => setForm(p => ({ ...p, target_end_date: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sorumlu Kişi</label>
                <input value={form.responsible_name}
                  onChange={e => setForm(p => ({ ...p, responsible_name: e.target.value }))}
                  placeholder="Atanmadı"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Tadilat kapsamı veya notlar..."
                  rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none" />
              </div>
            </div>
          )}

          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        <div className="flex justify-between border-t border-slate-100 px-6 py-4">
          <button type="button"
            onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3) : onClose()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {step > 1 ? "Geri" : "Vazgeç"}
          </button>
          {step < 3 ? (
            <button type="button"
              onClick={() => {
                if (step === 1 && !selProject) { setErr("Lütfen bir mağaza seçin."); return; }
                if (step === 2 && scopeCodes.length === 0) { setErr("En az bir kapsam seçin."); return; }
                setErr(""); setStep(s => (s + 1) as 1 | 2 | 3);
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              İleri →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tadilat Başlat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function calcCountdown(days?: number): { text: string; color: string } {
  if (days == null) return { text: "—",              color: "text-slate-400"  };
  if (days > 0)     return { text: `${days}g kaldı`, color: "text-blue-600"   };
  if (days === 0)   return { text: "Bugün teslim",   color: "text-amber-600"  };
  return               { text: `${Math.abs(days)}g gecikti`, color: "text-red-600" };
}

export default function TadilatPage() {
  const [jobs,        setJobs]        = useState<ActiveJob[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [showModal,   setShowModal]   = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [j, p] = await Promise.all([
      apiGet<ActiveJob[]>("/process/active-jobs").catch(() => [] as ActiveJob[]),
      apiGet<Project[]>("/projects?limit=5000").catch(() => [] as Project[]),
    ]);
    const all = (Array.isArray(j) ? j : []).filter(jb => jb.work_type === "tadilat");
    const seen = new Set<string>();
    setJobs(all.filter(jb => { if (seen.has(jb.process_id)) return false; seen.add(jb.process_id); return true; }));
    setProjects(Array.isArray(p) ? p : []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

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
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Tadilat Başlat
        </button>
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
            {jobs.length === 0 ? "Henüz aktif tadilat işi yok." : "Arama sonucu bulunamadı."}
          </p>
          {jobs.length === 0 && (
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
              <Plus className="h-3.5 w-3.5" /> Tadilat Başlat
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((j) => {
            const cd = calcCountdown(j.days_remaining);
            const isOverdue = (j.days_remaining ?? 0) < 0;
            return (
              <Link key={j.process_id}
                href={`/tadilat/surecleri/${j.process_id}?p=${j.project_id}`}
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

      {showModal && (
        <TadilatBaslatModal
          projects={projects}
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); loadAll(); }}
        />
      )}
    </div>
  );
}

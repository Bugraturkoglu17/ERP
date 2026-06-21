"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  HardHat,
  Plus,
  Search,
  Store,
  UploadCloud,
  FileArchive,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { apiGet } from "@/lib/api";

// ── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  project_no?: string;
  status: string;
  scope_codes?: string[];
  start_date?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
}

interface Document {
  id: string;
  project_id: string;
  name: string;
  doc_type: string;
  version: number;
  created_at: string;
}

// ── Status / scope helpers ───────────────────────────────────────────────────

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  inquiry:      { label: "Keşif",        dot: "bg-purple-400", text: "text-purple-700" },
  INQUIRY:      { label: "Keşif",        dot: "bg-purple-400", text: "text-purple-700" },
  approved:     { label: "Onaylandı",    dot: "bg-green-400",  text: "text-green-700"  },
  APPROVED:     { label: "Onaylandı",    dot: "bg-green-400",  text: "text-green-700"  },
  in_progress:  { label: "Devam Ediyor", dot: "bg-blue-400",   text: "text-blue-700"   },
  IN_PROGRESS:  { label: "Devam Ediyor", dot: "bg-blue-400",   text: "text-blue-700"   },
  invoice_pend: { label: "Beklemede",    dot: "bg-amber-400",  text: "text-amber-700"  },
  INVOICE_PEND: { label: "Beklemede",    dot: "bg-amber-400",  text: "text-amber-700"  },
  completed:    { label: "Tamamlandı",   dot: "bg-slate-400",  text: "text-slate-600"  },
  COMPLETED:    { label: "Tamamlandı",   dot: "bg-slate-400",  text: "text-slate-600"  },
  cancelled:    { label: "İptal",        dot: "bg-red-400",    text: "text-red-700"    },
  CANCELLED:    { label: "İptal",        dot: "bg-red-400",    text: "text-red-700"    },
};

function isAktif(status: string) {
  const s = status.toLowerCase();
  return s === "in_progress" || s === "approved" || s === "invoice_pend";
}

// TODO: "iş tipi" (Bakım/Tadilat/Yeni Yapım) için backend'e ayrı bir alan eklenmesi gerekiyor.
// Şimdilik status'a göre tahmin yapılıyor.
function getIstipi(p: Project): { label: string; color: string } {
  if (p.status === "completed") return { label: "Tamamlandı", color: "bg-slate-100 text-slate-600" };
  if (p.scope_codes?.includes("seismic") && (p.status === "inquiry" || p.status === "approved"))
    return { label: "Bakım", color: "bg-sky-50 text-sky-700" };
  if (p.status === "in_progress" || p.status === "invoice_pend")
    return { label: "Tadilat", color: "bg-amber-50 text-amber-700" };
  return { label: "Yeni Yapım", color: "bg-emerald-50 text-emerald-700" };
}

const NOW = new Date();
const THIS_MONTH_START = new Date(NOW.getFullYear(), NOW.getMonth(), 1).toISOString();

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  iconClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${iconClass ?? "bg-slate-100 text-slate-600"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function MagazaCard({ project }: { project: Project }) {
  const st = STATUS[project.status] ?? { label: project.status, dot: "bg-slate-400", text: "text-slate-600" };
  const isTipi = getIstipi(project);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">
      {/* Üst satır */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{project.name}</p>
            {project.project_no && (
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{project.project_no}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.text} bg-slate-50 border border-slate-200`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {/* İş tipi + kapsam */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isTipi.color}`}>
          {isTipi.label}
        </span>
        {project.scope_codes?.slice(0, 2).map((code) => (
          <span key={code} className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
            {code}
          </span>
        ))}
      </div>

      {/* Alt satır */}
      <div className="flex items-center justify-between">
        {project.updated_at && (
          <p className="text-[11px] text-slate-400">
            Son güncelleme: {new Date(project.updated_at).toLocaleDateString("tr-TR")}
          </p>
        )}
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 ml-auto group-hover:underline"
        >
          Klasörü Aç <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Search ───────────────────────────────────────────────────────────────────

function SmartSearch({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.project_no ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, projects]);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Mağaza adı, mağaza kodu, şehir veya dosya adı ara..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {results.map((p) => {
            const st = STATUS[p.status];
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                onClick={() => setQuery("")}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <Store className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  {p.project_no && <p className="text-xs text-slate-400 font-mono">{p.project_no}</p>}
                </div>
                {st && (
                  <span className={`text-[11px] font-medium ${st.text}`}>{st.label}</span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-slate-200 bg-white shadow-lg px-4 py-3">
          <p className="text-sm text-slate-400">Sonuç bulunamadı.</p>
        </div>
      )}
    </div>
  );
}

// ── Active Job type ──────────────────────────────────────────────────────────

interface ActiveJob {
  project_id: string;
  project_name: string;
  project_no?: string;
  work_type: string;
  process_id: string;
  process_title: string;
  process_status: string;
  current_stage?: string;
  target_end_date?: string;
  days_remaining?: number;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  tadilat: "Tadilat", yeni_yapim: "Yeni Yapım", bakim: "Bakım",
};

function activeJobCountdown(days?: number, status?: string): { text: string; color: string } {
  if (status === "completed") return { text: "Tamamlandı", color: "text-green-600" };
  if (days == null) return { text: "Tarih yok", color: "text-slate-400" };
  if (days > 0)   return { text: `${days}g kaldı`, color: "text-blue-600" };
  if (days === 0) return { text: "Bugün!", color: "text-amber-600" };
  return { text: `${Math.abs(days)}g gecikti`, color: "text-red-600" };
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, d, jobs] = await Promise.all([
          apiGet<Project[]>("/projects?limit=5000"),
          apiGet<Document[]>("/documents").catch(() => [] as Document[]),
          apiGet<ActiveJob[]>("/process/active-jobs").catch(() => [] as ActiveJob[]),
        ]);
        setProjects(Array.isArray(p) ? p : []);
        setDocs(Array.isArray(d) ? d : []);
        setActiveJobs(Array.isArray(jobs) ? jobs : []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Veriler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const aktif = projects.filter((p) => isAktif(p.status)).length;
    const tadilatYeniYapim = projects.filter((p) => p.status.toLowerCase() === "in_progress").length;
    const buAyDocs = docs.filter((d) => d.created_at >= THIS_MONTH_START).length;
    const revizyonBekleyen = 0; // TODO: backend audit log endpoint gerekiyor
    return { total: projects.length, aktif, tadilatYeniYapim, buAyDocs, revizyonBekleyen };
  }, [projects, docs]);

  const sonMagazalar = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())
        .slice(0, 6),
    [projects]
  );


  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Başlık + Arama */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sismik Proje Arşivi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mağaza bazlı DWG, PDF ve proje revizyonlarını tek ekrandan yönetin.
          </p>
        </div>
        <SmartSearch projects={projects} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Store}
          label="Toplam Mağaza"
          value={stats.total}
          sub={`${activeJobs.length} aktif süreç`}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={HardHat}
          label="Aktif Tadilat / Yeni Yapım"
          value={stats.tadilatYeniYapim}
          sub="Devam eden projeler"
          iconClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={UploadCloud}
          label="Bu Ay Yüklenen Dosyalar"
          value={stats.buAyDocs}
          sub={new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={FileArchive}
          label="Revizyon Bekleyen"
          value={stats.revizyonBekleyen}
          sub="TODO: backend alanı gerekli"
          iconClass="bg-rose-50 text-rose-500"
        />
      </div>

      {/* Hızlı işlemler */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" /> Yeni Proje Başlat
        </Link>
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <UploadCloud className="h-4 w-4" /> Dosya Yükle
        </Link>
        <Link
          href="/projects?tip=tadilat"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <HardHat className="h-4 w-4" /> Tadilat & Yeni Yapım
        </Link>
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <FolderOpen className="h-4 w-4" /> Dosya Arşivi
        </Link>
      </div>

      {/* Ana içerik + Aktif İşler yan paneli */}
      <div className="flex gap-6 items-start">

        {/* Sol: Son Mağazalar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Son Güncellenen Mağazalar</h2>
            <Link href="/projects" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Tümünü gör →
            </Link>
          </div>

          {sonMagazalar.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Store className="mx-auto h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">Henüz mağaza eklenmemiş</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Projeler sayfasından ilk mağazayı oluşturabilirsiniz.
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" /> Yeni Proje Başlat
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sonMagazalar.map((p) => (
                <MagazaCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>

        {/* Sağ: Aktif İşler paneli */}
        <div className="w-72 shrink-0 hidden xl:block">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900">Aktif İşler</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                {activeJobs.length}
              </span>
            </div>
            {activeJobs.length === 0 ? (
              <div className="p-6 text-center">
                <HardHat className="mx-auto h-7 w-7 text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Aktif süreç bulunmuyor.</p>
                <p className="text-[10px] text-slate-300 mt-1">Mağaza detayından süreç başlatın.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                {activeJobs.map((job) => {
                  const cd = activeJobCountdown(job.days_remaining, job.process_status);
                  return (
                    <Link
                      key={job.process_id}
                      href={`/projects/${job.project_id}?tab=process`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        (job.days_remaining ?? 1) < 0 ? "bg-red-400" :
                        (job.days_remaining ?? 1) === 0 ? "bg-amber-400" : "bg-blue-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate leading-tight group-hover:text-blue-600">
                          {job.project_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {WORK_TYPE_LABELS[job.work_type] ?? job.work_type}
                          </span>
                          {job.current_stage && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                              {job.current_stage}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-semibold mt-0.5 ${cd.color}`}>{cd.text}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * apps/frontend/src/app/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Dashboard Ana Ekranı
 *
 * KPI Kartları:
 *  • Toplam Proje          (toplam proje sayısı)
 *  • Aktif Projeler        (status !== completed/cancelled)
 *  • Son 30 Günde Tamamlanan
 *  • Toplam Sözleşme Değeri
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import {
  FolderKanban,
  Hammer,
  CheckCircle2,
  Coins,
  Lock,
} from "lucide-react";
import { useAuth }                   from "@/contexts/AuthContext";
import type { Project }              from "@/types/api";
import { useMemo }                   from "react";

function asMoney(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/* ── Status etiketleri ───────────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; color: string }> = {
  inquiry:      { label: "Keşif",           color: "bg-gray-100 text-gray-700" },
  offer_sent:   { label: "Teklif Verildi",  color: "bg-blue-100  text-blue-700" },
  approved:     { label: "Onaylandı",        color: "bg-violet-100 text-violet-700" },
  in_progress:  { label: "Saha Çalışması",   color: "bg-amber-100 text-amber-700" },
  invoice_pend: { label: "Hakediş Bekliyor", color: "bg-orange-100 text-orange-700" },
  completed:    { label: "Teslim Edildi",    color: "bg-green-100 text-green-700" },
  cancelled:    { label: "İptal",            color: "bg-red-100   text-red-700" },
};

/* ── KPI kartı ──────────────────────────────────────────────────────────────── */
function KPICard({
  icon: Icon, title, value, tone,
}: {
  icon: React.ElementType;
  title: string;
  value: React.ReactNode;
  tone: "blue" | "amber" | "green" | "violet";
}) {
  const tones: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    amber:  "bg-amber-50 text-amber-600",
    green:  "bg-green-50 text-green-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`grid h-11 w-11 place-content-center shrink-0 rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

/* ── Proje satırı ───────────────────────────────────────────────────────────── */
function ProjectRow({ project }: { project: Project }) {
  const st = STATUS[project.status] ?? { label: project.status, color: "bg-gray-100 text-gray-700" };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 text-sm">{project.name}</span>
          {project.project_no && (
            <span className="text-xs font-mono text-gray-400">{project.project_no}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {st.label}
        </span>
      </td>
      <td className="text-sm text-gray-600 py-3 px-4">
        {project.contract_value != null
          ? new Intl.NumberFormat("tr-TR", {
              style: "currency", currency: "TRY", maximumFractionDigits: 0,
            }).format(asMoney(project.contract_value))
          : "—"}
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
          {st.label}
        </span>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
/* ═══════════════════════════════════════════════════════════════════════════════ */
  const {
    projects,        projectsLoading,
    projectsError,   user,
    isAuthenticated, isAuthReady,
  } = useAuth();

  // ── KPI'ları hesapla ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total      = projects.length;
    const active     = projects.filter(
      (p: Project) => !["completed", "cancelled"].includes(p.status),
    ).length;
    const completed30d = projects.filter(
      (p: Project) => p.status === "completed"
        && p.updated_at
        && (Date.now() - Date.parse(p.updated_at)) < 30 * 24 * 60 * 60_000,
    ).length;
    const totalValue = projects.reduce((sum: number, p: Project) => {
      return sum + asMoney(p.contract_value);
    }, 0);
    return { total, active, completed30d, totalValue };
  }, [projects]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Yükleniyor…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Lock className="h-10 w-10 mb-3 text-gray-300" />
        <p className="text-sm text-gray-600">
          Dashboard&apos;u görmek için lütfen giriş yapın.
        </p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="mb-2 text-sm font-medium text-red-600">Projeler yüklenirken hata oluştu.</p>
        <p className="text-xs text-gray-500">{projectsError}</p>
      </div>
    );
  }

  // ── Veri yükleniyor ─────────────────────────────────────────────────────────
  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Projeler yükleniyor…
        </div>
      </div>
    );
  }

  // ── KPI format ───────────────────────────────────────────────────────────────
  const fmtTRY = (n: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency", currency: "TRY", maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* ── Başlık ────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hoş geldiniz, {user?.full_name?.split(" ")[0] ?? "Kullanıcı"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Sistem durumu ve proje özeti aşağıda listelenmektedir.
        </p>
      </div>

      {/* ── KPI Kartları ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={FolderKanban} title="Toplam Proje"    value={kpis.total}                  tone="blue"   />
        <KPICard icon={Hammer}       title="Aktif Projeler"  value={kpis.active}                 tone="amber"  />
        <KPICard icon={CheckCircle2} title="Son 30 Gün"      value={kpis.completed30d}           tone="green"  />
        <KPICard icon={Coins}        title="Sözleşme Değeri" value={fmtTRY(kpis.totalValue)}     tone="violet" />
      </div>

      {/* ── Proje Listesi ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Projeler</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Toplam {projects.length} proje — en yeni önce listelenir
            </p>
          </div>
        </div>
        <div className="px-2">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FolderKanban className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Henüz proje bulunmamaktadır.</p>
              <p className="mt-1 text-xs text-gray-400">
                Yönetici panelinden yeni proje ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Proje Adı
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Kapsam
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Sözleşme Değeri
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Statü
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((p) => (
                    <ProjectRow key={p.id} project={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

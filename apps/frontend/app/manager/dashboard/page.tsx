"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  work_type: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:            { label: "Taslak",         cls: "bg-slate-700 text-white" },
  approval_pending: { label: "Onay Bekliyor",  cls: "bg-amber-500 text-white" },
  sent:             { label: "Gönderildi",     cls: "bg-blue-600 text-white" },
  started:          { label: "Başladı",        cls: "bg-blue-700 text-white" },
  material_waiting: { label: "Malzeme",        cls: "bg-orange-500 text-white" },
  revisit:          { label: "Tekrar Ziyaret", cls: "bg-violet-600 text-white" },
  completed:        { label: "Tamamlandı",     cls: "bg-emerald-600 text-white" },
  approved:         { label: "Onaylandı",      cls: "bg-emerald-600 text-white" },
  failed:           { label: "Başarısız",      cls: "bg-red-600 text-white" },
  cancelled:        { label: "İptal",          cls: "bg-slate-600 text-white" },
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low:      { label: "Düşük",  cls: "text-slate-400" },
  medium:   { label: "Orta",   cls: "text-amber-600 font-medium" },
  high:     { label: "Yüksek", cls: "text-orange-600 font-semibold" },
  critical: { label: "KRİTİK", cls: "text-red-600 font-black" },
};

function StatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_CONFIG[status] ?? { label: status, cls: "bg-slate-500 text-white" };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function PriorityLabel({ priority }: { priority: string }) {
  const { label, cls } = PRIORITY_CONFIG[priority] ?? { label: priority, cls: "text-slate-400" };
  return <span className={`text-xs ${cls}`}>{label}</span>;
}

export default function ManagerDashboardPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<WorkOrder[]>("/work-orders")
      .then((data) => setWorkOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const open       = workOrders.filter((w) => ["draft", "approval_pending", "sent"].includes(w.status));
  const inProgress = workOrders.filter((w) => ["started", "material_waiting", "revisit"].includes(w.status));
  const completed  = workOrders.filter((w) => ["completed", "approved"].includes(w.status));
  const critical   = workOrders.filter((w) => w.priority === "critical");

  const kpiCells = [
    {
      label: "Açık İş Emirleri",
      value: open.length,
      sub: open.filter((w) => w.status === "approval_pending").length > 0
        ? `${open.filter((w) => w.status === "approval_pending").length} onay bekliyor`
        : "Bekleyen yok",
      href: "/manager/is-emirleri",
      accent: false,
    },
    {
      label: "Devam Eden",
      value: inProgress.length,
      sub: "sahada aktif",
      href: "/manager/is-emirleri",
      accent: false,
    },
    {
      label: "Tamamlanan",
      value: completed.length,
      sub: "bu dönem",
      href: "/manager/is-emirleri",
      accent: false,
    },
    {
      label: "Kritik",
      value: critical.length,
      sub: critical.length > 0 ? "acil müdahale gerekiyor" : "—",
      href: "/manager/is-emirleri",
      accent: critical.length > 0,
    },
  ];

  const recent = [...workOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    /* Break out of layout padding to get edge-to-edge KPI strip */
    <div className="-m-4 sm:-m-6 lg:-m-8">

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white" aria-busy={loading}>
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-slate-200">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-8 py-6 space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-slate-200">
            {kpiCells.map((cell) => (
              <Link
                key={cell.label}
                href={cell.href}
                className={`group block px-8 py-6 transition-colors ${
                  cell.accent
                    ? "bg-red-50 hover:bg-red-100/60"
                    : "hover:bg-slate-50/80"
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  cell.accent ? "text-red-400" : "text-slate-400 group-hover:text-slate-500"
                }`}>
                  {cell.label}
                </p>
                <p className={`text-4xl font-black mt-2.5 tabular-nums leading-none ${
                  cell.accent && cell.value > 0 ? "text-red-600" : "text-slate-900"
                }`}>
                  {cell.value}
                </p>
                <p className={`text-xs mt-2 ${cell.accent ? "text-red-400" : "text-slate-400"}`}>
                  {cell.sub}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Work Orders Table ──────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Son İş Emirleri</h2>
            <Link
              href="/manager/is-emirleri"
              className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              Tümünü gör <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-4 border-b border-slate-100 last:border-0">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-52" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">Henüz iş emri yok.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Başlık
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Öncelik
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((wo) => (
                  <tr key={wo.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/manager/is-emirleri/${wo.id}`}
                        className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors"
                      >
                        {wo.title}
                      </Link>
                      {wo.work_type && (
                        <p className="text-xs text-slate-400 mt-0.5">{wo.work_type}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={wo.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityLabel priority={wo.priority} />
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs text-slate-400 tabular-nums">
                      {new Date(wo.created_at).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

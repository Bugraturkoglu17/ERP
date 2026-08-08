"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { apiGet } from "@/lib/api";

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  work_type: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  approval_pending: "Onay Bekliyor",
  sent: "Gönderildi",
  started: "Başladı",
  material_waiting: "Malzeme Bekliyor",
  revisit: "Tekrar Ziyaret",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal",
  approved: "Onaylandı",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-red-500",
};

export default function ManagerDashboardPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<WorkOrder[]>("/work-orders")
      .then((data) => setWorkOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const open = workOrders.filter((w) => ["draft", "approval_pending", "sent"].includes(w.status));
  const inProgress = workOrders.filter((w) => ["started", "material_waiting", "revisit"].includes(w.status));
  const completed = workOrders.filter((w) => ["completed", "approved"].includes(w.status));
  const critical = workOrders.filter((w) => w.priority === "critical");

  const cards = [
    { label: "Açık İş Emirleri", value: loading ? "…" : open.length, icon: ClipboardList, color: "bg-blue-500", href: "/manager/is-emirleri" },
    { label: "Devam Eden", value: loading ? "…" : inProgress.length, icon: Clock, color: "bg-amber-500", href: "/manager/is-emirleri" },
    { label: "Tamamlanan", value: loading ? "…" : completed.length, icon: CheckCircle, color: "bg-emerald-500", href: "/manager/is-emirleri" },
    { label: "Kritik", value: loading ? "…" : critical.length, icon: AlertTriangle, color: "bg-red-500", href: "/manager/is-emirleri" },
  ];

  const recent = [...workOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Operasyon özeti</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="block rounded-xl bg-white border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Son İş Emirleri</h2>
          <Link href="/manager/is-emirleri" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Tümünü gör <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : recent.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Henüz iş emri yok.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((wo) => (
              <li key={wo.id}>
                <Link
                  href={`/is-emirleri/${wo.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{wo.title}</p>
                    <p className="text-xs text-slate-400">{STATUS_LABEL[wo.status] ?? wo.status}</p>
                  </div>
                  <span className={`text-xs font-medium ${PRIORITY_COLOR[wo.priority] ?? "text-slate-400"}`}>
                    {wo.priority}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

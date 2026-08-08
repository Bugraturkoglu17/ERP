"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  approval_pending: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  started: "bg-indigo-100 text-indigo-700",
  material_waiting: "bg-orange-100 text-orange-700",
  revisit: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  approved: "bg-teal-100 text-teal-700",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "border-l-slate-300",
  medium: "border-l-amber-400",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

const COLUMNS = [
  {
    label: "Planlandı",
    statuses: ["draft", "approval_pending", "sent"],
    headerColor: "bg-slate-100 text-slate-600",
  },
  {
    label: "Devam Ediyor",
    statuses: ["started", "material_waiting", "revisit"],
    headerColor: "bg-blue-100 text-blue-700",
  },
  {
    label: "Tamamlandı",
    statuses: ["completed", "approved", "failed", "cancelled"],
    headerColor: "bg-emerald-100 text-emerald-700",
  },
];

export default function ManagerIsEmirleriPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet<WorkOrder[]>("/work-orders")
      .then((data) => setWorkOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = workOrders.filter((wo) =>
    wo.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">İş Emirleri</h1>
          <p className="mt-1 text-sm text-slate-500">{workOrders.length} iş emri</p>
        </div>
        <Link
          href="/is-emirleri"
          className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5"
        >
          Tam Görünüm →
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="İş emri ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = filtered.filter((wo) => col.statuses.includes(wo.status));
            return (
              <div key={col.label} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-2.5 ${col.headerColor}`}>
                  <span className="text-xs font-semibold">{col.label}</span>
                  <span className="text-xs font-bold">{items.length}</span>
                </div>
                <div className="bg-slate-50 p-2 space-y-2 min-h-[200px]">
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">Kayıt yok</p>
                  ) : (
                    items.map((wo) => (
                      <Link
                        key={wo.id}
                        href={`/is-emirleri/${wo.id}`}
                        className={`block rounded-lg bg-white border border-slate-200 border-l-4 ${PRIORITY_COLOR[wo.priority] ?? "border-l-slate-200"} p-3 hover:shadow-sm transition-shadow`}
                      >
                        <p className="text-sm font-medium text-slate-800 mb-1 line-clamp-2">{wo.title}</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[wo.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABEL[wo.status] ?? wo.status}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">
                            {new Date(wo.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

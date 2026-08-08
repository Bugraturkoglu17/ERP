"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getTokenPayloadFromStorage } from "@/lib/auth";

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to_user_id?: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
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
  sent: "bg-blue-100 text-blue-700",
  started: "bg-indigo-100 text-indigo-700",
  material_waiting: "bg-amber-100 text-amber-700",
  revisit: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  approved: "bg-teal-100 text-teal-700",
};

export default function UserDashboardPage() {
  const [allOrders, setAllOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (payload?.sub) setCurrentUserId(payload.sub);

    apiGet<WorkOrder[]>("/work-orders")
      .then((data) => setAllOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myOrders = currentUserId
    ? allOrders.filter((wo) => wo.assigned_to_user_id === currentUserId)
    : allOrders;

  const active = myOrders.filter((w) => ["started", "sent", "material_waiting", "revisit"].includes(w.status));
  const done = myOrders.filter((w) => ["completed", "approved"].includes(w.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Genel Bakış</h1>
        <p className="mt-1 text-sm text-slate-500">Bana atanan iş emirleri</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Toplam", value: loading ? "…" : myOrders.length, icon: ClipboardList, color: "bg-teal-500" },
          { label: "Devam Eden", value: loading ? "…" : active.length, icon: Clock, color: "bg-amber-500" },
          { label: "Tamamlanan", value: loading ? "…" : done.length, icon: CheckCircle, color: "bg-emerald-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Aktif İşlerim</h2>
          <Link href="/user/islerim" className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
            Tümünü gör <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        ) : active.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {currentUserId ? "Aktif iş emri yok." : "Oturum açınız."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.slice(0, 5).map((wo) => (
              <li key={wo.id}>
                <Link
                  href={`/is-emirleri/${wo.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{wo.title}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[wo.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABEL[wo.status] ?? wo.status}
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

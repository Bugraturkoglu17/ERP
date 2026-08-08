"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getTokenPayloadFromStorage } from "@/lib/auth";

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  work_type: string;
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

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export default function UserIslerimPage() {
  const [allOrders, setAllOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
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

  const filtered = myOrders.filter((wo) =>
    wo.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">İşlerim</h1>
        <p className="mt-1 text-sm text-slate-500">{myOrders.length} iş emri atanmış</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 py-20 text-center">
          <p className="text-sm text-slate-400">
            {q ? "Aramayla eşleşen iş emri bulunamadı." : "Henüz atanmış iş emri yok."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => (
            <Link
              key={wo.id}
              href={`/is-emirleri/${wo.id}`}
              className="flex items-center gap-4 rounded-xl bg-white border border-slate-200 px-4 py-3.5 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[wo.priority] ?? "bg-slate-400"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{wo.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(wo.created_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[wo.status] ?? "bg-slate-100 text-slate-600"}`}>
                {STATUS_LABEL[wo.status] ?? wo.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

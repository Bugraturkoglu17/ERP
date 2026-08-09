"use client";

import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  getUserWorkOrders,
  CATEGORY_LABEL,
  STATUS_LABEL,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/services/managerWorkOrders";

const STATUS_COLOR: Record<WorkOrderStatus, string> = {
  planned:    "bg-blue-100 text-blue-700",
  in_progress:"bg-orange-100 text-orange-700",
  completed:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-slate-100 text-slate-500",
};

const PRIORITY_DOT: Record<string, string> = {
  normal:    "bg-slate-400",
  important: "bg-amber-400",
  critical:  "bg-red-500",
};

export default function UserIslerimPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (user?.id) setOrders(getUserWorkOrders(user.id));
  }, [user?.id]);

  const filtered = useMemo(
    () => orders.filter((wo) => wo.title.toLowerCase().includes(q.toLowerCase())),
    [orders, q]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">İşlerim</h1>
        <p className="mt-1 text-sm text-slate-500">{orders.length} iş emri atanmış</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-20 text-center">
          <p className="text-sm text-slate-400">
            {q ? "Aramayla eşleşen iş emri bulunamadı." : "Henüz atanmış iş emri yok."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => (
            <div
              key={wo.id}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[wo.priority] ?? "bg-slate-400"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{wo.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {wo.store_name} · {CATEGORY_LABEL[wo.category]}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[wo.status]}`}>
                {STATUS_LABEL[wo.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

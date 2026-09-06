"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowRight, CalendarClock, CheckCircle2,
  ClipboardList, FileWarning, TimerReset, UsersRound,
} from "lucide-react";
import { getManagerWorkOrders, getTeamUsers, type TeamUser, type WorkOrder } from "@/services/managerWorkOrders";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentQuickSearch from "@/components/dashboard/document-quick-search";

function isOverdue(order: WorkOrder, referenceTime: number | null) {
  return Boolean(referenceTime && order.due_date && !["completed", "cancelled"].includes(order.status) && new Date(order.due_date).getTime() < referenceTime);
}

export default function ManagerDashboardPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [referenceTime, setReferenceTime] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getManagerWorkOrders(), getTeamUsers()])
      .then(([workOrders, team]) => { setOrders(workOrders); setUsers(team); setReferenceTime(Date.now()); })
      .catch(() => setError("Operasyon özeti yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => [
    { label: "Planlanacak", value: orders.filter((item) => item.status === "planned").length, icon: ClipboardList },
    { label: "Devam Eden", value: orders.filter((item) => item.status === "in_progress").length, icon: TimerReset },
    { label: "Tamamlanan", value: orders.filter((item) => item.status === "completed").length, icon: CheckCircle2 },
    { label: "Geciken", value: orders.filter((order) => isOverdue(order, referenceTime)).length, icon: CalendarClock },
    { label: "Kritik Raporlar", value: orders.filter((item) => item.has_critical_report).length, icon: FileWarning },
  ], [orders, referenceTime]);

  const attention = useMemo(() => orders
    .filter((order) => {
      const today = referenceTime ? new Date(referenceTime).toISOString().slice(0, 10) : "";
      const stale = referenceTime ? (referenceTime - new Date(order.updated_at).getTime()) / 86_400_000 > 3 : false;
      return isOverdue(order, referenceTime) || order.has_critical_report || order.due_date?.slice(0, 10) === today || (stale && !["completed", "cancelled"].includes(order.status));
    })
    .slice(0, 6), [orders, referenceTime]);

  const recent = useMemo(() => [...orders]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6), [orders]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Genel Bakış</h1><p className="mt-1 text-sm text-slate-500">Operasyonun güncel durumu ve öncelikli aksiyonlar.</p></div>
      </header>

      <DocumentQuickSearch />

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-5">
        {loading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="border-b border-r border-slate-100 p-5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-9 w-12" /></div>) : kpis.map(({ label, value, icon: Icon }) => <Link key={label} href="/manager/is-emirleri" className="group border-b border-r border-slate-100 p-5 transition hover:bg-slate-50"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-300 group-hover:text-blue-600" /></div><p className="mt-4 text-3xl font-bold tabular-nums text-slate-950">{value}</p></Link>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Dikkat Gerektirenler</h2></div>
          {loading ? <div className="space-y-3 p-5"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : attention.length === 0 ? <div className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" /><p className="mt-2 text-sm text-slate-500">Şu anda acil aksiyon gerektiren iş yok.</p></div> : <div>{attention.map((order) => <Link key={order.id} href={`/manager/is-emirleri/${order.id}`} className="flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-0 hover:bg-slate-50"><span className={`h-9 w-1 rounded-full ${isOverdue(order, referenceTime) ? "bg-red-500" : order.has_critical_report ? "bg-amber-500" : "bg-blue-500"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{order.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{order.store_name} | {order.assigned_to_name}</p></div><ArrowRight className="h-4 w-4 text-slate-300" /></Link>)}</div>}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Ekip İş Yükü</h2><UsersRound className="h-4 w-4 text-slate-300" /></div>
          {loading ? <div className="space-y-3 p-5"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : users.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Aktif çalışan bulunamadı.</p> : <div className="divide-y divide-slate-100">{users.map((user) => { const mine = orders.filter((order) => order.assigned_to === user.id); return <div key={user.id} className="grid grid-cols-[1fr_repeat(3,auto)] items-center gap-4 px-5 py-3"><p className="truncate text-sm font-medium text-slate-800">{user.full_name || user.email}</p><span className="text-center text-xs text-slate-500"><strong className="block text-sm text-slate-900">{mine.filter((item) => item.status === "planned").length}</strong>Plan</span><span className="text-center text-xs text-slate-500"><strong className="block text-sm text-slate-900">{mine.filter((item) => item.status === "in_progress").length}</strong>Aktif</span><span className="text-center text-xs text-slate-500"><strong className="block text-sm text-red-600">{mine.filter((order) => isOverdue(order, referenceTime)).length}</strong>Geciken</span></div>; })}</div>}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Son Hareketler</h2><Link href="/manager/is-emirleri" className="text-xs font-semibold text-blue-700 hover:text-blue-800">Tümünü Gör</Link></div>
        {recent.length === 0 && !loading ? <p className="px-5 py-10 text-center text-sm text-slate-500">Henüz hareket bulunmuyor.</p> : <div className="divide-y divide-slate-100">{recent.map((order) => <Link key={order.id} href={`/manager/is-emirleri/${order.id}`} className="grid gap-1 px-5 py-3.5 hover:bg-slate-50 sm:grid-cols-[1fr_auto]"><p className="text-sm text-slate-700"><span className="font-semibold">{order.assigned_to_name}</span>: {order.title} güncellendi.</p><time className="text-xs text-slate-400">{new Date(order.updated_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time></Link>)}</div>}
      </section>
    </div>
  );
}

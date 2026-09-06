"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, FileText, Loader2, Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getManagerWorkOrders, type WorkOrder } from "@/services/managerWorkOrders";

type ReportPhoto = {
  id: string; file_name?: string; mime_type?: string; fresh_url?: string;
};
type Report = {
  id: string; work_order_id: string; title: string; description?: string;
  severity: "normal" | "important" | "critical"; created_by_name?: string;
  created_at: string; photos?: ReportPhoto[]; photo_count?: number;
};
type ReportRow = Report & { order?: WorkOrder };

const severityLabel = { normal: "Normal", important: "Önemli", critical: "Kritik" };
const severityClass = {
  normal: "bg-slate-100 text-slate-600",
  important: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-700",
};

export default function ManagerReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const orders = await getManagerWorkOrders();
        const reportGroups = await Promise.all(
          orders.map((order) => apiGet<Report[]>(`/work-orders/${order.id}/reports`).catch(() => [])),
        );
        if (!active) return;
        setRows(reportGroups.flatMap((reports, index) => reports.map((report) => ({ ...report, order: orders[index] }))).sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } catch {
        if (active) setError("Raporlar yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    if (severity !== "all" && row.severity !== severity) return false;
    const haystack = `${row.title} ${row.description ?? ""} ${row.order?.title ?? ""} ${row.order?.store_name ?? ""} ${row.created_by_name ?? ""}`.toLocaleLowerCase("tr-TR");
    return haystack.includes(query.trim().toLocaleLowerCase("tr-TR"));
  }), [query, rows, severity]);

  const criticalCount = rows.filter((row) => row.severity === "critical").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Operasyon kayıtları</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Raporlar</h1>
          <p className="mt-1 text-sm text-slate-500">Tüm iş emirlerindeki saha raporlarını tek ekrandan inceleyin.</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <p className="text-xs font-medium text-red-600">Kritik rapor</p>
          <p className="text-xl font-bold tabular-nums text-red-800">{criticalCount}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_190px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rapor, iş emri, mağaza veya kullanıcı ara" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
        </label>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500">
          <option value="all">Tüm önem seviyeleri</option>
          <option value="normal">Normal</option>
          <option value="important">Önemli</option>
          <option value="critical">Kritik</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Raporlar yükleniyor</div>
          : error ? <p className="px-5 py-14 text-center text-sm text-red-600">{error}</p>
          : filtered.length === 0 ? <div className="px-5 py-16 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Eşleşen rapor bulunamadı.</p></div>
          : <div className="divide-y divide-slate-100">{filtered.map((row) => (
            <article key={row.id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:grid-cols-[120px_1fr_190px_minmax(120px,auto)_auto] sm:items-center">
              <div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityClass[row.severity]}`}>{row.severity === "critical" && <AlertTriangle className="h-3 w-3" />}{severityLabel[row.severity]}</span></div>
              <div className="min-w-0"><Link href={`/manager/is-emirleri/${row.work_order_id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-blue-700">{row.title}</Link><p className="mt-0.5 truncate text-xs text-slate-500">{row.description || "Açıklama eklenmedi"}</p></div>
              <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-700">{row.order?.store_name ?? "Mağaza bilgisi yok"}</p><p className="truncate text-xs text-slate-400">{row.order?.title ?? "İş emri"} | {row.created_by_name ?? "Kullanıcı"}</p></div>
              <div className="flex gap-2 overflow-x-auto" aria-label="Rapor görselleri">
                {(row.photos ?? []).filter(photo => photo.mime_type?.startsWith("image/")).map(photo => (
                  <div key={photo.id} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100" title={photo.file_name}>
                    {photo.fresh_url ? <img src={photo.fresh_url} alt={photo.file_name ?? "Rapor görseli"} className="h-full w-full object-cover" /> : <FileText className="m-4 h-5 w-5 text-slate-300" />}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end"><time className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString("tr-TR")}</time><Link href={`/manager/is-emirleri/${row.work_order_id}`} aria-label="İş emri detayını aç"><ArrowRight className="h-4 w-4 text-slate-300" /></Link></div>
            </article>
          ))}</div>}
      </div>
    </div>
  );
}

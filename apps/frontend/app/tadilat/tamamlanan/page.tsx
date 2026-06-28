"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FolderOpen, Receipt, Search, Store } from "lucide-react";
import { apiGet } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  project_no?: string;
  status: string;
  scope_codes?: string[];
  updated_at?: string;
  created_at?: string;
};

type Process = {
  id: string;
  project_id: string;
  work_type: string;
  title: string;
  status: string;
  progress_percent: number;
  completed_at?: string;
  target_end_date?: string;
};

type ProgressPayment = {
  id: string;
  project_id: string;
  approval_status: string;
  amount?: number;
};

type InvoiceRecord = {
  id: string;
  project_id: string;
  approval_status: string;
};

type TamamlananEntry = {
  project: Project;
  process: Process;
  hakkedisStatus: string;
  faturaStatus: string;
  hakkedisAmount: number;
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  none:               { label: "Yok",                       cls: "bg-slate-100 text-slate-500"    },
  pending:            { label: "İç Onay Bekliyor",          cls: "bg-amber-50 text-amber-700"     },
  bekliyor:           { label: "İç Onay Bekliyor",          cls: "bg-amber-50 text-amber-700"     },
  internal_pending:   { label: "İç Onay Bekliyor",          cls: "bg-amber-50 text-amber-700"     },
  internal_approved:  { label: "İç Onay Alındı",           cls: "bg-blue-50 text-blue-700"       },
  migros_pending:     { label: "Migros Onayı Bekleniyor",   cls: "bg-indigo-50 text-indigo-700"   },
  invoice_stage:      { label: "Faturalandırma Aşamasında", cls: "bg-emerald-50 text-emerald-700" },
  invoiced:           { label: "Faturalandırıldı",          cls: "bg-green-100 text-green-800"    },
  revision_requested: { label: "Revizyon İstendi",          cls: "bg-purple-50 text-purple-700"   },
  rejected:           { label: "Reddedildi",                cls: "bg-red-50 text-red-700"         },
  onaylandi:          { label: "Onaylandı",                 cls: "bg-green-50 text-green-700"     },
  reddedildi:         { label: "Reddedildi",                cls: "bg-red-50 text-red-700"         },
};

export default function TamamlananTadilatlarPage() {
  const [entries, setEntries] = useState<TamamlananEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [projects, payments, invoices] = await Promise.all([
          apiGet<Project[]>("/projects?limit=5000"),
          apiGet<ProgressPayment[]>("/progress-payments").catch(() => [] as ProgressPayment[]),
          apiGet<InvoiceRecord[]>("/invoice-records").catch(() => [] as InvoiceRecord[]),
        ]);

        const paymentsByProject: Record<string, ProgressPayment[]> = {};
        (Array.isArray(payments) ? payments : []).forEach(p => {
          if (!paymentsByProject[p.project_id]) paymentsByProject[p.project_id] = [];
          paymentsByProject[p.project_id].push(p);
        });

        const invoicesByProject: Record<string, InvoiceRecord[]> = {};
        (Array.isArray(invoices) ? invoices : []).forEach(i => {
          if (!invoicesByProject[i.project_id]) invoicesByProject[i.project_id] = [];
          invoicesByProject[i.project_id].push(i);
        });

        const result: TamamlananEntry[] = [];
        for (const p of (Array.isArray(projects) ? projects : [])) {
          const isTadilat = (p.scope_codes ?? []).includes("tadilat") ||
            p.status.toLowerCase() === "completed";
          if (!isTadilat) continue;

          const procs = await apiGet<Process[]>(`/process/projects/${p.id}/process`).catch(() => [] as Process[]);
          const completed = (Array.isArray(procs) ? procs : []).filter(pr =>
            pr.work_type === "tadilat" && pr.status === "completed"
          );

          for (const proc of completed) {
            const pp = paymentsByProject[p.id] ?? [];
            const inv = invoicesByProject[p.id] ?? [];
            const latestPayment = pp.sort((a, b) => (a.approval_status === "onaylandi" ? -1 : 1))[0];
            const latestInvoice = inv.sort((a, b) => (a.approval_status === "onaylandi" ? -1 : 1))[0];
            const hakkedisAmount = pp.filter(x => x.approval_status === "onaylandi").reduce((s, x) => s + (x.amount ?? 0), 0);

            result.push({
              project: p,
              process: proc,
              hakkedisStatus: latestPayment?.approval_status ?? "none",
              faturaStatus: latestInvoice?.approval_status ?? "none",
              hakkedisAmount,
            });
          }
        }

        setEntries(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(e =>
      e.project.name.toLowerCase().includes(q) ||
      (e.project.project_no ?? "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Tamamlanan Tadilatlar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tadilat süreci tamamlanmış mağazalar — fatura ve hakkediş takibi
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mağaza ara..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-dashed border-slate-200">
          <CheckCircle2 className="h-10 w-10 text-slate-200" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-500">
              {query ? "Sonuç bulunamadı" : "Tamamlanan tadilat yok"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tadilat süreci tamamlananlar burada görünür.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mağaza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Süreç</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tamamlanma</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Hakkediş</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Fatura</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((e) => {
                const hSt = STATUS_BADGE[e.hakkedisStatus] ?? STATUS_BADGE.none;
                const fSt = STATUS_BADGE[e.faturaStatus]   ?? STATUS_BADGE.none;
                return (
                  <tr key={`${e.project.id}-${e.process.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-slate-300 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{e.project.name}</p>
                          {e.project.project_no && (
                            <p className="text-[10px] font-mono text-slate-400">{e.project.project_no}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-600">{e.process.title}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      <div>
                        <p>{fmtDate(e.process.completed_at)}</p>
                        {e.hakkedisAmount > 0 && (
                          <p className="text-green-600 font-medium">{fmtAmount(e.hakkedisAmount)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${hSt.cls}`}>
                        {hSt.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${fSt.cls}`}>
                        {fSt.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/projects/${e.project.id}?tab=hakkediş`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-50">
                          <Receipt className="h-3 w-3" /> Hakkediş
                        </Link>
                        <Link href={`/projects/${e.project.id}?tab=process`}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50">
                          <FolderOpen className="h-3 w-3" /> Kart
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

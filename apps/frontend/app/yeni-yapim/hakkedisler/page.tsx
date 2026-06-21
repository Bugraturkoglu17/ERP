"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, FolderOpen, Paperclip, Receipt, Search, Store } from "lucide-react";
import { apiGet } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  project_no?: string;
  status: string;
  scope_codes?: string[];
};

type ProgressPayment = {
  id: string;
  project_id: string;
  payment_type: string;
  period?: string;
  amount?: number;
  currency: string;
  file_name?: string;
  approval_status: string;
  submitted_for_approval: boolean;
  created_at: string;
};

type Row = { payment: ProgressPayment; project: Project };

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  draft:       { label: "Giriş Yapıldı",    cls: "bg-slate-100 text-slate-600"  },
  pending:     { label: "Onay Bekliyor",    cls: "bg-amber-50 text-amber-700"   },
  onaylandi:   { label: "Onaylandı",        cls: "bg-green-50 text-green-700"   },
  reddedildi:  { label: "Reddedildi",       cls: "bg-red-50 text-red-600"       },
  revizyon:    { label: "Revizyon İstendi", cls: "bg-purple-50 text-purple-700" },
};

function fmtTRY(amount?: number, currency?: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency ?? "TRY" }).format(amount);
}

function getStatus(p: ProgressPayment): { label: string; cls: string } {
  if (!p.submitted_for_approval) return STATUS_CFG.draft;
  return STATUS_CFG[p.approval_status] ?? STATUS_CFG.pending;
}

function isYeniYapim(payment: ProgressPayment, project: Project): boolean {
  if (payment.payment_type === "yeni_yapim") return true;
  if (["ara", "final"].includes(payment.payment_type)) {
    return (project.scope_codes ?? []).includes("yeni_yapim");
  }
  return false;
}

async function fetchAllPayments(projects: Project[]): Promise<Row[]> {
  const BATCH = 20;
  const rows: Row[] = [];
  for (let i = 0; i < projects.length; i += BATCH) {
    const batch = projects.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((p) =>
        apiGet<ProgressPayment[]>(`/progress-payments/projects/${p.id}`)
          .then((payments) => (Array.isArray(payments) ? payments.map((pay) => ({ payment: pay, project: p })) : []))
          .catch(() => [])
      )
    );
    results.forEach((r) => rows.push(...r));
  }
  return rows;
}

export default function YeniYapimHakkedislerPage() {
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const projects = await apiGet<Project[]>("/projects?limit=5000").catch(() => [] as Project[]);
        const allRows  = await fetchAllPayments(Array.isArray(projects) ? projects : []);
        const filtered = allRows.filter(({ payment, project }) => isYeniYapim(payment, project));
        filtered.sort((a, b) =>
          new Date(b.payment.created_at).getTime() - new Date(a.payment.created_at).getTime()
        );
        setRows(filtered);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayed = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.project.name.toLowerCase().includes(q) ||
        (r.project.project_no ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Yeni Yapım Hakkedişleri</h1>
            <p className="text-xs text-slate-500">Yeni yapım kapsamındaki hakkediş kayıtları</p>
          </div>
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
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Hakkediş kayıtları yükleniyor...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-slate-200">
          <Building2 className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">
            {query ? "Arama sonucu bulunamadı." : "Henüz yeni yapım hakkedişi girilmemiş."}
          </p>
          <p className="text-xs text-slate-400">Mağaza kartı › Hakkedişler sekmesinden kayıt ekleyin.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50 divide-x divide-slate-100">
            {[
              { label: "Toplam",        value: displayed.length },
              { label: "Onay Bekliyor", value: displayed.filter((r) => r.payment.submitted_for_approval && r.payment.approval_status === "pending").length },
              { label: "Onaylanan",     value: displayed.filter((r) => r.payment.approval_status === "onaylandi").length },
            ].map((s) => (
              <div key={s.label} className="px-4 py-3 text-center">
                <p className="text-base font-bold text-slate-800">{s.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mağaza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Kod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Dönem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tutar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Dosya</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayed.map(({ payment, project }) => {
                const st = getStatus(payment);
                return (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-slate-300 shrink-0" />
                        <Link href={`/projects/${project.id}?tab=hakkediş`} className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                          {project.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400 hidden sm:table-cell">{project.project_no ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 hidden md:table-cell">{payment.period ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{fmtTRY(payment.amount, payment.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {payment.file_name
                        ? <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Paperclip className="h-3 w-3 shrink-0" /><span className="truncate max-w-[130px]">{payment.file_name}</span></span>
                        : <span className="text-[11px] text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/projects/${project.id}?tab=hakkediş`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <FolderOpen className="h-3.5 w-3.5" /> Hakkedişe Git
                      </Link>
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

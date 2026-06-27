"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CalendarDays, CheckCircle2, Clock,
  FileText, FolderOpen, Receipt, Search, Store, Wrench,
} from "lucide-react";
import { apiGet } from "@/lib/api";

type Project = {
  id: string; name: string; project_no?: string; status: string;
  scope_codes?: string[];
  description?: string;
};

type ServiceForm = { id: string; project_id: string; year: number; month: number };
type ProgressPayment = { id: string; project_id: string; payment_type: string; period?: string };
type InvoiceRecord = { id: string; project_id: string; invoice_type: string; period?: string };

const MONTHS_TR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                   "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function periodStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
      ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {ok ? "Yüklendi" : "Bekliyor"}
    </span>
  );
}

function getRegion(project: Project): string {
  if (!project.description) return "—";
  try {
    const d = JSON.parse(project.description) as Record<string, string>;
    return d.bolge ?? d.sehir ?? "—";
  } catch { return "—"; }
}

export default function BakimPage() {
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [forms,     setForms]     = useState<ServiceForm[]>([]);
  const [payments,  setPayments]  = useState<ProgressPayment[]>([]);
  const [invoices,  setInvoices]  = useState<InvoiceRecord[]>([]);
  const [icmaller,  setIcmaller]  = useState<InvoiceRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [tab,       setTab]       = useState<"tumu" | "bekleyen" | "tamamlanan">("tumu");

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const period = periodStr(year, month);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ps, fs, pays, invs, icms] = await Promise.all([
        apiGet<Project[]>("/projects?limit=5000").catch(() => [] as Project[]),
        apiGet<ServiceForm[]>(`/service-forms?year=${year}&month=${month}`).catch(() => [] as ServiceForm[]),
        apiGet<ProgressPayment[]>("/progress-payments?payment_type=bakim").catch(() => [] as ProgressPayment[]),
        apiGet<InvoiceRecord[]>("/invoice-records?invoice_type=bakım_faturası").catch(() => [] as InvoiceRecord[]),
        apiGet<InvoiceRecord[]>("/invoice-records?invoice_type=bakım_icmali").catch(() => [] as InvoiceRecord[]),
      ]);

      const allProjects = Array.isArray(ps) ? ps : [];
      setProjects(allProjects.filter(p => p.scope_codes?.includes("bakim")));
      setForms(Array.isArray(fs) ? fs : []);
      setPayments(Array.isArray(pays) ? pays : []);
      setInvoices(Array.isArray(invs) ? invs : []);
      setIcmaller(Array.isArray(icms) ? icms : []);
      setLoading(false);
    })();
  }, [year, month]);

  // Güncel ay set'leri
  const sfSet  = useMemo(() => new Set(forms.filter(f => f.year === year && f.month === month).map(f => f.project_id)), [forms, year, month]);
  const paySet = useMemo(() => new Set(payments.filter(p => p.period === period).map(p => p.project_id)), [payments, period]);
  const invSet = useMemo(() => new Set(invoices.filter(i => i.period === period).map(i => i.project_id)), [invoices, period]);
  const icmSet = useMemo(() => new Set(icmaller.filter(i => i.period === period).map(i => i.project_id)), [icmaller, period]);

  const filtered = useMemo(() => {
    let list = projects;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.project_no ?? "").toLowerCase().includes(q));
    }
    if (tab === "bekleyen") list = list.filter(p => !sfSet.has(p.id) || !paySet.has(p.id) || !invSet.has(p.id) || !icmSet.has(p.id));
    if (tab === "tamamlanan") list = list.filter(p => sfSet.has(p.id) && paySet.has(p.id) && invSet.has(p.id) && icmSet.has(p.id));
    return list;
  }, [projects, query, tab, sfSet, paySet, invSet, icmSet]);

  const sfWait  = projects.filter(p => !sfSet.has(p.id)).length;
  const sfDone  = projects.filter(p => sfSet.has(p.id)).length;
  const payWait = projects.filter(p => !paySet.has(p.id)).length;
  const invWait = projects.filter(p => !invSet.has(p.id)).length;
  const icmWait = projects.filter(p => !icmSet.has(p.id)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
          <Wrench className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Bakım & Onarım</h1>
          <p className="text-xs text-slate-500">Aylık servis formu, fatura, hakkediş ve icmal takibi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Bakım Mağazası",    value: projects.length, color: "text-slate-800",  icon: Store         },
          { label: "SF Bekleyen",        value: sfWait,          color: "text-amber-600",  icon: AlertCircle   },
          { label: "SF Yüklenen",        value: sfDone,          color: "text-green-600",  icon: CheckCircle2  },
          { label: "Fatura Bekleyen",    value: invWait,         color: "text-orange-600", icon: Receipt       },
          { label: "Hakkediş Bekleyen", value: payWait,         color: "text-red-600",    icon: Receipt       },
          { label: "İcmal Bekleyen",     value: icmWait,         color: "text-purple-600", icon: FileText      },
          { label: "Bu Ay",             value: `${MONTHS_TR[month]} ${year}`, color: "text-sky-700", icon: CalendarDays },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-2.5">
              <Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
              <div className="min-w-0">
                <p className={`text-sm font-bold ${s.color} truncate`}>{s.value}</p>
                <p className="text-[9px] text-slate-400 leading-tight">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-0.5 border border-slate-200 rounded-xl p-1 bg-slate-50">
          {[
            { key: "tumu",       label: "Tümü" },
            { key: "bekleyen",   label: "Eksik Var" },
            { key: "tamamlanan", label: "Tüm Yüklendi" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Mağaza ara..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-sky-500 focus:outline-none" />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} mağaza</span>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-slate-200">
          <Wrench className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mağaza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Bölge</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Servis Formu</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Fatura</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Hakkediş</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">İcmal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Klasör</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-slate-300 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{p.project_no ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{getRegion(p)}</td>
                  <td className="px-4 py-3 text-center"><StatusDot ok={sfSet.has(p.id)} /></td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell"><StatusDot ok={invSet.has(p.id)} /></td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell"><StatusDot ok={paySet.has(p.id)} /></td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell"><StatusDot ok={icmSet.has(p.id)} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/bakim/magazalar/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs text-sky-600 border border-sky-200 rounded-lg px-2.5 py-1 hover:bg-sky-50 font-medium">
                      <FolderOpen className="h-3.5 w-3.5" /> Bakım Klasörü
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

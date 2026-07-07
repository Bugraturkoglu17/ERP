"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Wrench, FolderOpen, Store, CheckCircle2, Clock } from "lucide-react";
import { useStoreProcessData } from "@/hooks/use-store-process-data";
import { DataState } from "@/components/common/data-state";
import { ProcessFilters } from "@/components/modules/store-process/process-filters";

const MONTHS_TR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                   "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const TAB_OPTIONS = [
  { value: "tumu",       label: "Tümü" },
  { value: "bekleyen",   label: "Eksik Var" },
  { value: "tamamlanan", label: "Tüm Yüklendi" },
];

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

function getRegion(project: any): string {
  if (!project.description) return "—";
  try {
    const d = JSON.parse(project.description) as Record<string, string>;
    return d.bolge ?? d.sehir ?? "—";
  } catch { return "—"; }
}

export default function BakimPage() {
  const { projects, loading, error, sfSet, paySet, invSet, icmSet, year, month } = useStoreProcessData("bakim");
  const [query, setQuery] = useState("");
  const [tab,   setTab]   = useState("tumu");

  const sfWait  = projects.filter(p => !sfSet.has(p.id)).length;
  const sfDone  = projects.filter(p => sfSet.has(p.id)).length;
  const payWait = projects.filter(p => !paySet.has(p.id)).length;
  const invWait = projects.filter(p => !invSet.has(p.id)).length;
  const icmWait = projects.filter(p => !icmSet.has(p.id)).length;

  const filtered = useMemo(() => {
    let list = projects;
    const q = query.toLowerCase().trim();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || (p.project_no ?? "").toLowerCase().includes(q));
    if (tab === "bekleyen")   list = list.filter(p => !sfSet.has(p.id) || !paySet.has(p.id) || !invSet.has(p.id) || !icmSet.has(p.id));
    if (tab === "tamamlanan") list = list.filter(p => sfSet.has(p.id) && paySet.has(p.id) && invSet.has(p.id) && icmSet.has(p.id));
    return list;
  }, [projects, query, tab, sfSet, paySet, invSet, icmSet]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
          <Wrench className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Bakım &amp; Onarım</h1>
          <p className="text-xs text-slate-500">Aylık servis formu, fatura, hakkediş ve icmal takibi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Bakım Mağazası",   value: projects.length, color: "text-slate-800"  },
          { label: "SF Bekleyen",       value: sfWait,          color: "text-amber-600"  },
          { label: "SF Yüklenen",       value: sfDone,          color: "text-green-600"  },
          { label: "Fatura Bekleyen",   value: invWait,         color: "text-orange-600" },
          { label: "Hakkediş Bekleyen", value: payWait,         color: "text-red-600"    },
          { label: "İcmal Bekleyen",    value: icmWait,         color: "text-purple-600" },
          { label: "Bu Ay",             value: `${MONTHS_TR[month]} ${year}`, color: "text-sky-700" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-2.5">
            <div className="min-w-0">
              <p className={`text-sm font-bold ${s.color} truncate`}>{s.value}</p>
              <p className="text-[9px] text-slate-400 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <ProcessFilters
        search={query}
        onSearchChange={setQuery}
        tab={tab}
        onTabChange={setTab}
        tabOptions={TAB_OPTIONS}
        placeholder="Mağaza ara..."
      />
      <span className="text-xs text-slate-400">{filtered.length} mağaza</span>

      {/* Table */}
      <DataState loading={loading} error={error} isEmpty={filtered.length === 0}>
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
      </DataState>
    </div>
  );
}

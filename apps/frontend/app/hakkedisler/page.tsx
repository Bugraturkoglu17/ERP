"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Receipt, Search, Store } from "lucide-react";
import { apiGet } from "@/lib/api";

type Project = { id: string; name: string; project_no?: string; status: string; work_type?: string };

const WORK_TYPE_LABELS: Record<string, string> = {
  bakim:     "Bakım & Onarım",
  tadilat:   "Tadilat",
  yeni_yapim: "Yeni Yapım",
};

const WORK_TYPE_COLORS: Record<string, string> = {
  bakim:      "bg-sky-50 text-sky-700",
  tadilat:    "bg-amber-50 text-amber-700",
  yeni_yapim: "bg-emerald-50 text-emerald-700",
};

type Filter = "tumu" | "bakim" | "tadilat" | "yeni_yapim";

export default function HakkedislerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [filter,   setFilter]   = useState<Filter>("tumu");

  useEffect(() => {
    apiGet<Project[]>("/projects?limit=5000")
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    projects.filter(p => {
      const q = !query || p.name.toLowerCase().includes(query.toLowerCase());
      const f = filter === "tumu" || p.work_type === filter;
      return q && f;
    }),
    [projects, query, filter]
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: "tumu",      label: `Tümü (${projects.length})`  },
    { key: "bakim",     label: "Bakım"                       },
    { key: "tadilat",   label: "Tadilat"                     },
    { key: "yeni_yapim", label: "Yeni Yapım"                 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
          <Receipt className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Faturalar / Hakkedişler</h1>
          <p className="text-xs text-slate-500">Tüm mağazalara ait hakkediş ve fatura kayıtlarını takip edin.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Mağaza ara..."
            className="rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-0.5 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              filter === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-slate-200">
          <Receipt className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">Henüz hakkediş / fatura kaydı yok.</p>
          <p className="text-xs text-slate-400">Bu kayıtlar mağaza kartlarından oluşturulacak.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mağaza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mağaza Kodu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">İş Tipi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Dönem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tutar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => {
                const wt = p.work_type ?? "bakim";
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-slate-300 shrink-0" />
                        <Link href={`/projects/${p.id}?tab=hakkediş`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.project_no ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${WORK_TYPE_COLORS[wt] ?? "bg-slate-100 text-slate-600"}`}>
                        {WORK_TYPE_LABELS[wt] ?? wt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">—</td>
                    <td className="px-4 py-3 text-xs text-slate-500">—</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Kayıt Yok</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/projects/${p.id}?tab=hakkediş`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <FolderOpen className="h-3.5 w-3.5" /> Hakkediş
                        </Link>
                        <Link href={`/projects/${p.id}?tab=fatura`}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline">
                          Fatura
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

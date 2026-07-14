"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronDown,
  Download, Eye, FileText, Wrench,
} from "lucide-react";
import { apiGet, buildApiUrl } from "@/lib/api";

type ServiceForm = {
  id: string; project_id: string; year: number; month: number;
  file_url?: string; file_name?: string; file_size_bytes?: number;
  contractor_company?: string; uploaded_by_name?: string;
  description?: string; status: string; created_at: string;
};

const MONTHS_TR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                   "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function openDoc(fileUrlOrDocId: string) {
  // Direkt URL (yeni kayıtlar)
  if (fileUrlOrDocId.startsWith("http")) {
    window.open(fileUrlOrDocId, "_blank");
    return;
  }
  // UUID → /documents/{id}/download
  if (UUID_RE.test(fileUrlOrDocId)) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(buildApiUrl(`/documents/${fileUrlOrDocId}/download`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null);
    if (!res?.ok) { alert("Dosya açılamadı."); return; }
    const { url } = await res.json();
    window.open(url, "_blank");
    return;
  }
  // Eski kayıtlarda file_key (path) saklanmış → yerel statik servis
  window.open(`http://localhost:8000/static/uploads/${fileUrlOrDocId}`, "_blank");
}

function MonthCard({ year, month, forms }: { year: number; month: number; forms: ServiceForm[] }) {
  const [open, setOpen] = useState(forms.length > 0);
  const hasForm = forms.length > 0;

  return (
    <div className={`rounded-xl border transition-colors ${hasForm ? "border-green-100 bg-green-50/30" : "border-slate-100 bg-white"}`}>
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(v => !v)}>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${hasForm ? "bg-green-100" : "bg-slate-100"}`}>
          {hasForm ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CalendarDays className="h-4 w-4 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{MONTHS_TR[month]} {year}</p>
          <p className={`text-[11px] ${hasForm ? "text-green-600 font-medium" : "text-slate-400"}`}>
            {hasForm ? `${forms.length} form yüklendi` : "Form bekleniyor"}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-300 shrink-0 transition-transform duration-150 ${open && "rotate-180"}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {hasForm ? (
            forms.map(f => (
              <div key={f.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <FileText className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{f.file_name ?? "Dosya"}</p>
                  {f.contractor_company && <p className="text-[11px] text-slate-500 mt-0.5">Firma: {f.contractor_company}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {f.uploaded_by_name ?? "—"} · {fmtDate(f.created_at)}
                    {f.file_size_bytes ? ` · ${fmtSize(f.file_size_bytes)}` : ""}
                  </p>
                  {f.description && <p className="text-[11px] text-slate-500 italic mt-1">{f.description}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {f.file_url && (
                    <>
                      <button onClick={() => openDoc(f.file_url!)}
                        className="flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5" /> Aç
                      </button>
                      <button onClick={() => openDoc(f.file_url!)}
                        className="flex items-center gap-1 text-[11px] text-blue-600 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-50">
                        <Download className="h-3.5 w-3.5" /> İndir
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-500">Bu ay için servis formu yüklenmemiş.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServisFormTab({ projectId }: { projectId: string }) {
  const [forms,   setForms]   = useState<ServiceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [year,    setYear]    = useState(new Date().getFullYear());

  const loadForms = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<ServiceForm[]>(`/service-forms/projects/${projectId}?year=${year}`).catch(() => []);
    setForms(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [projectId, year]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const formsByMonth: Record<number, ServiceForm[]> = {};
  for (let m = 1; m <= 12; m++) {
    formsByMonth[m] = forms.filter(f => f.month === m);
  }

  const currentMonth = new Date().getMonth() + 1;
  const displayMonths = year === new Date().getFullYear()
    ? Array.from({ length: currentMonth }, (_, i) => i + 1).reverse()
    : Array.from({ length: 12 }, (_, i) => i + 1).reverse();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Servis Formları</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Aylık bakım servis formları</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Link href="/bakim/servis-formlari"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors">
            <Wrench className="h-3.5 w-3.5" /> Bakım Modülüne Git
          </Link>
        </div>
      </div>

      {/* Read-only banner */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Bu alan sadece görüntüleme içindir. Servis formu yükleme ve düzenleme işlemleri{" "}
          <Link href="/bakim/servis-formlari" className="font-semibold text-sky-600 hover:underline">Bakım & Onarım modülünden</Link>{" "}
          yapılır.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Yüklenen",  value: forms.length, color: "text-green-600" },
          { label: "Eksik",     value: displayMonths.length - new Set(forms.map(f => f.month)).size, color: "text-amber-600" },
          { label: "Toplam Ay", value: displayMonths.length, color: "text-slate-600" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {displayMonths.map(m => (
            <MonthCard key={m} year={year} month={m} forms={formsByMonth[m] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronDown,
  Download, Eye, FileText, Loader2, Plus, Trash2, Upload, X,
} from "lucide-react";
import { apiDelete, apiGet, apiPost, buildApiUrl } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceForm = {
  id: string;
  project_id: string;
  year: number;
  month: number;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  contractor_company?: string;
  uploaded_by_name?: string;
  description?: string;
  status: string;
  created_at: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Upload Modal ───────────────────────────────────────────────────────────────

function UploadModal({
  projectId, defaultYear, defaultMonth,
  onClose, onDone,
}: {
  projectId: string;
  defaultYear: number;
  defaultMonth: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    year: defaultYear,
    month: defaultMonth,
    contractor_company: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  const acceptFile = (f: File) => { setFile(f); setErr(""); };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  };

  const handleSubmit = async () => {
    if (!file) { setErr("Lütfen bir dosya seçin."); return; }
    setBusy(true); setErr("");
    try {
      // 1) Dosyayı /documents/upload ile yükle
      const fd = new FormData();
      fd.append("project_id", projectId);
      fd.append("doc_type", "field_report");
      fd.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(buildApiUrl("/documents/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail ?? "Dosya yüklenemedi.");
      }
      const doc = await res.json();

      // 2) Servis formu kaydını oluştur
      await apiPost(`/service-forms/projects/${projectId}`, {
        year: form.year,
        month: form.month,
        file_url: doc.id,
        file_name: doc.original_name,
        file_size_bytes: file.size,
        contractor_company: form.contractor_company || null,
        description: form.description || null,
      });
      onDone(); onClose();
    } catch (ex: any) {
      setErr(ex?.message ?? ex?.response?.data?.detail ?? "Yükleme başarısız.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Servis Formu Yükle</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-300 hover:text-slate-600" /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Yıl / Ay */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Yıl</label>
              <input type="number" value={form.year}
                onChange={(e) => setForm(p => ({...p, year: +e.target.value}))}
                min={2020} max={2030}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ay</label>
              <select value={form.month}
                onChange={(e) => setForm(p => ({...p, month: +e.target.value}))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                {MONTHS_TR.slice(1).map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Taşeron Firma */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Taşeron Firma</label>
            <input value={form.contractor_company}
              onChange={(e) => setForm(p => ({...p, contractor_company: e.target.value}))}
              placeholder="Taşeron firma adı"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Dosya — sürükle bırak */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dosya *</label>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.docx,.jpg,.jpeg,.png,.zip,.eml,.msg"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 transition-colors cursor-pointer ${
                dragging
                  ? "border-blue-400 bg-blue-50"
                  : file
                  ? "border-green-300 bg-green-50 cursor-default"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              {file ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 text-center break-all px-2">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{fmtSize(file.size)}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Upload className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Sürükle & Bırak <span className="text-slate-400">veya</span>
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                      className="mt-1 text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
                    >
                      Bilgisayardan Seç
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">PDF, XLSX, DOCX, JPG, PNG, ZIP</p>
                </>
              )}
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Açıklama</label>
            <textarea rows={2} value={form.description}
              onChange={(e) => setForm(p => ({...p, description: e.target.value}))}
              placeholder="İsteğe bağlı not..."
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Vazgeç
          </button>
          <button onClick={handleSubmit} disabled={busy || !file}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Yükleniyor..." : "Yükle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Month Card ─────────────────────────────────────────────────────────────────

function MonthCard({
  year, month, forms, onUpload, onDelete,
}: {
  year: number;
  month: number;
  forms: ServiceForm[];
  onUpload: (y: number, m: number) => void;
  onDelete: (f: ServiceForm) => void;
}) {
  const [open, setOpen] = useState(forms.length > 0);
  const hasForm = forms.length > 0;

  return (
    <div className={`rounded-xl border transition-colors ${
      hasForm ? "border-green-100 bg-green-50/30" : "border-slate-100 bg-white"
    }`}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          hasForm ? "bg-green-100" : "bg-slate-100"
        }`}>
          {hasForm
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <CalendarDays className="h-4 w-4 text-slate-400" />
          }
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
            forms.map((f) => (
              <div key={f.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <FileText className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{f.file_name ?? "Dosya"}</p>
                  {f.contractor_company && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Firma: {f.contractor_company}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {f.uploaded_by_name ?? "—"} · {fmtDate(f.created_at)}
                    {f.file_size_bytes ? ` · ${fmtSize(f.file_size_bytes)}` : ""}
                  </p>
                  {f.description && <p className="text-[11px] text-slate-500 italic mt-1">{f.description}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {f.file_url && (
                    <>
                      <button
                        onClick={async () => {
                          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                          const res = await fetch(buildApiUrl(`/documents/${f.file_url}/download`), {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          }).catch(() => null);
                          if (!res?.ok) { alert("Dosya açılamadı."); return; }
                          const { url } = await res.json();
                          window.open(url, "_blank");
                        }}
                        className="flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Aç
                      </button>
                      <button
                        onClick={async () => {
                          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                          const res = await fetch(buildApiUrl(`/documents/${f.file_url}/download`), {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          }).catch(() => null);
                          if (!res?.ok) { alert("Dosya indirilemedi."); return; }
                          const { url } = await res.json();
                          window.open(url, "_blank");
                        }}
                        className="flex items-center gap-1 text-[11px] text-blue-600 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-50"
                      >
                        <Download className="h-3.5 w-3.5" /> İndir
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDelete(f)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-500">Bu ay için servis formu yüklenmemiş.</p>
            </div>
          )}
          <button
            onClick={() => onUpload(year, month)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Form Ekle
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ServisFormTab({ projectId }: { projectId: string }) {
  const [forms,     setForms]     = useState<ServiceForm[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [upload,    setUpload]    = useState<{ year: number; month: number } | null>(null);
  const [deleting,  setDeleting]  = useState<ServiceForm | null>(null);
  const [delBusy,   setDelBusy]   = useState(false);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ServiceForm[]>(`/service-forms/projects/${projectId}?year=${year}`).catch(() => []);
      setForms(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [projectId, year]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDelBusy(true);
    try {
      await apiDelete(`/service-forms/${deleting.id}`);
      if (deleting.file_url) {
        await apiDelete(`/documents/${deleting.file_url}`).catch(() => {});
      }
      setDeleting(null);
      await loadForms();
    } catch {
      alert("Silme başarısız.");
    } finally { setDelBusy(false); }
  };

  const formsByMonth: Record<number, ServiceForm[]> = {};
  for (let m = 1; m <= 12; m++) {
    formsByMonth[m] = forms.filter((f) => f.month === m);
  }

  const currentMonth = new Date().getMonth() + 1;
  const displayMonths = year === new Date().getFullYear()
    ? Array.from({ length: currentMonth }, (_, i) => i + 1).reverse()
    : Array.from({ length: 12 }, (_, i) => i + 1).reverse();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Servis Formları</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Aylık bakım servis formları</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(+e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setUpload({ year, month: currentMonth })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" /> Form Yükle
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Yüklenen",  value: forms.length, color: "text-green-600"  },
          { label: "Eksik",     value: displayMonths.length - forms.reduce((acc, f) => { const k = f.month; return acc.add(k), acc; }, new Set()).size, color: "text-amber-600" },
          { label: "Toplam Ay", value: displayMonths.length, color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Month list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {displayMonths.map((m) => (
            <MonthCard
              key={m}
              year={year}
              month={m}
              forms={formsByMonth[m] ?? []}
              onUpload={(y, mo) => setUpload({ year: y, month: mo })}
              onDelete={(f) => setDeleting(f)}
            />
          ))}
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Servis Formu Silinsin mi?</h3>
              <p className="text-xs text-slate-500 mt-1">{deleting.file_name ?? "Bu form"} kalıcı olarak silinecek.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Vazgeç</button>
              <button onClick={handleDelete} disabled={delBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {delBusy && <Loader2 className="h-4 w-4 animate-spin" />} Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {upload && (
        <UploadModal
          projectId={projectId}
          defaultYear={upload.year}
          defaultMonth={upload.month}
          onClose={() => setUpload(null)}
          onDone={loadForms}
        />
      )}
    </div>
  );
}

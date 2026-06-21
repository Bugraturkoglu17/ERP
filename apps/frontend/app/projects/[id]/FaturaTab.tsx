"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Clock, Download, Eye, FileText, Loader2,
  Paperclip, Plus, Receipt, Trash2, Upload, X, XCircle,
} from "lucide-react";
import { apiDelete, apiGet, apiPost, buildApiUrl } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type InvoiceRecord = {
  id: string;
  invoice_type: string;
  invoice_no?: string;
  period?: string;
  amount?: number;
  currency: string;
  file_url?: string;
  file_name?: string;
  description?: string;
  approval_status: string;
  submitted_for_approval?: boolean;
  submitted_by_name?: string;
  created_at: string;
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  bakim_faturasi:      "Bakım Faturası",
  tadilat_faturasi:    "Tadilat Faturası",
  yeni_yapim_faturasi: "Yeni Yapım Faturası",
  ara_fatura:          "Ara Fatura",
  final_fatura:        "Final Fatura",
  malzeme_faturasi:    "Malzeme Faturası",
  hizmet_faturasi:     "Hizmet Faturası",
};

const APPROVAL_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  draft:       { label: "Taslak",           icon: Clock,        cls: "bg-slate-50 text-slate-600"   },
  pending:     { label: "Onay Bekliyor",    icon: Clock,        cls: "bg-amber-50 text-amber-700"   },
  onaylandi:   { label: "Onaylandı",        icon: CheckCircle2, cls: "bg-green-50 text-green-700"   },
  reddedildi:  { label: "Reddedildi",       icon: XCircle,      cls: "bg-red-50 text-red-700"       },
  revizyon:    { label: "Revizyon İstendi", icon: Clock,        cls: "bg-purple-50 text-purple-700" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTRY(amount?: number, currency?: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency ?? "TRY" }).format(amount);
}

function parseTRY(input: string): number {
  const cleaned = input.trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function displayTRY(input: string): string {
  const num = parseTRY(input);
  if (num <= 0) return "";
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

async function uploadDocumentFile(file: File, projectId: string): Promise<{ id: string; original_name: string }> {
  const fd = new FormData();
  fd.append("project_id", projectId);
  fd.append("doc_type", "invoice_doc");
  fd.append("file", file);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(buildApiUrl("/documents/upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? "Dosya yüklenemedi");
  }
  return res.json();
}

async function openDocument(docId: string) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(buildApiUrl(`/documents/${docId}/download`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error();
    const { url } = await res.json();
    window.open(url, "_blank");
  } catch {
    alert("Dosya açılamadı. Lütfen tekrar deneyin.");
  }
}

// ── CurrencyInput ──────────────────────────────────────────────────────────────

function CurrencyInput({ value, onChange, className }: {
  value: string; onChange: (v: string) => void; className?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        type="text"
        value={focused ? value : (value ? displayTRY(value) || value : "")}
        onFocus={() => setFocused(true)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { setFocused(false); const n = parseTRY(value); if (n > 0) onChange(displayTRY(value)); }}
        placeholder="0,00"
        className={className}
        inputMode="decimal"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₺</span>
    </div>
  );
}

// ── FileDropzone ───────────────────────────────────────────────────────────────

function FileDropzone({ file, onFile, accept }: { file: File | null; onFile: (f: File | null) => void; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); };
  return (
    <>
      <input ref={ref} type="file" className="hidden" accept={accept} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && ref.current?.click()}
        className={`relative flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors cursor-pointer ${dragging ? "border-blue-400 bg-blue-50" : file ? "border-green-300 bg-green-50/60 cursor-default" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"}`}
      >
        {file ? (
          <>
            <FileText className="h-4 w-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
              <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onFile(null); if (ref.current) ref.current.value = ""; }}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-slate-300 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Sürükle & Bırak <span className="text-slate-400">veya</span></p>
              <button type="button" onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}
                className="text-xs font-semibold text-blue-600 hover:underline">Dosya Seç</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── AddModal ───────────────────────────────────────────────────────────────────

function AddModal({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    invoice_type: "ara_fatura",
    invoice_no: "",
    period: new Date().toISOString().slice(0, 7),
    amountRaw: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  const handleSubmit = async () => {
    const numericAmount = parseTRY(form.amountRaw);
    if (numericAmount <= 0) { setErr("Geçerli bir tutar giriniz."); return; }
    setBusy(true); setErr("");
    try {
      let file_url: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const doc = await uploadDocumentFile(file, projectId);
        file_url = doc.id;
        file_name = doc.original_name;
      }
      await apiPost(`/invoice-records/projects/${projectId}`, {
        invoice_type: form.invoice_type,
        invoice_no: form.invoice_no || null,
        period: form.period || null,
        amount: numericAmount,
        file_url,
        file_name,
        description: form.description || null,
      });
      onDone(); onClose();
    } catch (ex: any) {
      setErr(ex?.message ?? ex?.response?.data?.detail ?? "Kayıt oluşturulamadı.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Fatura Ekle</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-300 hover:text-slate-600" /></button>
        </div>
        <div className="px-5 py-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fatura Tipi *</label>
            <select value={form.invoice_type} onChange={(e) => setForm(p => ({...p, invoice_type: e.target.value}))}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {Object.entries(INVOICE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fatura No</label>
              <input value={form.invoice_no} onChange={(e) => setForm(p => ({...p, invoice_no: e.target.value}))}
                placeholder="2026-0001"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tutar *</label>
              <CurrencyInput value={form.amountRaw} onChange={(v) => setForm(p => ({...p, amountRaw: v}))}
                className="w-full rounded-lg border px-3 pr-7 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dönem</label>
            <input value={form.period} onChange={(e) => setForm(p => ({...p, period: e.target.value}))}
              placeholder="2026-06"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fatura Dosyası</label>
            <FileDropzone file={file} onFile={setFile} accept=".pdf,.xlsx,.docx,.jpg,.png,.zip" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Açıklama</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm(p => ({...p, description: e.target.value}))}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Vazgeç</button>
          <button onClick={handleSubmit} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            {busy ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ invoice, onClose, onDone }: { invoice: InvoiceRecord; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiDelete(`/invoice-records/${invoice.id}`);
      if (invoice.file_url) await apiDelete(`/documents/${invoice.file_url}`).catch(() => {});
      onDone(); onClose();
    } catch { alert("Silme işlemi başarısız."); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
            <Trash2 className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Fatura Sil</h3>
        </div>
        <p className="text-sm text-slate-600">Bu fatura kaydı silinecek. Devam etmek istiyor musunuz?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Vazgeç</button>
          <button onClick={handleDelete} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────────

export default function FaturaTab({ projectId }: { projectId: string }) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [deleting, setDeleting] = useState<InvoiceRecord | null>(null);
  const [opening,  setOpening]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<InvoiceRecord[]>(`/invoice-records/projects/${projectId}`).catch(() => []);
    setInvoices(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async (inv: InvoiceRecord) => {
    if (!inv.file_url) return;
    setOpening(inv.id);
    await openDocument(inv.file_url);
    setOpening(null);
  };

  const totalAmount = invoices.reduce((s, i) => s + (i.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Faturalar</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Mağazaya ait fatura kayıtları</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Fatura Ekle
        </button>
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Toplam Fatura", value: invoices.length,                                                color: "text-slate-700" },
            { label: "Onay Bekliyor", value: invoices.filter(i => i.approval_status === "pending").length,   color: "text-amber-600" },
            { label: "Toplam Tutar",  value: fmtTRY(totalAmount),                                            color: "text-blue-600"  },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-3 text-center">
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-dashed border-slate-200">
          <Receipt className="h-8 w-8 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">Fatura kaydı yok</p>
          <p className="text-xs text-slate-400">Süreç tamamlandıktan sonra fatura ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const st = APPROVAL_STATUS[inv.approval_status] ?? APPROVAL_STATUS.draft;
            const Icon = st.icon;
            return (
              <div key={inv.id} className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {INVOICE_TYPE_LABELS[inv.invoice_type] ?? inv.invoice_type}
                      </p>
                      {inv.invoice_no && <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{inv.invoice_no}</span>}
                      {inv.period && <span className="text-[11px] text-slate-400">{inv.period}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                        <Icon className="h-3 w-3" /> {st.label}
                      </span>
                      {inv.amount != null && (
                        <span className="text-xs font-bold text-slate-700">{fmtTRY(inv.amount, inv.currency)}</span>
                      )}
                    </div>
                    {inv.file_name && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Paperclip className="h-3 w-3 text-slate-300" />
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{inv.file_name}</span>
                      </div>
                    )}
                    {inv.description && <p className="text-[11px] text-slate-500 italic mt-1">{inv.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{inv.submitted_by_name ?? "—"} · {fmtDate(inv.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {inv.file_url && (
                      <button onClick={() => handleOpen(inv)} disabled={opening === inv.id}
                        className="flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50 disabled:opacity-50">
                        {opening === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Aç
                      </button>
                    )}
                    {inv.file_url && (
                      <button onClick={() => handleOpen(inv)} disabled={opening === inv.id}
                        className="flex items-center gap-1 text-[11px] text-blue-600 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-50 disabled:opacity-50">
                        <Download className="h-3.5 w-3.5" /> İndir
                      </button>
                    )}
                    <button onClick={() => setDeleting(inv)}
                      className="flex items-center gap-1 text-[11px] text-red-500 border border-red-100 rounded-lg px-2 py-1 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" /> Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal projectId={projectId} onClose={() => setShowAdd(false)} onDone={load} />}
      {deleting && <DeleteConfirm invoice={deleting} onClose={() => setDeleting(null)} onDone={load} />}
    </div>
  );
}

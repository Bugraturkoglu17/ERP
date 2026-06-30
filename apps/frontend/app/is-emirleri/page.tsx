"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Building2, CheckCircle2, ChevronDown, ClipboardList,
  ExternalLink, Loader2, MessageSquare, Plus, Search, Trash2, User, X, Zap, Copy, Download, FileText, Image as ImageIcon
} from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; project_no?: string; description?: string };

type AppUser = { id: string; full_name?: string; email: string; phone?: string; is_active?: boolean };

type WorkOrder = {
  id: string; project_id: string; project_name?: string; project_no?: string;
  work_type: string; work_type_label: string; title: string; description?: string;
  assigned_to_name?: string; assigned_to_phone?: string;
  priority: string; status: string; status_label: string;
  location_url?: string; due_date?: string;
  created_by_name?: string; sent_at?: string; completed_at?: string;
  photo_count: number; has_service_form: boolean; public_token?: string;
  photos?: { id: string, file_url: string, file_name: string, photo_type: string, uploaded_by_name?: string, uploaded_at: string }[];
  service_forms?: { id: string, file_url: string, file_name: string, year: number, month: number, uploaded_by_name?: string, uploaded_at: string }[];
  created_at: string; updated_at: string;
};

type WhatsappMessageLog = {
  id: string;
  work_order_id: string;
  to_phone: string;
  whatsapp_message_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const WORK_TYPES = [
  { value: "maintenance",   label: "Bakım"    },
  { value: "fault",         label: "Arıza"    },
  { value: "repair",        label: "Onarım"   },
  { value: "renovation",    label: "Tadilat"  },
  { value: "manufacturing", label: "İmalat"   },
  { value: "other",         label: "Diğer"    },
];

const PRIORITIES = [
  { value: "normal",   label: "Normal"  },
  { value: "urgent",   label: "Acil"    },
  { value: "critical", label: "Kritik"  },
];

const STATUS_COLOR: Record<string, string> = {
  draft:            "bg-slate-100 text-slate-600",
  sent:             "bg-blue-50 text-blue-700",
  started:          "bg-amber-50 text-amber-700",
  completed:        "bg-emerald-50 text-emerald-700",
  failed:           "bg-red-50 text-red-700",
  cancelled:        "bg-slate-100 text-slate-500",
  material_waiting: "bg-orange-50 text-orange-700",
  revisit:          "bg-purple-50 text-purple-700",
  approval_pending: "bg-yellow-50 text-yellow-700",
  approved:         "bg-emerald-100 text-emerald-800",
};

const PRIORITY_COLOR: Record<string, string> = {
  normal:   "bg-slate-100 text-slate-600",
  urgent:   "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function apiErrMsg(ex: unknown, fallback = "Bir hata oluştu."): string {
  const e = ex as { response?: { data?: { detail?: unknown } } };
  const d = e?.response?.data?.detail;
  if (typeof d === "string" && d !== "Not Found") return d;
  return fallback;
}

/** Proje description JSON'ından veya proje adından Google Maps arama linki üret */
function buildLocationUrl(project: Project): string {
  let searchTerm = project.name;
  if (project.description) {
    try {
      const d = JSON.parse(project.description) as Record<string, string>;
      const parts = [project.name, d.sehir, d.bolge].filter(Boolean);
      searchTerm = parts.join(" ");
    } catch {/* description JSON değil, proje adını kullan */}
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTerm)}`;
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────

function DeleteModal({
  wo, onClose, onDone,
}: { wo: WorkOrder; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleDelete = async () => {
    setBusy(true); setErr("");
    try {
      await apiDelete(`/work-orders/${wo.id}`);
      onDone();
    } catch (ex) {
      setErr(apiErrMsg(ex) || "İş emri silinemedi. Lütfen tekrar deneyin.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
            <Trash2 className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">İş Emri Sil</h3>
        </div>
        <p className="text-sm text-slate-600">
          Bu iş emri silinecek. Mağaza kartı silinmez, sadece bu iş emri kaldırılır. Devam etmek istiyor musunuz?
        </p>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
          <p className="text-xs font-semibold text-slate-700 truncate">{wo.title}</p>
          <p className="text-[10px] text-slate-400">{wo.project_name}</p>
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Vazgeç
          </button>
          <button onClick={handleDelete} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Form Modal ──────────────────────────────────────────────────────────

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users,    setUsers]    = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    work_type: "maintenance", title: "", description: "",
    assigned_to_name: "", assigned_to_phone: "", priority: "normal",
    due_date: "", location_url: "",
  });

  useEffect(() => {
    apiGet<Project[]>("/projects?limit=2000")
      .then(d => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
    apiGet<AppUser[]>("/auth/users")
      .then(d => setUsers(Array.isArray(d) ? d.filter(u => u.is_active !== false) : []))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() =>
    projects.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.project_no ?? "").includes(search)
    ), [projects, search]);

  const handleSelectProject = (p: Project) => {
    setSelProject(p);
    setForm(prev => ({ ...prev, location_url: buildLocationUrl(p) }));
  };

  const handleSelectUser = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uid = e.target.value;
    if (!uid) {
      setForm(prev => ({ ...prev, assigned_to_name: "", assigned_to_phone: "" }));
      return;
    }
    const u = users.find(u => u.id === uid);
    if (u) {
      setForm(prev => ({
        ...prev,
        assigned_to_name: u.full_name || u.email,
        assigned_to_phone: u.phone || "",
      }));
    }
  };

  const handleCreate = async () => {
    if (!selProject) { setErr("Mağaza seçin."); return; }
    if (!form.title.trim()) { setErr("İş başlığı zorunludur."); return; }
    setBusy(true); setErr("");
    try {
      await apiPost("/work-orders", {
        project_id: selProject.id,
        work_type: form.work_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        assigned_to_name: form.assigned_to_name.trim() || null,
        assigned_to_phone: form.assigned_to_phone.trim() || null,
        priority: form.priority,
        due_date: form.due_date ? `${form.due_date}T00:00:00` : null,
        location_url: form.location_url.trim() || null,
      });
      onDone();
    } catch (ex) { setErr(apiErrMsg(ex, "İş emri oluşturulamadı. Sunucu bağlantısı kontrol edilmeli.")); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">İş Emri Oluştur</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Adım {step} / 2</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-300 hover:text-slate-600" /></button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {[1, 2].map(i => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? "bg-blue-600" : "bg-slate-100"}`} />
          ))}
        </div>

        <div className="px-5 py-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {step === 1 && (
            <>
              <p className="text-xs font-semibold text-slate-700">Mağaza Seç</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Mağaza ara..." autoFocus
                  className="w-full rounded-xl border pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filtered.slice(0, 50).map(p => (
                  <button key={p.id} type="button" onClick={() => handleSelectProject(p)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selProject?.id === p.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                    }`}>
                    <Building2 className="h-4 w-4 text-slate-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.project_no ?? "—"}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-center text-xs text-slate-400 py-6">Bulunamadı.</p>}
              </div>
              {selProject && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="text-xs font-semibold text-blue-800">Seçili: {selProject.name}</p>
                  {selProject.project_no && <p className="text-[10px] text-blue-600 font-mono">{selProject.project_no}</p>}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {selProject && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 mb-1">
                  <p className="text-[11px] font-semibold text-slate-700">{selProject.name}</p>
                  {selProject.project_no && <p className="text-[10px] text-slate-400 font-mono">{selProject.project_no}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">İş Tipi *</label>
                  <select value={form.work_type} onChange={e => setForm(p => ({ ...p, work_type: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {WORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Öncelik</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {PRIORITIES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">İş Başlığı *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ör: Deveboynu kanalı imalatı" autoFocus
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">İş Açıklaması</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Detaylı açıklama..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none" />
              </div>

              {/* Atanacak kişi — kullanıcı listesinden seç */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Atanacak Kişi</span>
                </label>
                <div className="relative">
                  <select
                    onChange={handleSelectUser}
                    defaultValue=""
                    className="w-full appearance-none rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none pr-8"
                  >
                    <option value="">— Listeden seç veya aşağıya yaz —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}{u.phone ? ` (${u.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ad Soyad</label>
                  <input value={form.assigned_to_name} onChange={e => setForm(p => ({ ...p, assigned_to_name: e.target.value }))}
                    placeholder="Ad Soyad"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefon (WhatsApp)</label>
                  <input value={form.assigned_to_phone} onChange={e => setForm(p => ({ ...p, assigned_to_phone: e.target.value }))}
                    placeholder="05XX XXX XX XX"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Termin Tarihi</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Konum Linki</label>
                  <input value={form.location_url} onChange={e => setForm(p => ({ ...p, location_url: e.target.value }))}
                    placeholder="Google Maps linki"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              {form.location_url && (
                <p className="text-[10px] text-slate-400">
                  Konum mağaza bilgisinden otomatik oluşturuldu. Düzenleyebilirsiniz.
                </p>
              )}
            </>
          )}

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>

        <div className="flex justify-between border-t border-slate-100 px-5 py-4">
          <button onClick={() => step === 1 ? onClose() : setStep(1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {step === 1 ? "Vazgeç" : "← Geri"}
          </button>
          {step === 1 ? (
            <button onClick={() => { if (!selProject) { setErr("Mağaza seçin."); return; } setErr(""); setStep(2); }}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              İleri →
            </button>
          ) : (
            <button onClick={handleCreate} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" /> İş Emri Oluştur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp Gönder Butonu ────────────────────────────────────────────────────

function SendWhatsAppBtn({ wo, onRefresh }: { wo: WorkOrder; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!wo.assigned_to_phone) {
      alert("Atanacak kişinin telefon numarası bulunmuyor.");
      return;
    }
    if (!wo.location_url) {
      if (!confirm("Konum bilgisi girilmemiş. Yine de göndermek istiyor musunuz?")) return;
    } else {
      if (!confirm(`"${wo.assigned_to_name || wo.assigned_to_phone}" kişisine WhatsApp mesajı gönderilsin mi?`)) return;
    }
    setBusy(true); setErr("");
    try {
      await apiPost(`/work-orders/${wo.id}/send-whatsapp`, {});
      onRefresh();
    } catch (ex: any) {
      setErr(ex?.response?.data?.detail ?? "WhatsApp mesajı gönderilemedi.");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <button onClick={send} disabled={busy || !wo.assigned_to_phone}
        title={!wo.assigned_to_phone ? "Telefon numarası girilmemiş" : "WhatsApp ile bildir"}
        className="inline-flex items-center gap-1 text-xs text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50 disabled:opacity-40">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
        WhatsApp Gönder
      </button>
      {err && <p className="text-[10px] text-red-500 mt-1 max-w-[180px]">{err}</p>}
    </div>
  );
}

// ── Detail Drawer (WhatsApp Operations Center) ──────────────────────────────────

function DetailDrawer({
  wo, onClose, onRefresh
}: { wo: WorkOrder; onClose: () => void; onRefresh: () => void }) {
  const [messages, setMessages] = useState<WhatsappMessageLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [preview, setPreview] = useState<{
    template_name: string;
    language_code: string;
    preview_text: string;
    assigned_to?: string;
    assigned_phone?: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiGet<WhatsappMessageLog[]>(`/work-orders/${wo.id}/whatsapp-messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (ex) {
      console.error("Failed to load WhatsApp messages history:", ex);
    } finally {
      setLoadingHistory(false);
    }
  }, [wo.id]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => {
      fetchHistory();
      onRefresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchHistory, onRefresh]);

  const handleSend = async () => {
    if (!wo.assigned_to_phone) {
      showToast("Atanacak kişinin telefon numarası bulunmuyor.", "error");
      return;
    }
    setSending(true);
    try {
      await apiPost(`/work-orders/${wo.id}/send-whatsapp`, {});
      showToast("WhatsApp mesajı başarıyla kuyruğa alındı!");
      fetchHistory();
      onRefresh();
    } catch (ex: any) {
      const code = ex?.response?.status;
      if (code === 429) {
        showToast("Bu iş emri için son 2 dakika içinde bildirim gönderildi.", "error");
      } else {
        showToast(apiErrMsg(ex, "Mesaj gönderilemedi."), "error");
      }
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (!wo.public_token) return;
    const url = `${window.location.origin}/is-emri/${wo.public_token}`;
    navigator.clipboard.writeText(url);
    showToast("Public form linki kopyalandı!");
  };

  const loadPreview = async () => {
    if (!wo?.id) return;
    setPreviewLoading(true);
    try {
      const data = await apiGet<any>(`/work-orders/${wo.id}/preview-message`);
      setPreview(data as any);
      setShowPreview(true);
    } catch (ex: any) {
      showToast(ex?.response?.data?.detail || "Onizleme yuklenemedi.", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const lastMsg = messages[0];
  const lastStatus = lastMsg?.status ?? 'none';
  
  const getStatusStepIndex = (status: string) => {
    if (status === 'queued') return 0;
    if (status === 'sent') return 1;
    if (status === 'delivered') return 2;
    if (status === 'read') return 3;
    return -1;
  };
  
  const activeStepIndex = getStatusStepIndex(lastStatus);

  return (
    <>
      {/* Backdrop overlay */}
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity" />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-lg bg-slate-50 border-l border-slate-200/80 shadow-2xl flex flex-col transition-all duration-300">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white px-5 py-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{wo.title}</h3>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{wo.project_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          
          {/* General Information Card */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">Genel Bilgiler</h4>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">İş Tipi</span>
                <span className="font-semibold text-slate-800">{wo.work_type_label}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Öncelik</span>
                <span className={`inline-flex font-semibold px-2 py-0.5 rounded-full text-[10px] mt-0.5 ${PRIORITY_COLOR[wo.priority]}`}>
                  {wo.priority === "critical" ? "🔴 Kritik" : wo.priority === "urgent" ? "Acil" : "Normal"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Atanan Teknisyen</span>
                <span className="font-semibold text-slate-800">{wo.assigned_to_name || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Teknisyen Telefon</span>
                <span className="font-semibold text-slate-800">{wo.assigned_to_phone || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Termin Tarihi</span>
                <span className="font-semibold text-slate-800">
                  {wo.due_date ? new Date(wo.due_date).toLocaleDateString("tr-TR") : "Belirtilmemiş"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">Fotoğraflar / Form</span>
                <span className="font-semibold text-slate-800">
                  {wo.photo_count} Fotoğraf {wo.has_service_form ? "• Form Yüklendi" : ""}
                </span>
              </div>
            </div>

            {wo.description && (
              <div className="border-t border-slate-100 pt-3">
                <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Açıklama</span>
                <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 leading-relaxed">{wo.description}</p>
              </div>
            )}

            {/* Galeri & Formlar */}
            {(wo.photos?.length || wo.service_forms?.length) ? (
              <div className="border-t border-slate-100 pt-3 space-y-3">
                {wo.service_forms && wo.service_forms.length > 0 && (
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block mb-1.5">Yüklenen Servis Formu</span>
                    <div className="flex flex-col gap-2">
                      {wo.service_forms.map(form => (
                        <a key={form.id} href={form.file_url} target="_blank" rel="noreferrer"
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-200 transition-colors group">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm text-blue-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate">{form.file_name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Yükleyen: {form.uploaded_by_name || "Saha"} • {new Date(form.uploaded_at).toLocaleDateString("tr-TR")}</p>
                            </div>
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                            <Download className="h-3.5 w-3.5" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {wo.photos && wo.photos.length > 0 && (
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block mb-1.5">Fotoğraflar ({wo.photos.length})</span>
                    <div className="grid grid-cols-4 gap-2">
                      {wo.photos.map(photo => (
                        <a key={photo.id} href={photo.file_url} target="_blank" rel="noreferrer"
                           className="group relative block aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.file_url} alt={photo.file_name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <p className="text-[8px] font-bold text-white truncate drop-shadow-md">
                              {photo.photo_type === 'before' ? 'Öncesi' : photo.photo_type === 'after' ? 'Sonrası' : 'Genel'}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* WhatsApp Operations Center Card */}
          <div className="bg-gradient-to-br from-emerald-50/40 to-teal-50/20 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100/50 pb-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-600" /> WhatsApp Operasyon Merkezi
              </h4>
              <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] font-semibold text-slate-500">
                <input type="checkbox" checked={devMode} onChange={e => setDevMode(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3 w-3" />
                Geliştirici Modu
              </label>
            </div>

            {/* Status Lifecycle Banner / Flow */}
            {lastStatus === 'none' ? (
              <div className="text-center py-4 bg-white/60 border border-dashed border-emerald-100 rounded-xl px-4">
                <p className="text-xs font-semibold text-slate-500">Henüz bir WhatsApp bildirimi gönderilmedi.</p>
              </div>
            ) : (
              <div className="bg-white/80 border border-emerald-100/80 rounded-xl p-4 space-y-4">
                {lastStatus === 'failed' ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 space-y-1">
                    <p className="text-xs font-bold flex items-center gap-1">⚠️ Gönderim Başarısız</p>
                    <p className="text-[11px] leading-relaxed text-red-700">{lastMsg.error_message || "Meta API'den hata döndü veya numara geçersiz."}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gönderim Yaşam Döngüsü</p>
                    
                    {/* Horizontal Steps */}
                    <div className="flex items-center justify-between px-2 pt-2 pb-1 relative">
                      <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100 -z-10" />
                      <div 
                        className="absolute top-4 left-6 h-0.5 bg-emerald-500 -z-10 transition-all duration-500" 
                        style={{ width: `${activeStepIndex >= 0 ? (activeStepIndex / 3) * 100 : 0}%` }}
                      />

                      {[
                        { key: "queued", label: "Kuyrukta" },
                        { key: "sent", label: "Gönderildi" },
                        { key: "delivered", label: "İletildi" },
                        { key: "read", label: "Okundu" },
                      ].map((step, idx) => {
                        const isActive = idx <= activeStepIndex;
                        const isCurrent = idx === activeStepIndex;
                        
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1 relative">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all duration-300 ${
                              isActive 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200" 
                                : "bg-white border-slate-200 text-slate-300"
                            }`}>
                              {isActive ? "✓" : idx + 1}
                            </div>
                            <span className={`text-[9px] transition-colors duration-300 ${
                              isCurrent ? "text-emerald-700 font-bold" :
                              isActive ? "text-slate-600 font-semibold" :
                              "text-slate-400"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Audit Timestamps */}
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Son Gönderim Zamanı</span>
                    <span className="font-medium text-slate-700">
                      {lastMsg.created_at ? new Date(lastMsg.created_at).toLocaleString("tr-TR") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Son Durum / Okuma</span>
                    <span className="font-medium text-slate-700">
                      {lastStatus === "read" && lastMsg.updated_at 
                        ? `Okundu (${new Date(lastMsg.updated_at).toLocaleString("tr-TR")})` 
                        : lastMsg.status === "delivered" ? "İletildi (Telefonda)" 
                        : lastMsg.status === "sent" ? "Gönderildi (Sistemden)"
                        : lastMsg.status === "failed" ? "Başarısız"
                        : "Kuyrukta"}
                    </span>
                  </div>
                  {devMode && (
                    <div className="col-span-2 bg-slate-50 border border-slate-200/50 rounded-lg p-2 font-mono text-[9px] text-slate-500 overflow-x-auto select-all leading-normal whitespace-pre-wrap">
                      wamid: {lastMsg.whatsapp_message_id || "null (pending)"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buttons Panel */}
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={handleSend} 
                disabled={sending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-100"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {lastStatus === 'none' ? "WhatsApp Gönder" : "Yeniden Gönder"}
              </button>
              
              <button
                onClick={loadPreview}
                disabled={previewLoading}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {previewLoading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                ) : (
                  <MessageSquare className="h-3 w-3" />
                )}
                Mesaj Onizle
              </button>

              {showPreview && preview && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      {preview.template_name}
                    </span>
                    <button onClick={() => setShowPreview(false)} className="text-[11px] text-blue-400 hover:text-blue-600">x</button>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-3 max-w-[260px]">
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {preview.preview_text}
                    </p>
                  </div>
                  {preview.assigned_to && (
                    <p className="mt-2 text-[11px] text-blue-600">
                      {preview.assigned_to} - {preview.assigned_phone}
                    </p>
                  )}
                </div>
              )}
              
              {wo.public_token && (
                <>
                  <button 
                    onClick={copyLink}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 hover:bg-slate-50 transition-colors hover:border-slate-300"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400" /> Linki Kopyala
                  </button>
                  <a 
                    href={`${window.location.origin}/is-emri/${wo.public_token}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 hover:bg-slate-50 transition-colors hover:border-slate-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> Public Form
                  </a>
                </>
              )}
            </div>
          </div>

          {/* WhatsApp Sending History Logs List */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">Gönderim Geçmişi</h4>
            
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Bu iş emrine ait bir WhatsApp geçmişi bulunmuyor.</p>
            ) : (
              <div className="relative pl-6 space-y-4 border-l border-slate-100 ml-2">
                {messages.map((msg) => {
                  let badgeColor = "bg-slate-50 text-slate-600";
                  let statusLabel = "Kuyrukta";
                  let icon = "⏳";
                  
                  if (msg.status === "sent") {
                    badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                    statusLabel = "Gönderildi";
                    icon = "✓";
                  } else if (msg.status === "delivered") {
                    badgeColor = "bg-teal-50 text-teal-700 border-teal-100";
                    statusLabel = "İletildi";
                    icon = "✓✓";
                  } else if (msg.status === "read") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    statusLabel = "Okundu";
                    icon = "✓✓";
                  } else if (msg.status === "failed") {
                    badgeColor = "bg-red-50 text-red-700 border-red-100";
                    statusLabel = "Başarısız";
                    icon = "🛑";
                  }

                  return (
                    <div key={msg.id} className="relative text-xs space-y-1">
                      {/* Left timeline status dot */}
                      <div className={`absolute -left-[31px] top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-white text-[9px] font-bold ${
                        msg.status === "read" ? "text-emerald-600 border-emerald-200" :
                        msg.status === "failed" ? "text-red-500 border-red-200" :
                        "text-slate-400 border-slate-200"
                      }`}>
                        {icon}
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`inline-flex font-semibold px-2 py-0.5 rounded-md border text-[10px] ${badgeColor}`}>
                          {statusLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.created_at).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      
                      {msg.error_message && (
                        <p className="text-[10px] text-red-600 leading-relaxed bg-red-50/50 border border-red-100/50 rounded-lg p-2 font-medium mt-1">
                          Hata: {msg.error_message}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Alıcı: {msg.to_phone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-xs font-semibold animate-fade-in ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100" :
            toast.type === "error" ? "bg-red-50 border-red-200 text-red-800 shadow-red-100" :
            "bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100"
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IsEmirleriPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<WorkOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiGet<WorkOrder[]>("/work-orders").catch(() => []);
    const ordersList = Array.isArray(d) ? d : [];
    setOrders(ordersList);
    setLoading(false);

    // If detail drawer is open, keep the selected order synchronized with fresh data!
    if (selectedOrder) {
      const fresh = ordersList.find(o => o.id === selectedOrder.id);
      if (fresh) {
        setSelectedOrder(fresh);
      }
    }
  }, [selectedOrder]);

  // Initial load only; refresh paths call load explicitly to keep selected order in sync.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => orders.filter(o => {
    if (filterType && o.work_type !== filterType) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    if (query && !o.project_name?.toLowerCase().includes(query.toLowerCase()) && !o.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [orders, query, filterType, filterStatus]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">İş Emirleri</h1>
            <p className="text-xs text-slate-500">WhatsApp ile yönlendirilen iş emirleri</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> İş Emri Oluştur
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Mağaza veya iş başlığı ara..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">Tüm İş Tipleri</option>
          {WORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">Tüm Durumlar</option>
          {[
            ["draft","Taslak"],["sent","WhatsApp Gönderildi"],["started","İşe Başlandı"],
            ["completed","Tamamlandı"],["failed","Tamamlanmadı"],["cancelled","İptal"],
            ["material_waiting","Malzeme Bekliyor"],["revisit","Tekrar Gidilecek"],
            ["approval_pending","Onay Bekliyor"],["approved","Onaylandı"],
          ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Toplam", value: orders.length, color: "text-slate-900" },
          { label: "Gönderildi", value: orders.filter(o => o.status === "sent").length, color: "text-blue-600" },
          { label: "Devam Ediyor", value: orders.filter(o => o.status === "started").length, color: "text-amber-600" },
          { label: "Tamamlandı", value: orders.filter(o => o.status === "completed").length, color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-dashed border-slate-200 bg-white">
          <ClipboardList className="h-12 w-12 text-slate-200" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600">İş emri bulunamadı.</p>
            <p className="text-xs text-slate-400 mt-1">Yeni iş emri oluşturun.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> İş Emri Oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(wo => (
            <div 
              key={wo.id} 
              onClick={() => setSelectedOrder(wo)}
              className="cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start gap-4">
                {/* Sol: iş bilgileri */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[wo.priority] ?? "bg-slate-100 text-slate-600"}`}>
                      {wo.priority === "critical" ? "🔴 KRİTİK" : wo.priority === "urgent" ? "🟠 ACİL" : "NORMAL"}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
                      {wo.work_type_label}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[wo.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {wo.status_label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate">{wo.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <Link href={`/projects/${wo.project_id}`} onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline font-medium">
                      {wo.project_name}
                    </Link>
                    {wo.project_no && <span className="text-[10px] text-slate-400 font-mono">{wo.project_no}</span>}
                    {wo.due_date && (
                      <span className="text-[10px] text-slate-500">
                        Termin: {new Date(wo.due_date).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                  {wo.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{wo.description}</p>
                  )}
                  {(wo.assigned_to_name || wo.assigned_to_phone) && (
                    <p className="text-xs text-slate-600 mt-1.5">
                      👤 {wo.assigned_to_name || ""} {wo.assigned_to_phone ? `(${wo.assigned_to_phone})` : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {wo.photo_count > 0 && (
                      <span className="text-[10px] text-slate-500">{wo.photo_count} fotoğraf</span>
                    )}
                    {wo.has_service_form && (
                      <span className="text-[10px] text-emerald-600">✓ Servis formu</span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(wo.created_at).toLocaleDateString("tr-TR")} • {wo.created_by_name}
                    </span>
                  </div>
                </div>

                {/* Sağ: aksiyonlar */}
                <div className="flex flex-col items-end gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <SendWhatsAppBtn wo={wo} onRefresh={load} />
                  {wo.public_token && (
                    <a href={`${baseUrl}/is-emri/${wo.public_token}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                      <ExternalLink className="h-3 w-3" /> Public Link
                    </a>
                  )}
                  <Link href={`/projects/${wo.project_id}?tab=work-orders`}
                    className="text-[11px] text-slate-400 hover:text-slate-600">
                    Mağaza Kartı →
                  </Link>
                  <button onClick={() => setDeleting(wo)}
                    className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 mt-1">
                    <Trash2 className="h-3.5 w-3.5" /> Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />
      )}
      {deleting && (
        <DeleteModal
          wo={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => { setDeleting(null); load(); }}
        />
      )}
      {selectedOrder && (
        <DetailDrawer
          wo={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}

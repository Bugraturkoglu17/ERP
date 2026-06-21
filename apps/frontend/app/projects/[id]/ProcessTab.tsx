"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Flame,
  HardHat,
  Loader2,
  MessageSquarePlus,
  Play,
  Plus,
  Receipt,
  Save,
  Thermometer,
  Wrench,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type StageStatus = "pending" | "in_progress" | "completed" | "delayed" | "cancelled";

type Stage = {
  id: string;
  process_id: string;
  name: string;
  order_index: number;
  status: StageStatus;
  responsible_name?: string;
  target_end_date?: string;
  completed_at?: string;
  note?: string;
};

type Process = {
  id: string;
  project_id: string;
  work_type: string;
  title: string;
  description?: string;
  status: string;
  start_date?: string;
  target_end_date?: string;
  completed_at?: string;
  responsible_name?: string;
  progress_percent: number;
  created_at: string;
  stages: Stage[];
};

type ProcessNote = {
  id: string;
  process_id: string;
  user_name?: string;
  note_type: string;
  content: string;
  created_at: string;
};

// ── Scope config ───────────────────────────────────────────────────────────────

const SCOPE_OPTIONS = [
  { value: "yangin_dolabi",    label: "Yangın Dolabı",      icon: Flame       },
  { value: "sprinkler_hatti",  label: "Sprinkler Hattı",    icon: Zap         },
  { value: "havalandirma",     label: "Havalandırma",       icon: Wrench      },
  { value: "kanal_imalati",    label: "Kanal İmalatı",      icon: Wrench      },
  { value: "klima_sogutma",    label: "Klima / Soğutma",    icon: Thermometer },
  { value: "mekanik_tesisat",  label: "Mekanik Tesisat",    icon: HardHat     },
] as const;

type ScopeValue = typeof SCOPE_OPTIONS[number]["value"];

function getScopeLabel(code: string) {
  return SCOPE_OPTIONS.find(o => o.value === code)?.label ?? code;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const WORK_TYPE_LABELS: Record<string, string> = {
  tadilat:    "Tadilat",
  yeni_yapim: "Yeni Yapım",
  bakim:      "Bakım",
};

const STAGE_STATUS: Record<StageStatus, { label: string; icon: React.ElementType; dot: string; text: string; bg: string }> = {
  pending:     { label: "Bekliyor",     icon: Circle,        dot: "bg-slate-300", text: "text-slate-500",  bg: "bg-slate-50"  },
  in_progress: { label: "Devam Ediyor",icon: Play,          dot: "bg-blue-400",  text: "text-blue-700",   bg: "bg-blue-50"   },
  completed:   { label: "Tamamlandı",  icon: CheckCircle2,  dot: "bg-green-400", text: "text-green-700",  bg: "bg-green-50"  },
  delayed:     { label: "Gecikti",     icon: AlertTriangle, dot: "bg-red-400",   text: "text-red-700",    bg: "bg-red-50"    },
  cancelled:   { label: "İptal",       icon: XCircle,       dot: "bg-slate-300", text: "text-slate-400",  bg: "bg-slate-100" },
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  general: "Genel", firm: "Firma", technical: "Teknik",
  approval: "Onay", revision: "Revizyon",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function calcDays(target?: string): { text: string; color: string } {
  if (!target) return { text: "", color: "" };
  const d = Math.ceil((new Date(target).getTime() - Date.now()) / 86400000);
  if (d > 0)  return { text: `${d}g kaldı`, color: "text-blue-600" };
  if (d === 0) return { text: "Bugün teslim", color: "text-amber-600" };
  return { text: `${Math.abs(d)}g gecikti`, color: "text-red-600" };
}

// ── Stage Update Modal ─────────────────────────────────────────────────────────

function StageUpdateModal({ stage, processId, projectId, onClose, onDone }: {
  stage: Stage; processId: string; projectId: string;
  onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState({
    status: stage.status,
    responsible_name: stage.responsible_name ?? "",
    target_end_date: stage.target_end_date?.split("T")[0] ?? "",
    completed_at: stage.completed_at?.split("T")[0] ?? "",
    note: stage.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await apiPatch(`/process/projects/${projectId}/process/${processId}/stages/${stage.id}`, {
        status: form.status,
        responsible_name: form.responsible_name || null,
        target_end_date: form.target_end_date ? `${form.target_end_date}T00:00:00` : null,
        completed_at: form.completed_at ? `${form.completed_at}T00:00:00` : null,
        note: form.note || null,
      });
      onDone(); onClose();
    } catch (ex: any) {
      setErr(ex?.response?.data?.detail ?? "Güncelleme başarısız.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Aşama Güncelle</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{stage.name}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-300 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Durum</label>
            <select value={form.status} onChange={(e) => setForm(p => ({...p, status: e.target.value as StageStatus}))}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {Object.entries(STAGE_STATUS).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sorumlu Kişi</label>
            <input value={form.responsible_name} onChange={(e) => setForm(p => ({...p, responsible_name: e.target.value}))}
              placeholder="Atanmadı"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hedef Bitiş</label>
              <input type="date" value={form.target_end_date}
                onChange={(e) => setForm(p => ({...p, target_end_date: e.target.value}))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tamamlanma Tarihi</label>
              <input type="date" value={form.completed_at}
                onChange={(e) => setForm(p => ({...p, completed_at: e.target.value}))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Not</label>
            <textarea rows={2} value={form.note} onChange={(e) => setForm(p => ({...p, note: e.target.value}))}
              placeholder="Aşama notu..."
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Vazgeç</button>
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Güncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Scope Card ─────────────────────────────────────────────────────────────────

function ScopeCard({
  process, projectId, onUpdate, onTabSwitch,
}: {
  process: Process;
  projectId: string;
  onUpdate: () => void;
  onTabSwitch?: (tab: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [notes, setNotes] = useState<ProcessNote[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const isCompleted = process.status === "completed";
  const currentStage = process.stages.find(s => s.status === "in_progress")
    ?? process.stages.find(s => s.status === "pending");

  const loadNotes = async () => {
    const n = await apiGet<ProcessNote[]>(`/process/projects/${projectId}/process/${process.id}/notes`).catch(() => []);
    setNotes(Array.isArray(n) ? n : []);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await apiPost(`/process/projects/${projectId}/process/${process.id}/notes`, {
        content: noteText.trim(), note_type: noteType,
      });
      setNoteText("");
      await loadNotes();
    } finally { setSavingNote(false); }
  };

  const toggleNotes = async () => {
    if (!showNotes && notes.length === 0) await loadNotes();
    setShowNotes(v => !v);
  };

  const scopeLabel = getScopeLabel(process.title.toLowerCase().replace(/ /g, "_")) || process.title;
  const cd = isCompleted ? null : calcDays(process.target_end_date);

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
      isCompleted ? "border-green-200" : "border-slate-200"
    }`}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isCompleted ? "bg-green-50" : "bg-blue-50"
        }`}>
          {isCompleted
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <Circle className="h-4 w-4 text-blue-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">{process.title}</p>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isCompleted
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
            }`}>
              {isCompleted ? "Tamamlandı" : WORK_TYPE_LABELS[process.work_type] ?? process.work_type}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {!isCompleted && currentStage && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                {currentStage.name}
              </span>
            )}
            {cd && <span className={`text-[11px] font-medium ${cd.color}`}>{cd.text}</span>}
            {isCompleted && process.completed_at && (
              <span className="text-[11px] text-green-600">{fmtDate(process.completed_at)}</span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="shrink-0 text-right">
          <p className={`text-sm font-bold ${isCompleted ? "text-green-600" : "text-blue-600"}`}>
            {process.progress_percent}%
          </p>
          <div className="w-16 h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCompleted ? "bg-green-400" : "bg-blue-400"}`}
              style={{ width: `${process.progress_percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
        <button
          onClick={() => setExpanded(v => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Aşamalar ({process.stages.filter(s => s.status === "completed").length}/{process.stages.length})
        </button>
        <button
          onClick={toggleNotes}
          className="inline-flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50"
        >
          <MessageSquarePlus className="h-3 w-3" /> Not Ekle
        </button>

        {/* Tamamlandıysa fatura/hakkediş butonları */}
        {isCompleted && (
          <>
            <button
              onClick={() => onTabSwitch?.("hakkediş")}
              className="inline-flex items-center gap-1 text-[11px] text-blue-700 border border-blue-200 bg-blue-50 rounded-lg px-2.5 py-1 hover:bg-blue-100 font-medium"
            >
              <Receipt className="h-3 w-3" /> Hakkediş Yükle
            </button>
            <button
              onClick={() => onTabSwitch?.("fatura")}
              className="inline-flex items-center gap-1 text-[11px] text-green-700 border border-green-200 bg-green-50 rounded-lg px-2.5 py-1 hover:bg-green-100 font-medium"
            >
              <Receipt className="h-3 w-3" /> Fatura Yükle
            </button>
          </>
        )}
      </div>

      {/* Expandable timeline */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-1.5 bg-slate-50/50">
          {process.stages.map((stage, idx) => {
            const cfg = STAGE_STATUS[stage.status] ?? STAGE_STATUS.pending;
            const Icon = cfg.icon;
            const isLast = idx === process.stages.length - 1;
            return (
              <div key={stage.id} className="flex gap-2.5">
                <div className="flex flex-col items-center pt-0.5">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                    <Icon className={`h-3 w-3 ${cfg.text}`} />
                  </div>
                  {!isLast && <div className="mt-0.5 flex-1 w-px bg-slate-200 min-h-[12px]" />}
                </div>
                <div className={`flex-1 rounded-lg border p-2.5 mb-1 ${
                  stage.status === "in_progress" ? "border-blue-100 bg-blue-50/60" :
                  stage.status === "completed"   ? "border-green-100 bg-green-50/40" :
                  "border-slate-100 bg-white"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${cfg.text}`}>{stage.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {stage.note && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{stage.note}</span>
                        )}
                        {stage.completed_at && (
                          <span className="text-[10px] text-green-600">{fmtDate(stage.completed_at)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditStage(stage)}
                      className="shrink-0 text-[10px] text-slate-400 border border-slate-200 rounded px-2 py-0.5 hover:text-blue-600 hover:border-blue-200"
                    >
                      Güncelle
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes panel */}
      {showNotes && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <select value={noteType} onChange={(e) => setNoteType(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none">
              {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Not ekle..."
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none"
            />
            <button onClick={addNote} disabled={!noteText.trim() || savingNote}
              className="self-end inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40">
              {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquarePlus className="h-3 w-3" />}
              Ekle
            </button>
          </div>
          {notes.map(note => (
            <div key={note.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                  note.note_type === "technical" ? "bg-blue-50 text-blue-700" :
                  note.note_type === "firm"      ? "bg-purple-50 text-purple-700" :
                  note.note_type === "approval"  ? "bg-green-50 text-green-700" :
                  note.note_type === "revision"  ? "bg-amber-50 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                </span>
                <span className="text-[10px] text-slate-400">
                  {note.user_name ?? "—"} · {fmtDate(note.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-2">Henüz not yok.</p>
          )}
        </div>
      )}

      {editStage && (
        <StageUpdateModal
          stage={editStage}
          processId={process.id}
          projectId={projectId}
          onClose={() => setEditStage(null)}
          onDone={onUpdate}
        />
      )}
    </div>
  );
}

// ── New Process Wizard ─────────────────────────────────────────────────────────

function NewProcessWizard({ projectId, onClose, onDone }: {
  projectId: string; onClose: () => void; onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    work_type: "tadilat",
    scope_codes: [] as ScopeValue[],
    title: "",
    start_date: new Date().toISOString().split("T")[0],
    target_end_date: "",
    responsible_name: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isBakim = form.work_type === "bakim";

  const toggleScope = (v: ScopeValue) => {
    setForm(p => ({
      ...p,
      scope_codes: p.scope_codes.includes(v)
        ? p.scope_codes.filter(c => c !== v)
        : [...p.scope_codes, v],
    }));
  };

  const next = () => {
    setErr("");
    if (step === 1 && !isBakim && form.scope_codes.length === 0) {
      setErr("En az bir iş kalemi seçin."); return;
    }
    if (step === 2 && !form.title.trim() && isBakim) {
      setErr("Süreç adı zorunludur."); return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setBusy(true); setErr("");
    try {
      if (isBakim || form.scope_codes.length <= 1) {
        const scopeCode = isBakim ? undefined : form.scope_codes[0];
        await apiPost(`/process/projects/${projectId}/process`, {
          work_type: form.work_type,
          title: form.title.trim() || (scopeCode ? getScopeLabel(scopeCode) : "Bakım Süreci"),
          scope_code: scopeCode,
          start_date: form.start_date ? `${form.start_date}T00:00:00` : null,
          target_end_date: form.target_end_date ? `${form.target_end_date}T00:00:00` : null,
          responsible_name: form.responsible_name || null,
        });
      } else {
        await apiPost(`/process/projects/${projectId}/process/bulk`, {
          work_type: form.work_type,
          title: form.title.trim() || WORK_TYPE_LABELS[form.work_type],
          scope_codes: form.scope_codes,
          start_date: form.start_date ? `${form.start_date}T00:00:00` : null,
          target_end_date: form.target_end_date ? `${form.target_end_date}T00:00:00` : null,
          responsible_name: form.responsible_name || null,
        });
      }
      onDone(); onClose();
    } catch (ex: any) {
      setErr(ex?.response?.data?.detail ?? "Süreç başlatılamadı.");
    } finally { setBusy(false); }
  };

  const totalSteps = isBakim ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Yeni Süreç Başlat</h3>
            <p className="text-[11px] text-slate-400">Adım {step} / {totalSteps}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-300 hover:text-slate-600" /></button>
        </div>

        {/* Progress bar */}
        <div className="flex px-6 pt-4 gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < step ? "bg-blue-600" : "bg-slate-100"}`} />
          ))}
        </div>

        <div className="px-6 py-5 space-y-4 min-h-[260px]">

          {/* Step 1: İş Tipi */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">İş Tipi Seçin</p>
              {[
                { value: "tadilat",    label: "Tadilat",    desc: "Mevcut mağazada yenileme veya değişiklik" },
                { value: "yeni_yapim", label: "Yeni Yapım", desc: "Sıfırdan kurulum veya proje inşaatı" },
                { value: "bakim",      label: "Bakım",      desc: "Periyodik bakım ve servis işleri" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(p => ({ ...p, work_type: opt.value }))}
                  className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    form.work_type === opt.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    form.work_type === opt.value ? "border-blue-600" : "border-slate-300"
                  }`}>
                    {form.work_type === opt.value && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: İş Kalemleri (sadece tadilat/yeni yapım) */}
          {step === 2 && !isBakim && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">İş Kalemleri Seçin</p>
                <p className="text-xs text-slate-500 mt-0.5">Her kalem için ayrı süreç oluşturulur.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SCOPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const selected = form.scope_codes.includes(opt.value);
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => toggleScope(opt.value)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                        selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                      }`}>
                      <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-blue-600" : "text-slate-400"}`} />
                      <span className={`text-xs font-medium ${selected ? "text-blue-700" : "text-slate-700"}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {form.scope_codes.length > 0 && (
                <p className="text-[11px] text-blue-600 font-medium">
                  {form.scope_codes.length} kalem seçildi: {form.scope_codes.map(getScopeLabel).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Step 2 (bakim) or Step 3 (others): Bilgiler */}
          {((step === 2 && isBakim) || (step === 3 && !isBakim)) && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Süreç Bilgileri</p>
              {(isBakim || form.scope_codes.length > 1) && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Süreç Adı</label>
                  <input value={form.title} onChange={(e) => setForm(p => ({...p, title: e.target.value}))}
                    placeholder={isBakim ? "Bakım Süreci" : `${WORK_TYPE_LABELS[form.work_type]} — Mağaza Adı`}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Başlangıç Tarihi</label>
                  <input type="date" value={form.start_date}
                    onChange={(e) => setForm(p => ({...p, start_date: e.target.value}))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hedef Bitiş</label>
                  <input type="date" value={form.target_end_date}
                    onChange={(e) => setForm(p => ({...p, target_end_date: e.target.value}))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sorumlu Kişi</label>
                <input value={form.responsible_name}
                  onChange={(e) => setForm(p => ({...p, responsible_name: e.target.value}))}
                  placeholder="Atanmadı"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              {/* Preview: oluşacak süreçler */}
              {!isBakim && form.scope_codes.length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[11px] font-semibold text-blue-700 mb-1.5">Oluşacak Süreçler:</p>
                  <div className="space-y-1">
                    {form.scope_codes.map(code => (
                      <div key={code} className="flex items-center gap-2 text-xs text-blue-800">
                        <CheckCircle2 className="h-3 w-3 text-blue-400" />
                        {getScopeLabel(code)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-slate-100 px-6 py-4">
          <button type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {step > 1 ? "Geri" : "Vazgeç"}
          </button>
          {step < totalSteps ? (
            <button type="button" onClick={next}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              İleri →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Süreci Başlat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ProcessTab ─────────────────────────────────────────────────────────────────

export default function ProcessTab({
  projectId,
  workType,
  onTabSwitch,
}: {
  projectId: string;
  workType: string;
  onTabSwitch?: (tab: string) => void;
}) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const procs = await apiGet<Process[]>(`/process/projects/${projectId}/process`).catch(() => []);
    setProcesses(Array.isArray(procs) ? procs : []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400">Yükleniyor...</p>
      </div>
    );
  }

  const active    = processes.filter(p => p.status !== "completed" && p.status !== "cancelled" && p.status !== "deleted");
  const completed = processes.filter(p => p.status === "completed");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Süreç Takibi</h3>
        <button onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Yeni Süreç
        </button>
      </div>

      {processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-4 rounded-2xl border border-dashed border-slate-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Clock className="h-6 w-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Henüz süreç yok</p>
            <p className="text-xs text-slate-400 mt-1">İş kalemleri seçerek ayrı süreçler oluşturun.</p>
          </div>
          <button onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Süreç Başlat
          </button>
        </div>
      ) : (
        <>
          {/* Aktif Süreçler */}
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Aktif İş Kalemleri — {active.length}
              </p>
              {active.map(proc => (
                <ScopeCard
                  key={proc.id}
                  process={proc}
                  projectId={projectId}
                  onUpdate={loadAll}
                  onTabSwitch={onTabSwitch}
                />
              ))}
            </div>
          )}

          {/* Tamamlanan Süreçler */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Tamamlanan İş Kalemleri — {completed.length}
              </p>
              {completed.map(proc => (
                <ScopeCard
                  key={proc.id}
                  process={proc}
                  projectId={projectId}
                  onUpdate={loadAll}
                  onTabSwitch={onTabSwitch}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showWizard && (
        <NewProcessWizard
          projectId={projectId}
          onClose={() => setShowWizard(false)}
          onDone={loadAll}
        />
      )}
    </div>
  );
}

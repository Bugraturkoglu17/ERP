"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Circle, AlertTriangle, X,
  Loader2, CalendarDays, User, Building2, Clock,
  ImageIcon,
} from "lucide-react";
import {
  getManagerWorkOrderById,
  updateWorkOrder,
  cancelWorkOrder,
  transferWorkOrderImageToStore,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type WorkOrder,
  type WorkOrderPriority,
} from "@/services/managerWorkOrders";
import { getUsers } from "@/services/adminUsers";

const STAGES = [
  "İş Emri Oluşturuldu",
  "Sürece Başlandı",
  "İşlem Devam Ediyor",
  "Tamamlandı",
];

function completedStageCount(status: WorkOrder["status"]): number {
  if (status === "in_progress") return 3;
  if (status === "completed")   return 4;
  return 1; // planned or cancelled
}

const CATEGORY_STYLE: Record<string, string> = {
  ariza:     "bg-red-100 text-red-700",
  tadilat:   "bg-amber-100 text-amber-700",
  yeni_yapim:"bg-blue-100 text-blue-700",
};

const PRIORITY_STYLE: Record<string, string> = {
  normal:    "bg-slate-100 text-slate-600",
  important: "bg-amber-100 text-amber-700",
  critical:  "bg-red-100 text-red-700",
};

const STATUS_STYLE: Record<string, string> = {
  planned:    "bg-blue-100 text-blue-700",
  in_progress:"bg-orange-100 text-orange-700",
  completed:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-slate-100 text-slate-500",
};

const SEVERITY_STYLE: Record<string, string> = {
  normal:    "bg-slate-100 text-slate-600",
  important: "bg-amber-100 text-amber-700",
  critical:  "bg-red-100 text-red-700",
};

const SEVERITY_LABEL: Record<string, string> = {
  normal: "Normal", important: "Önemli", critical: "Kritik",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none";

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("tr-TR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function InfoCard({
  icon, label, value, sub, valueClass, subClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  subClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-sm font-semibold text-slate-900 ${valueClass ?? ""}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${subClass ?? "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

interface EditForm {
  priority: WorkOrderPriority;
  assigned_to: string;
  due_date: string;
  manager_note: string;
}

export default function ManagerIsEmriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    priority: "normal", assigned_to: "", due_date: "", manager_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  const [transferringKey, setTransferringKey] = useState<string | null>(null);

  const users = getUsers().filter((u) => u.role === "USER" && u.status === "active");

  useEffect(() => {
    const data = getManagerWorkOrderById(id);
    if (!data) { setNotFound(true); return; }
    setWo(data);
    setNoteText(data.manager_note);
  }, [id]);

  function reload() {
    const data = getManagerWorkOrderById(id);
    if (data) { setWo(data); setNoteText(data.manager_note); }
  }

  function openEdit() {
    if (!wo) return;
    setEditForm({
      priority: wo.priority,
      assigned_to: wo.assigned_to,
      due_date: wo.due_date ?? "",
      manager_note: wo.manager_note,
    });
    setShowEdit(true);
  }

  function handleSaveEdit() {
    if (!wo) return;
    setSaving(true);
    const user = users.find((u) => u.id === editForm.assigned_to);
    updateWorkOrder(wo.id, {
      priority: editForm.priority,
      assigned_to: editForm.assigned_to,
      assigned_to_name: user ? `${user.first_name} ${user.last_name}` : wo.assigned_to_name,
      due_date: editForm.due_date || null,
      manager_note: editForm.manager_note,
    });
    reload();
    setSaving(false);
    setShowEdit(false);
  }

  function handleSaveNote() {
    if (!wo) return;
    setNoteSaving(true);
    updateWorkOrder(wo.id, { manager_note: noteText });
    reload();
    setNoteSaving(false);
    setNoteEditing(false);
  }

  function handleCancel() {
    if (!wo) return;
    setCancelling(true);
    cancelWorkOrder(wo.id);
    reload();
    setCancelling(false);
    setShowCancel(false);
  }

  function handleTransfer(reportId: string, imageId: string) {
    if (!wo) return;
    const key = `${reportId}-${imageId}`;
    setTransferringKey(key);
    transferWorkOrderImageToStore(wo.id, reportId, imageId);
    reload();
    setTransferringKey(null);
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="mb-4 text-sm text-slate-500">İş emri bulunamadı.</p>
        <Link href="/manager/is-emirleri" className="text-sm text-blue-600 hover:underline">
          ← Listeye Dön
        </Link>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const isCancelled = wo.status === "cancelled";
  const isCompleted = wo.status === "completed";
  const overdue =
    wo.due_date && !isCancelled && !isCompleted && new Date(wo.due_date) < new Date();
  const stagesDone = completedStageCount(wo.status);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLE[wo.category]}`}>
              {CATEGORY_LABEL[wo.category]}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLE[wo.priority]}`}>
              {PRIORITY_LABEL[wo.priority]}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[wo.status]}`}>
              {STATUS_LABEL[wo.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{wo.title}</h1>
          {wo.description && <p className="mt-1.5 text-sm text-slate-500">{wo.description}</p>}
        </div>
        {!isCancelled && !isCompleted && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={openEdit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-white"
            >
              Düzenle
            </button>
            <button
              onClick={() => setShowCancel(true)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              İptal Et
            </button>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard icon={<Building2 className="h-4 w-4" />} label="Mağaza" value={wo.store_name} sub={wo.store_code} />
        <InfoCard icon={<User className="h-4 w-4" />} label="Atanan" value={wo.assigned_to_name} />
        <InfoCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Son Tarih"
          value={wo.due_date ? formatDate(wo.due_date) : "—"}
          valueClass={overdue ? "text-red-600" : undefined}
          sub={overdue ? "Gecikti" : undefined}
          subClass="text-red-500"
        />
        <InfoCard icon={<Clock className="h-4 w-4" />} label="Oluşturulma" value={formatDate(wo.created_at)} />
      </div>

      {/* Progress Timeline */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-5 text-sm font-semibold text-slate-700">İlerleme</h2>
        {isCancelled ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <X className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Bu iş emri iptal edildi.</span>
          </div>
        ) : (
          <div className="flex items-start">
            {STAGES.map((label, i) => (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      i < stagesDone
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-200 bg-white text-slate-300"
                    }`}
                  >
                    {i < stagesDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`mt-2 max-w-[72px] text-center text-xs leading-tight ${
                      i === stagesDone - 1
                        ? "font-semibold text-blue-700"
                        : i < stagesDone
                        ? "text-slate-600"
                        : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className={`mb-5 h-0.5 flex-1 ${
                      i < stagesDone - 1 ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manager Note */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Yönetici Notu</h2>
          {!noteEditing && (
            <button
              onClick={() => setNoteEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {wo.manager_note ? "Düzenle" : "Not ekle"}
            </button>
          )}
        </div>
        {noteEditing ? (
          <div className="space-y-3">
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Yönetici notu…"
              className={inputCls + " resize-none"}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setNoteEditing(false); setNoteText(wo.manager_note); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveNote}
                disabled={noteSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {noteSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-sm ${wo.manager_note ? "text-slate-700" : "italic text-slate-400"}`}>
            {wo.manager_note || "Henüz not eklenmemiş."}
          </p>
        )}
      </section>

      {/* Reports */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Raporlar ({wo.reports.length})
        </h2>
        {wo.reports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <p className="text-sm text-slate-400">Henüz rapor eklenmemiş.</p>
            <p className="mt-1 text-xs text-slate-300">Çalışan raporları burada görünür.</p>
          </div>
        ) : (
          wo.reports.map((rpt) => (
            <div key={rpt.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{rpt.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[rpt.severity]}`}>
                      {SEVERITY_LABEL[rpt.severity]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {rpt.created_by_name} · {formatDateTime(rpt.created_at)}
                  </p>
                </div>
              </div>
              {rpt.description && <p className="text-sm text-slate-600">{rpt.description}</p>}

              {rpt.images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">Görseller</p>
                  {rpt.images.map((img) => {
                    const key = `${rpt.id}-${img.id}`;
                    const isTransferring = transferringKey === key;
                    return (
                      <div
                        key={img.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-200">
                          <ImageIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs text-slate-700">{img.name}</p>
                        {img.transferred_to_store ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Aktarıldı
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTransfer(rpt.id, img.id)}
                            disabled={isTransferring}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isTransferring && <Loader2 className="h-3 w-3 animate-spin" />}
                            Mağaza Kartına Aktar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">İş Emrini Düzenle</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">Öncelik</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["normal", "important", "critical"] as WorkOrderPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, priority: p }))}
                      className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                        editForm.priority === p
                          ? p === "normal"
                            ? "border-slate-400 bg-slate-100 text-slate-700"
                            : p === "important"
                            ? "border-amber-400 bg-amber-50 text-amber-700"
                            : "border-red-400 bg-red-50 text-red-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Atanan Çalışan</label>
                <select
                  value={editForm.assigned_to}
                  onChange={(e) => setEditForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Seçiniz —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Son Tarih</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Yönetici Notu</label>
                <textarea
                  rows={3}
                  value={editForm.manager_note}
                  onChange={(e) => setEditForm((f) => ({ ...f, manager_note: e.target.value }))}
                  placeholder="Yönetici notu…"
                  className={inputCls + " resize-none"}
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">İş Emrini İptal Et</h2>
                <p className="mt-1 text-sm text-slate-500">
                  İş emri iptal edilecek. Bu işlem geri alınamaz.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

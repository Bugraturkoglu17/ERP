"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Search, X, ChevronRight, CalendarDays, User,
  Building2, Loader2, AlertTriangle, Paperclip,
} from "lucide-react";
import {
  getManagerWorkOrders,
  createWorkOrder,
  MOCK_STORES,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type WorkOrder,
  type WorkOrderCategory,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/services/managerWorkOrders";
import { getUsers } from "@/services/adminUsers";

const CATEGORY_STYLE: Record<WorkOrderCategory, string> = {
  ariza: "bg-red-100 text-red-700",
  tadilat: "bg-amber-100 text-amber-700",
  yeni_yapim: "bg-blue-100 text-blue-700",
};

const PRIORITY_STYLE: Record<WorkOrderPriority, { badge: string; dot: string }> = {
  normal:    { badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  important: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  critical:  { badge: "bg-red-100 text-red-700",    dot: "bg-red-500"   },
};

const STATUS_STYLE: Record<WorkOrderStatus, string> = {
  planned:    "bg-blue-100 text-blue-700",
  in_progress:"bg-orange-100 text-orange-700",
  completed:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-slate-100 text-slate-500",
};

const TABS: { key: WorkOrderStatus; label: string }[] = [
  { key: "planned",    label: "Planlanacak" },
  { key: "in_progress",label: "Devam Edenler" },
  { key: "completed",  label: "Tamamlananlar" },
  { key: "cancelled",  label: "İptal Edilenler" },
];

const selCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none";

interface CreateForm {
  category: WorkOrderCategory | "";
  store_id: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  assigned_to: string;
  due_date: string;
}

function isOverdue(due: string | null, status: WorkOrderStatus): boolean {
  if (!due || status === "completed" || status === "cancelled") return false;
  return new Date(due) < new Date();
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export default function ManagerIsEmirleriPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState<WorkOrderStatus>("planned");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<WorkOrderCategory | "">("");
  const [filterPriority, setFilterPriority] = useState<WorkOrderPriority | "">("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    category: "", store_id: "", title: "", description: "",
    priority: "normal", assigned_to: "", due_date: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const users = useMemo(
    () => getUsers().filter((u) => u.role === "USER" && u.status === "active"),
    []
  );

  useEffect(() => { setOrders(getManagerWorkOrders()); }, []);

  const tabCounts = useMemo(() => {
    const c: Record<WorkOrderStatus, number> = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => { c[o.status]++; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (o.status !== activeTab) return false;
      if (q && !`${o.title} ${o.store_name} ${o.assigned_to_name}`.toLowerCase().includes(q)) return false;
      if (filterCategory && o.category !== filterCategory) return false;
      if (filterPriority && o.priority !== filterPriority) return false;
      if (filterAssignee && o.assigned_to !== filterAssignee) return false;
      return true;
    });
  }, [orders, activeTab, search, filterCategory, filterPriority, filterAssignee]);

  function resetForm() {
    setForm({ category: "", store_id: "", title: "", description: "", priority: "normal", assigned_to: "", due_date: "" });
    setFormErrors({});
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.category) e.category = "Kategori seçiniz.";
    if (form.category !== "yeni_yapim" && !form.store_id) e.store_id = "Mağaza seçiniz.";
    if (!form.title.trim()) e.title = "Başlık zorunludur.";
    if (!form.assigned_to) e.assigned_to = "Atanan çalışan seçiniz.";
    return e;
  }

  function handleCreate() {
    const e = validate();
    if (Object.keys(e).length > 0) { setFormErrors(e); return; }
    setSaving(true);
    const store = MOCK_STORES.find((s) => s.id === form.store_id);
    const user = users.find((u) => u.id === form.assigned_to);
    createWorkOrder({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category as WorkOrderCategory,
      priority: form.priority,
      store_id: store?.id ?? "",
      store_name: store?.name ?? "—",
      store_code: store?.code ?? "—",
      assigned_to: user?.id ?? "",
      assigned_to_name: user ? `${user.first_name} ${user.last_name}` : "—",
      due_date: form.due_date || null,
    });
    setOrders(getManagerWorkOrders());
    setActiveTab("planned");
    setSaving(false);
    setShowCreate(false);
    resetForm();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">İş Emirleri</h1>
          <p className="mt-1 text-sm text-slate-500">Toplam {orders.length} iş emri</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); resetForm(); }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni İş Emri
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
              activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
            }`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Başlık, mağaza veya çalışan ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as WorkOrderCategory | "")} className={selCls}>
          <option value="">Tüm Kategoriler</option>
          <option value="ariza">Arıza</option>
          <option value="tadilat">Tadilat</option>
          <option value="yeni_yapim">Yeni Yapım</option>
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as WorkOrderPriority | "")} className={selCls}>
          <option value="">Tüm Öncelikler</option>
          <option value="normal">Normal</option>
          <option value="important">Önemli</option>
          <option value="critical">Kritik</option>
        </select>
        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className={selCls}>
          <option value="">Tüm Çalışanlar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-20 text-center">
          <p className="text-sm text-slate-400">
            {search || filterCategory || filterPriority || filterAssignee
              ? "Filtreyle eşleşen iş emri bulunamadı."
              : "Bu sekmede iş emri yok."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wo) => {
            const overdue = isOverdue(wo.due_date, wo.status);
            return (
              <div
                key={wo.id}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_STYLE[wo.priority].dot}`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{wo.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[wo.category]}`}>
                      {CATEGORY_LABEL[wo.category]}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[wo.priority].badge}`}>
                      {PRIORITY_LABEL[wo.priority]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {wo.store_name}
                      <span className="text-slate-400">({wo.store_code})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {wo.assigned_to_name}
                    </span>
                    {wo.due_date && (
                      <span className={`flex items-center gap-1 ${overdue ? "font-medium text-red-600" : ""}`}>
                        <CalendarDays className="h-3 w-3" />
                        {overdue && "Gecikti · "}
                        {formatDate(wo.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/manager/is-emirleri/${wo.id}`}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  Detay
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Yeni İş Emri Oluştur</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Category */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ariza", "tadilat", "yeni_yapim"] as WorkOrderCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat, store_id: "" }))}
                      className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        form.category === cat
                          ? cat === "ariza"
                            ? "border-red-400 bg-red-50 text-red-700"
                            : cat === "tadilat"
                            ? "border-amber-400 bg-amber-50 text-amber-700"
                            : "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {CATEGORY_LABEL[cat]}
                    </button>
                  ))}
                </div>
                {formErrors.category && <p className="mt-1 text-xs text-red-500">{formErrors.category}</p>}
              </div>

              {/* Store */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Mağaza{form.category !== "yeni_yapim" && <span className="text-red-500"> *</span>}
                  {form.category === "yeni_yapim" && (
                    <span className="ml-1 text-slate-400">(opsiyonel — yeni şube ise boş bırakın)</span>
                  )}
                </label>
                <select
                  value={form.store_id}
                  onChange={(e) => setForm((f) => ({ ...f, store_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Seçiniz —</option>
                  {MOCK_STORES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                {formErrors.store_id && <p className="mt-1 text-xs text-red-500">{formErrors.store_id}</p>}
                {form.category === "yeni_yapim" && !form.store_id && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <p className="text-xs text-blue-700">
                      Yeni şube ise{" "}
                      <Link href="/manager/magaza-karti/new" className="font-semibold underline hover:text-blue-900">
                        önce mağaza kartı oluşturun
                      </Link>
                      {" "}ve ardından buradan seçin.
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Başlık <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="İş emri başlığı"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                />
                {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Açıklama</label>
                <textarea
                  placeholder="İş emri detayları…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={inputCls + " resize-none"}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">Öncelik</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["normal", "important", "critical"] as WorkOrderPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        form.priority === p
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

              {/* Assignee */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Atanan Çalışan <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Seçiniz —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
                {formErrors.assigned_to && <p className="mt-1 text-xs text-red-500">{formErrors.assigned_to}</p>}
              </div>

              {/* Due Date */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Son Tarih</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* File upload (mock placeholder) */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Dosya Ekle</label>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span>Dosya yükleme sonraki aşamada aktif edilecek.</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, X, Loader2, UserX, UserCheck, Trash2,
  Edit3, AlertTriangle, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import {
  getManagerUsers, createUser, updateUser,
  disableUser, enableUser, deleteUser,
  generateTempPassword, managerCanActOn,
  type AdminUser, type UserStatus,
} from "@/services/adminUsers";
import { RoleGuard } from "@/components/auth/role-guard";

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Aktif",
  passive: "Pasif",
  locked: "Kilitli",
  pending_first_login: "İlk giriş bekliyor",
};
const STATUS_CLS: Record<UserStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  passive: "bg-slate-100 text-slate-500",
  locked: "bg-red-100 text-red-600",
  pending_first_login: "bg-amber-100 text-amber-700",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; user: AdminUser }
  | { type: "confirm"; action: "disable" | "enable" | "delete"; user: AdminUser };

interface CreateForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  temp_password: string;
}

interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function ManagerKullanicilarPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [createForm, setCreateForm] = useState<CreateForm>({
    first_name: "", last_name: "", email: "", phone: "", temp_password: "",
  });
  const [createErrors, setCreateErrors] = useState<Partial<CreateForm>>({});

  const [editForm, setEditForm] = useState<EditForm>({
    first_name: "", last_name: "", email: "", phone: "",
  });

  function reload() { setUsers(getManagerUsers()); }
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.first_name} ${u.last_name} ${u.email} ${u.phone}`.toLowerCase().includes(q)
    );
  }, [users, search]);

  function resetCreate() {
    setCreateForm({ first_name: "", last_name: "", email: "", phone: "", temp_password: "" });
    setCreateErrors({});
    setShowPwd(false);
  }

  function validateCreate(): Partial<CreateForm> {
    const e: Partial<CreateForm> = {};
    if (!createForm.first_name.trim()) e.first_name = "Zorunlu";
    if (!createForm.last_name.trim()) e.last_name = "Zorunlu";
    if (!createForm.phone.trim()) e.phone = "Zorunlu";
    if (!createForm.temp_password || createForm.temp_password.length < 8) e.temp_password = "En az 8 karakter";
    return e;
  }

  function handleCreate() {
    const errs = validateCreate();
    if (Object.keys(errs).length > 0) { setCreateErrors(errs); return; }
    setSaving(true);
    createUser({
      first_name: createForm.first_name.trim(),
      last_name: createForm.last_name.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim(),
      role: "USER",
      is_active: true,
      temp_password: createForm.temp_password,
    });
    reload();
    setSaving(false);
    setModal({ type: "none" });
    resetCreate();
  }

  function openEdit(u: AdminUser) {
    setEditForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone,
    });
    setModal({ type: "edit", user: u });
  }

  function handleSaveEdit() {
    if (modal.type !== "edit") return;
    if (!managerCanActOn(modal.user)) return;
    setSaving(true);
    updateUser(modal.user.id, editForm);
    reload();
    setSaving(false);
    setModal({ type: "none" });
  }

  function handleConfirm() {
    if (modal.type !== "confirm") return;
    const { action, user: u } = modal;
    if (!managerCanActOn(u)) return;
    if (action === "disable") disableUser(u.id);
    else if (action === "enable") enableUser(u.id);
    else if (action === "delete") deleteUser(u.id);
    reload();
    setModal({ type: "none" });
  }

  const confirmCfg = {
    disable: { title: "Kullanıcıyı Pasif Yap", body: "Bu kullanıcı sisteme giriş yapamayacak.", label: "Pasif Yap", cls: "bg-amber-500 hover:bg-amber-600" },
    enable:  { title: "Kullanıcıyı Aktif Yap",  body: "Bu kullanıcı tekrar sisteme giriş yapabilecek.", label: "Aktif Yap", cls: "bg-emerald-600 hover:bg-emerald-700" },
    delete:  { title: "Kullanıcıyı Sil",         body: "Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.", label: "Sil", cls: "bg-red-600 hover:bg-red-700" },
  };

  return (
    <RoleGuard allowedRoles={["MANAGER"]} spinnerBg="bg-slate-50">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kullanıcılar</h1>
            <p className="mt-1 text-sm text-slate-500">
              {users.length} çalışan kullanıcı
            </p>
          </div>
          <button
            onClick={() => { resetCreate(); setModal({ type: "create" }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Yeni Kullanıcı
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ad, e-posta veya telefon ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
        </div>

        {/* List */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">
              {search ? "Aramayla eşleşen kullanıcı bulunamadı." : "Henüz kullanıcı yok."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Ad Soyad", "E-posta / Telefon", "Durum", "Son Giriş", "İşlem"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <p className="font-medium text-slate-800">
                            {u.first_name} {u.last_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700 text-xs">{u.email || "—"}</p>
                        <p className="text-slate-400 text-xs">{u.phone || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[u.status]}`}>
                          {STATUS_LABEL[u.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(u.last_login_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {u.status === "active" || u.status === "pending_first_login" ? (
                            <button
                              onClick={() => setModal({ type: "confirm", action: "disable", user: u })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-100 hover:text-amber-600 transition-colors"
                              title="Pasif Yap"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setModal({ type: "confirm", action: "enable", user: u })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                              title="Aktif Yap"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setModal({ type: "confirm", action: "delete", user: u })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {modal.type === "create" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Yeni Kullanıcı</h2>
                <button onClick={() => setModal({ type: "none" })} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Kullanıcı otomatik olarak <strong>Kullanıcı</strong> rolüyle oluşturulur.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["first_name", "last_name"] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {k === "first_name" ? "Ad" : "Soyad"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm[k]}
                        onChange={(e) => setCreateForm((f) => ({ ...f, [k]: e.target.value }))}
                        className={inputCls}
                      />
                      {createErrors[k] && <p className="mt-0.5 text-xs text-red-500">{createErrors[k]}</p>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">E-posta</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="ahmet@firma.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Telefon <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="0555 123 45 67"
                      className={inputCls}
                    />
                    {createErrors.phone && <p className="mt-0.5 text-xs text-red-500">{createErrors.phone}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Geçici Şifre <span className="text-red-500">*</span>
                    <span className="ml-1 font-normal text-slate-400">(min. 8 karakter)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={createForm.temp_password}
                        onChange={(e) => setCreateForm((f) => ({ ...f, temp_password: e.target.value }))}
                        placeholder="••••••••"
                        className={inputCls + " pr-9"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, temp_password: generateTempPassword() }))}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Oluştur
                    </button>
                  </div>
                  {createErrors.temp_password && <p className="mt-0.5 text-xs text-red-500">{createErrors.temp_password}</p>}
                </div>
              </div>
              <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  onClick={() => { setModal({ type: "none" }); resetCreate(); }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {modal.type === "edit" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Kullanıcı Düzenle</h2>
                <button onClick={() => setModal({ type: "none" })} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(["first_name", "last_name"] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {k === "first_name" ? "Ad" : "Soyad"}
                      </label>
                      <input
                        type="text"
                        value={editForm[k]}
                        onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">E-posta</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  onClick={() => setModal({ type: "none" })}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        {modal.type === "confirm" && (() => {
          const cfg = confirmCfg[modal.action];
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-3 mb-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{cfg.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{cfg.body}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {modal.user.first_name} {modal.user.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal({ type: "none" })}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${cfg.cls}`}
                  >
                    {cfg.label}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </RoleGuard>
  );
}

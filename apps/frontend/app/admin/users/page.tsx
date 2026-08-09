"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Search, Lock, Unlock, KeyRound, Eye,
  Edit3, X, Loader2, AlertTriangle, Check, Copy,
  UserCheck, UserX, ChevronDown, Shield, Users, Activity, Trash2,
} from "lucide-react";
import {
  getUsers, disableUser, enableUser, lockUser, unlockUser,
  updateUser, resetUserPassword, generateTempPassword, deleteUser,
  type AdminUser, type UserRole, type UserStatus,
} from "@/services/adminUsers";
import { useAuth } from "@/contexts/auth-context";

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: "Admin", MANAGER: "Yönetici", USER: "Kullanıcı" };
const ROLE_CLS: Record<UserRole, string> = {
  ADMIN: "bg-indigo-900/60 text-indigo-300 border-indigo-700",
  MANAGER: "bg-blue-900/60 text-blue-300 border-blue-700",
  USER: "bg-slate-800 text-slate-300 border-slate-700",
};
const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Aktif",
  passive: "Pasif",
  locked: "Kilitli",
  pending_first_login: "İlk giriş bekliyor",
};
const STATUS_CLS: Record<UserStatus, string> = {
  active: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  passive: "bg-slate-800 text-slate-400 border-slate-700",
  locked: "bg-red-900/50 text-red-300 border-red-700",
  pending_first_login: "bg-amber-900/50 text-amber-300 border-amber-700",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

type ConfirmKind = "disable" | "enable" | "lock" | "unlock" | "delete";
type ModalState =
  | { type: "none" }
  | { type: "edit"; user: AdminUser }
  | { type: "confirm"; kind: ConfirmKind; user: AdminUser }
  | { type: "reset_password"; user: AdminUser; result?: string }
  | { type: "error"; title: string; body: string };

function initEditForm(u: AdminUser) {
  return {
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    phone: u.phone,
    role: u.role as UserRole,
  };
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const currentUserId = me?.id ?? "";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    role: "USER" as UserRole,
  });
  const [resetMode, setResetMode] = useState<"system" | "manual">("system");
  const [manualPwd, setManualPwd] = useState("");
  const [copied, setCopied] = useState(false);

  function reload() { setUsers(getUsers()); }
  useEffect(() => { reload(); }, []);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    managers: users.filter((u) => u.role === "MANAGER").length,
    workers: users.filter((u) => u.role === "USER").length,
    locked: users.filter((u) => u.status === "locked" || u.status === "passive").length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openEdit = (u: AdminUser) => {
    setEditForm(initEditForm(u));
    setModal({ type: "edit", user: u });
  };

  const handleSaveEdit = async () => {
    if (modal.type !== "edit") return;
    const u = modal.user;
    if (editForm.role !== u.role && u.id === currentUserId) {
      if (!confirm("Kendi rolünüzü değiştirmek istediğinizden emin misiniz?")) return;
    }
    setSaving(true);
    updateUser(u.id, {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
    });
    reload();
    setSaving(false);
    setModal({ type: "none" });
  };

  const handleConfirm = () => {
    if (modal.type !== "confirm") return;
    const { kind, user: u } = modal;
    if (kind === "disable") disableUser(u.id);
    else if (kind === "enable") enableUser(u.id);
    else if (kind === "lock") lockUser(u.id);
    else if (kind === "unlock") unlockUser(u.id);
    else if (kind === "delete") deleteUser(u.id);
    reload();
    setModal({ type: "none" });
  };

  const openDelete = (u: AdminUser) => {
    if (u.role === "ADMIN") {
      const adminCount = users.filter((x) => x.role === "ADMIN").length;
      if (adminCount <= 1) {
        setModal({
          type: "error",
          title: "Silme İşlemi Engellendi",
          body: "Sistemde en az bir admin hesabı kalmalıdır. Başka bir admin oluşturmadan bu hesabı silemezsiniz.",
        });
        return;
      }
    }
    setModal({ type: "confirm", kind: "delete", user: u });
  };

  const handleResetPassword = () => {
    if (modal.type !== "reset_password") return;
    if (resetMode === "manual" && manualPwd.length < 8) return;
    const result = resetUserPassword(modal.user.id, {
      mode: resetMode,
      new_password: resetMode === "manual" ? manualPwd : undefined,
    });
    if (result) {
      setModal({ type: "reset_password", user: modal.user, result: result.generatedPassword });
      reload();
    }
  };

  const copyPwd = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmTexts: Record<ConfirmKind, { title: string; body: string; actionLabel: string; actionCls: string }> = {
    disable: {
      title: "Kullanıcıyı Pasif Yap",
      body: "Bu kullanıcı sisteme giriş yapamayacak. Devam etmek istiyor musunuz?",
      actionLabel: "Pasif Yap",
      actionCls: "bg-amber-600 hover:bg-amber-500",
    },
    enable: {
      title: "Kullanıcıyı Aktif Yap",
      body: "Bu kullanıcı tekrar sisteme giriş yapabilecek. Devam etmek istiyor musunuz?",
      actionLabel: "Aktif Yap",
      actionCls: "bg-emerald-600 hover:bg-emerald-500",
    },
    lock: {
      title: "Hesabı Kilitle",
      body: "Hesap kilitlenecek ve kullanıcı sisteme giremeyecek. Devam etmek istiyor musunuz?",
      actionLabel: "Kilitle",
      actionCls: "bg-red-600 hover:bg-red-500",
    },
    unlock: {
      title: "Kilidi Aç",
      body: "Hesabın kilidi açılacak ve kullanıcı tekrar giriş yapabilecek. Devam etmek istiyor musunuz?",
      actionLabel: "Kilidi Aç",
      actionCls: "bg-emerald-600 hover:bg-emerald-500",
    },
    delete: {
      title: "Kullanıcıyı Sil",
      body: "Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      actionLabel: "Sil",
      actionCls: "bg-red-600 hover:bg-red-500",
    },
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Kullanıcı Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kullanıcıları oluşturun, rollerini belirleyin ve hesap durumlarını yönetin.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Kullanıcı
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Toplam", value: stats.total, icon: Users, cls: "text-slate-300" },
          { label: "Admin", value: stats.admins, icon: Shield, cls: "text-indigo-400" },
          { label: "Yönetici", value: stats.managers, icon: Activity, cls: "text-blue-400" },
          { label: "Kullanıcı", value: stats.workers, icon: UserCheck, cls: "text-slate-400" },
          { label: "Pasif/Kilitli", value: stats.locked, icon: Lock, cls: "text-red-400" },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-3.5 w-3.5 ${cls}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
            <span className={`text-2xl font-bold ${cls}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Ad, e-posta veya telefon ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tüm Roller</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Yönetici</option>
              <option value="USER">Kullanıcı</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
              <option value="locked">Kilitli</option>
              <option value="pending_first_login">İlk giriş bekliyor</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {["Ad Soyad", "E-posta / Telefon", "Rol", "Durum", "Son Giriş", "İşlem"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">
                            {u.first_name} {u.last_name}
                            {isSelf && (
                              <span className="ml-1.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                                Ben
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-xs">{u.email || "—"}</p>
                      <p className="text-slate-500 text-xs">{u.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge cls={ROLE_CLS[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge cls={STATUS_CLS[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(u.last_login_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                          title="Detay"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => openEdit(u)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                          title="Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {!isSelf && (
                          <>
                            {u.status === "active" || u.status === "pending_first_login" ? (
                              <button
                                onClick={() => setModal({ type: "confirm", kind: "disable", user: u })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-900/40 hover:text-amber-300 transition-colors"
                                title="Pasif Yap"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                            ) : u.status === "passive" ? (
                              <button
                                onClick={() => setModal({ type: "confirm", kind: "enable", user: u })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-900/40 hover:text-emerald-300 transition-colors"
                                title="Aktif Yap"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                            {u.status !== "locked" ? (
                              <button
                                onClick={() => setModal({ type: "confirm", kind: "lock", user: u })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                                title="Hesabı Kilitle"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setModal({ type: "confirm", kind: "unlock", user: u })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-900/40 hover:text-emerald-300 transition-colors"
                                title="Kilidi Aç"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => {
                            setResetMode("system");
                            setManualPwd("");
                            setModal({ type: "reset_password", user: u });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                          title="Şifre Sıfırla"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => openDelete(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
            {filtered.length} / {users.length} kullanıcı gösteriliyor
          </div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {modal.type === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Kullanıcı Düzenle</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modal.user.first_name} {modal.user.last_name}
                </p>
              </div>
              <button onClick={() => setModal({ type: "none" })} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {modal.user.id === currentUserId && editForm.role !== modal.user.role && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <p className="text-xs text-amber-300">Kendi rolünüzü değiştirmek panel erişiminizi etkileyecektir.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(["first_name", "last_name"] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {k === "first_name" ? "Ad *" : "Soyad *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm[k]}
                      onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Rol *</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Yönetici</option>
                  <option value="USER">Kullanıcı</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-800 px-5 py-4">
              <button
                onClick={() => setModal({ type: "none" })}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {modal.type === "confirm" && (() => {
        const cfg = confirmTexts[modal.kind];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-900/40">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">{cfg.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{cfg.body}</p>
                    <p className="text-xs font-medium text-slate-300 mt-2">
                      {modal.user.first_name} {modal.user.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal({ type: "none" })}
                    className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${cfg.actionCls}`}
                  >
                    {cfg.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ERROR MODAL ── */}
      {modal.type === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-900/40">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">{modal.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{modal.body}</p>
                </div>
              </div>
              <button
                onClick={() => setModal({ type: "none" })}
                className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {modal.type === "reset_password" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Şifre Sıfırla</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modal.user.first_name} {modal.user.last_name}
                </p>
              </div>
              <button onClick={() => setModal({ type: "none" })} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {modal.result ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2.5">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-xs text-emerald-300">
                      Geçici şifre oluşturuldu. Kullanıcı ilk girişte şifresini değiştirmelidir.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Geçici Şifre</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-mono text-slate-200">
                        {modal.result}
                      </code>
                      <button
                        onClick={() => copyPwd(modal.result!)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                        title="Kopyala"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Şifre güvenli şekilde hashlenerek kaydedilecektir.
                    </p>
                  </div>
                  <button
                    onClick={() => setModal({ type: "none" })}
                    className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400">Şifre Oluşturma Yöntemi</label>
                    {(["system", "manual"] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="resetMode"
                          value={m}
                          checked={resetMode === m}
                          onChange={() => setResetMode(m)}
                          className="text-indigo-500"
                        />
                        <span className="text-sm text-slate-300">
                          {m === "system" ? "Sistem otomatik geçici şifre oluştursun" : "Ben geçici şifre belirleyeyim"}
                        </span>
                      </label>
                    ))}
                  </div>
                  {resetMode === "manual" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Geçici Şifre (min. 8 karakter)
                      </label>
                      <input
                        type="text"
                        value={manualPwd}
                        onChange={(e) => setManualPwd(e.target.value)}
                        placeholder="Geçici şifre girin..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Şifre güvenli şekilde hashlenerek kaydedilecektir. Kullanıcı ilk girişte şifresini değiştirmelidir.
                  </p>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setModal({ type: "none" })}
                      className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetMode === "manual" && manualPwd.length < 8}
                      className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                    >
                      Sıfırla
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

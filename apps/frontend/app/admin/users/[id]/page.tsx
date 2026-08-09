"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit3, Lock, Unlock, UserX, UserCheck,
  KeyRound, X, Loader2, AlertTriangle, Check, Copy,
  Eye, EyeOff, RefreshCw, Shield, Clock, User,
} from "lucide-react";
import {
  getUserById, updateUser, disableUser, enableUser,
  lockUser, unlockUser, resetUserPassword, generateTempPassword,
  type AdminUser, type UserRole, type UserStatus,
} from "@/services/adminUsers";
import { useAuth } from "@/contexts/auth-context";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

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

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const MOCK_AUDIT = [
  { label: "Kullanıcı oluşturuldu", detail: "Sistem tarafından oluşturuldu", date: "2026-01-01T00:00:00Z" },
  { label: "İlk giriş yapıldı", detail: "Şifre değiştirme zorunluluğu kaldırıldı", date: "2026-01-02T09:00:00Z" },
];

type ModalState =
  | { type: "none" }
  | { type: "edit" }
  | { type: "confirm_disable" }
  | { type: "confirm_enable" }
  | { type: "confirm_lock" }
  | { type: "confirm_unlock" }
  | { type: "reset_password"; result?: string };

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuth();
  const currentUserId = me?.id ?? "";

  const [user, setUser] = useState<AdminUser | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [saving, setSaving] = useState(false);
  const [resetMode, setResetMode] = useState<"system" | "manual">("system");
  const [manualPwd, setManualPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    role: "USER" as UserRole,
  });

  function reload() {
    const u = getUserById(id);
    setUser(u);
    if (u) {
      setEditForm({
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
      });
    }
  }

  useEffect(() => { reload(); }, [id]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  const isSelf = user.id === currentUserId;

  const handleSaveEdit = () => {
    setSaving(true);
    updateUser(user.id, {
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

  const handleConfirm = (kind: "disable" | "enable" | "lock" | "unlock") => {
    if (kind === "disable") disableUser(user.id);
    else if (kind === "enable") enableUser(user.id);
    else if (kind === "lock") lockUser(user.id);
    else if (kind === "unlock") unlockUser(user.id);
    reload();
    setModal({ type: "none" });
  };

  const handleResetPassword = () => {
    if (resetMode === "manual" && manualPwd.length < 8) return;
    const result = resetUserPassword(user.id, {
      mode: resetMode,
      new_password: resetMode === "manual" ? manualPwd : undefined,
    });
    if (result) {
      reload();
      setModal({ type: "reset_password", result: result.generatedPassword });
    }
  };

  const copyPwd = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-100">
            {user.first_name} {user.last_name}
            {isSelf && (
              <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                Ben
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge cls={ROLE_CLS[user.role]}>{ROLE_LABEL[user.role]}</Badge>
          <Badge cls={STATUS_CLS[user.status]}>{STATUS_LABEL[user.status]}</Badge>
        </div>
      </div>

      {isSelf && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="text-sm text-amber-300">Kendi admin hesabınız üzerinde bazı işlemler kısıtlanmıştır.</p>
        </div>
      )}

      {/* 1. Kimlik Bilgileri */}
      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-300">Kimlik Bilgileri</h2>
          </div>
          <button
            onClick={() => setModal({ type: "edit" })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Düzenle
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
          {[
            ["Ad", user.first_name],
            ["Soyad", user.last_name],
            ["E-posta", user.email || "—"],
            ["Telefon", user.phone || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-sm text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Rol ve Yetki */}
      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
          <Shield className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-300">Rol ve Yetki</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="mb-2">
            <p className="text-xs text-slate-500 mb-0.5">Rol</p>
            <p className="text-sm text-slate-200">{ROLE_LABEL[user.role]}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">İzinler (özet)</p>
            <div className="flex flex-wrap gap-1.5">
              {(ROLE_PERMISSIONS[user.role] as string[]).slice(0, 6).map((p) => (
                <span key={p} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                  {p}
                </span>
              ))}
              {ROLE_PERMISSIONS[user.role].length > 6 && (
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
                  +{ROLE_PERMISSIONS[user.role].length - 6} daha
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Hesap Durumu */}
      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
          <Clock className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-300">Hesap Durumu</h2>
        </div>
        <div className="p-5 space-y-3">
          {[
            ["Hesap durumu", <Badge key="s" cls={STATUS_CLS[user.status]}>{STATUS_LABEL[user.status]}</Badge>],
            ["Kilidi", user.status === "locked" ? <Badge key="l" cls={STATUS_CLS.locked}>Kilitli</Badge> : <span key="nl" className="text-sm text-slate-300">Kilitsiz</span>],
            ["İlk girişte şifre değiştirilecek mi", user.must_change_password ? "Evet" : "Hayır"],
            ["Son giriş tarihi", formatDate(user.last_login_at)],
            ["Son şifre değiştirme", formatDate(user.password_changed_at)],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0 last:pb-0">
              <p className="text-sm text-slate-400">{label}</p>
              <div className="text-sm text-slate-300">{value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {!isSelf && (
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {user.status === "active" || user.status === "pending_first_login" ? (
              <button
                onClick={() => setModal({ type: "confirm_disable" })}
                className="flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-900/40 transition-colors"
              >
                <UserX className="h-3.5 w-3.5" />
                Pasif Yap
              </button>
            ) : user.status === "passive" ? (
              <button
                onClick={() => setModal({ type: "confirm_enable" })}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Aktif Yap
              </button>
            ) : null}
            {user.status !== "locked" ? (
              <button
                onClick={() => setModal({ type: "confirm_lock" })}
                className="flex items-center gap-1.5 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-900/40 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                Hesabı Kilitle
              </button>
            ) : (
              <button
                onClick={() => setModal({ type: "confirm_unlock" })}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              >
                <Unlock className="h-3.5 w-3.5" />
                Kilidi Aç
              </button>
            )}
            <button
              onClick={() => { setResetMode("system"); setManualPwd(""); setModal({ type: "reset_password" }); }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Şifre Sıfırla
            </button>
          </div>
        )}
      </section>

      {/* 4. İşlem Geçmişi */}
      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">İşlem Geçmişi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerçek audit log sistemi sonraki aşamada bağlanacak.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {MOCK_AUDIT.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-600" />
              <div>
                <p className="text-slate-300">{ev.label}</p>
                <p className="text-xs text-slate-500">{ev.detail} · {formatDate(ev.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EDIT MODAL ── */}
      {modal.type === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0">
              <h2 className="text-sm font-semibold text-slate-100">Kullanıcı Düzenle</h2>
              <button onClick={() => setModal({ type: "none" })} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {(["first_name", "last_name"] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{k === "first_name" ? "Ad *" : "Soyad *"}</label>
                    <input type="text" required value={editForm[k]}
                      onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">E-posta</label>
                  <input type="email" value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Telefon</label>
                  <input type="tel" value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Rol *</label>
                {isSelf && editForm.role !== user.role && (
                  <p className="mb-1 text-xs text-amber-400">Kendi rolünüzü değiştirmek panel erişiminizi etkileyecektir.</p>
                )}
                <select value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className={inputCls}>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Yönetici</option>
                  <option value="USER">Kullanıcı</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-800 px-5 py-4 shrink-0">
              <button onClick={() => setModal({ type: "none" })}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                İptal
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODALS ── */}
      {(modal.type === "confirm_disable" || modal.type === "confirm_enable" || modal.type === "confirm_lock" || modal.type === "confirm_unlock") && (() => {
        type Kind = "disable" | "enable" | "lock" | "unlock";
        const kindMap: Record<typeof modal.type, Kind> = {
          confirm_disable: "disable",
          confirm_enable: "enable",
          confirm_lock: "lock",
          confirm_unlock: "unlock",
        };
        const kind = kindMap[modal.type as keyof typeof kindMap];
        const texts: Record<Kind, { title: string; body: string; actionLabel: string; actionCls: string }> = {
          disable: { title: "Kullanıcıyı Pasif Yap", body: "Bu kullanıcı sisteme giriş yapamayacak. Devam etmek istiyor musunuz?", actionLabel: "Pasif Yap", actionCls: "bg-amber-600 hover:bg-amber-500" },
          enable: { title: "Kullanıcıyı Aktif Yap", body: "Bu kullanıcı tekrar sisteme giriş yapabilecek. Devam etmek istiyor musunuz?", actionLabel: "Aktif Yap", actionCls: "bg-emerald-600 hover:bg-emerald-500" },
          lock: { title: "Hesabı Kilitle", body: "Hesap kilitlenecek ve kullanıcı sisteme giremeyecek. Devam etmek istiyor musunuz?", actionLabel: "Kilitle", actionCls: "bg-red-600 hover:bg-red-500" },
          unlock: { title: "Kilidi Aç", body: "Hesabın kilidi açılacak ve kullanıcı tekrar giriş yapabilecek. Devam etmek istiyor musunuz?", actionLabel: "Kilidi Aç", actionCls: "bg-emerald-600 hover:bg-emerald-500" },
        };
        const cfg = texts[kind];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-900/40">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">{cfg.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{cfg.body}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModal({ type: "none" })}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                  İptal
                </button>
                <button onClick={() => handleConfirm(kind)}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${cfg.actionCls}`}>
                  {cfg.actionLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── RESET PASSWORD MODAL ── */}
      {modal.type === "reset_password" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-100">Şifre Sıfırla</h2>
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
                      <button onClick={() => copyPwd(modal.result!)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Şifre güvenli şekilde hashlenerek kaydedilecektir.
                    </p>
                  </div>
                  <button onClick={() => setModal({ type: "none" })}
                    className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors">
                    Kapat
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400">Şifre Oluşturma Yöntemi</label>
                    {(["system", "manual"] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="radio" name="resetMode2" value={m} checked={resetMode === m}
                          onChange={() => setResetMode(m)} className="text-indigo-500" />
                        <span className="text-sm text-slate-300">
                          {m === "system" ? "Sistem otomatik geçici şifre oluştursun" : "Ben geçici şifre belirleyeyim"}
                        </span>
                      </label>
                    ))}
                  </div>
                  {resetMode === "manual" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Geçici Şifre <span className="text-slate-500">(min. 8 karakter)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input type={showPwd ? "text" : "password"} value={manualPwd}
                            onChange={(e) => setManualPwd(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-9 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                            placeholder="••••••••" />
                          <button type="button" onClick={() => setShowPwd((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <button type="button" onClick={() => setManualPwd(generateTempPassword())}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Şifre güvenli şekilde hashlenerek kaydedilecektir.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setModal({ type: "none" })}
                      className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                      İptal
                    </button>
                    <button onClick={handleResetPassword}
                      disabled={resetMode === "manual" && manualPwd.length < 8}
                      className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors">
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

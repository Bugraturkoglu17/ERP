"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Eye, EyeOff, Loader2, Plus, Search, UserCheck, UserX, X } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type UserRow = {
  id: string; full_name: string; email: string; phone?: string;
  is_active: boolean; default_role?: string;
};
type FormState = { full_name: string; email: string; phone: string; password: string };

const emptyForm: FormState = { full_name: "", email: "", phone: "", password: "" };
const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500";

export default function ManagerUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiGet<UserRow[]>("/auth/users");
      setUsers((Array.isArray(data) ? data : []).filter((user) => !["admin", "manager", "platform_admin"].some((role) => (user.default_role ?? "").includes(role))));
      setError("");
    } catch {
      setError("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return users.filter((user) => `${user.full_name} ${user.email} ${user.phone ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [query, users]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };
  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({ full_name: user.full_name, email: user.email, phone: user.phone ?? "", password: "" });
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return setError("Ad soyad zorunludur.");
    if (!editing && (!form.email.trim() || form.password.length < 8)) return setError("Geçerli e-posta ve en az 8 karakterli geçici şifre girin.");
    setSaving(true); setError("");
    try {
      if (editing) {
        await apiPatch(`/auth/users/${editing.id}`, { full_name: form.full_name.trim(), phone: form.phone.trim() || null });
      } else {
        await apiPost("/auth/users", {
          full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() || null,
          password: form.password, roles: ["saha_muhendisi"], discipline: null, discipline_only: false,
        });
      }
      setModalOpen(false);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Kullanıcı kaydedilemedi.";
      setError(message);
    } finally { setSaving(false); }
  };

  const toggleActive = async (user: UserRow) => {
    try {
      await apiPatch(`/auth/users/${user.id}`, { is_active: !user.is_active });
      await load();
    } catch { setError("Kullanıcı durumu güncellenemedi."); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Ekip yönetimi</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Kullanıcılar</h1><p className="mt-1 text-sm text-slate-500">Saha çalışanlarını ve hesap durumlarını yönetin.</p></div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Yeni Kullanıcı</button>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, e-posta veya telefon ara" className={`${inputClass} pl-9`} /></div>
      {error && !modalOpen && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Kullanıcılar yükleniyor</div>
          : filtered.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">Eşleşen kullanıcı bulunamadı.</p>
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500"><th className="px-4 py-3 font-medium">Ad Soyad</th><th className="px-4 py-3 font-medium">E-posta / Telefon</th><th className="px-4 py-3 font-medium">Durum</th><th className="px-4 py-3 text-right font-medium">İşlem</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{user.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR")}</span><span className="font-medium text-slate-800">{user.full_name}</span></div></td><td className="px-4 py-3"><p className="text-xs text-slate-700">{user.email}</p><p className="text-xs text-slate-400">{user.phone || "Telefon eklenmedi"}</p></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.is_active ? "Aktif" : "Pasif"}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => openEdit(user)} title="Düzenle" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button><button onClick={() => toggleActive(user)} title={user.is_active ? "Pasif yap" : "Aktif yap"} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">{user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}</button></div></td></tr>
          ))}</tbody></table></div>}
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">{editing ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}</h2><p className="mt-0.5 text-xs text-slate-400">Saha kullanıcısı hesabı</p></div><button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><label className="block text-xs font-medium text-slate-600">Ad Soyad<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="block text-xs font-medium text-slate-600">E-posta<input type="email" disabled={Boolean(editing)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${inputClass} mt-1 disabled:bg-slate-50 disabled:text-slate-400`} /></label><label className="block text-xs font-medium text-slate-600">Telefon<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={`${inputClass} mt-1`} /></label>{!editing && <label className="block text-xs font-medium text-slate-600">Geçici Şifre<div className="relative mt-1"><input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={`${inputClass} pr-10`} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>}{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">Vazgeç</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Kaydet</button></div></div></div>}
    </div>
  );
}

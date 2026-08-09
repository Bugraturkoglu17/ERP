"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { createUser, generateTempPassword, type UserRole } from "@/services/adminUsers";

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none";

export default function NewUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "USER" as UserRole,
    is_active: true,
    password_mode: "system" as "system" | "manual",
    temp_password: "",
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function genPassword() {
    setForm((f) => ({ ...f, temp_password: generateTempPassword(), password_mode: "manual" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "Ad zorunludur.";
    if (!form.last_name.trim()) e.last_name = "Soyad zorunludur.";
    if (!form.phone.trim()) e.phone = "Telefon zorunludur.";
    if (!form.role) e.role = "Rol zorunludur.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Geçerli bir e-posta girin.";
    }
    if (form.password_mode === "manual" && form.temp_password.length < 8) {
      e.temp_password = "Şifre en az 8 karakter olmalıdır.";
    }
    return e;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const pwd = form.password_mode === "system" ? generateTempPassword() : form.temp_password;
    createUser({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.replace(/\s+/g, " ").trim(),
      role: form.role,
      is_active: form.is_active,
      temp_password: pwd,
    });
    setSaving(false);
    router.push("/admin/users");
  };


  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Yeni Kullanıcı Oluştur</h1>
          <p className="text-sm text-slate-400">Sisteme yeni bir kullanıcı ekleyin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kimlik Bilgileri */}
        <section className="rounded-xl border border-slate-700/60 bg-slate-900 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">Kimlik Bilgileri</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ad" required>
              <input
                type="text"
                className={inputCls}
                placeholder="Ahmet"
                value={form.first_name}
                onChange={set("first_name")}
              />
              {errors.first_name && <p className="mt-1 text-xs text-red-400">{errors.first_name}</p>}
            </Field>
            <Field label="Soyad" required>
              <input
                type="text"
                className={inputCls}
                placeholder="Yılmaz"
                value={form.last_name}
                onChange={set("last_name")}
              />
              {errors.last_name && <p className="mt-1 text-xs text-red-400">{errors.last_name}</p>}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-posta">
              <input
                type="email"
                className={inputCls}
                placeholder="ahmet@firma.com"
                value={form.email}
                onChange={set("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </Field>
            <Field label="Telefon" required>
              <input
                type="tel"
                className={inputCls}
                placeholder="0555 123 45 67"
                value={form.phone}
                onChange={set("phone")}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
            </Field>
          </div>
        </section>

        {/* Rol ve Organizasyon */}
        <section className="rounded-xl border border-slate-700/60 bg-slate-900 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">Rol ve Organizasyon</h2>
          <Field label="Rol" required>
            <select className={inputCls} value={form.role} onChange={set("role")}>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Yönetici</option>
              <option value="USER">Kullanıcı</option>
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role}</p>}
          </Field>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">Hesap aktif olarak oluşturulsun</span>
          </label>
        </section>

        {/* Geçici Şifre */}
        <section className="rounded-xl border border-slate-700/60 bg-slate-900 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-3">Geçici Şifre</h2>
          <div className="flex items-start gap-2 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-300">
              Şifre güvenli şekilde hashlenerek kaydedilecektir. Kullanıcı ilk girişte şifresini değiştirmek zorundadır.
            </p>
          </div>
          <div className="space-y-2">
            {(["system", "manual"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="password_mode"
                  value={m}
                  checked={form.password_mode === m}
                  onChange={() => setForm((f) => ({ ...f, password_mode: m }))}
                  className="text-indigo-500"
                />
                <span className="text-sm text-slate-300">
                  {m === "system" ? "Sistem otomatik geçici şifre oluştursun" : "Ben geçici şifre belirleyeyim"}
                </span>
              </label>
            ))}
          </div>
          {form.password_mode === "manual" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Geçici Şifre <span className="text-red-400">*</span>{" "}
                <span className="text-slate-500">(min. 8 karakter)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPwd ? "text" : "password"}
                    className={inputCls + " pr-10"}
                    placeholder="••••••••"
                    value={form.temp_password}
                    onChange={set("temp_password")}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={genPassword}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="h-3 w-3" />
                  Oluştur
                </button>
              </div>
              {errors.temp_password && <p className="mt-1 text-xs text-red-400">{errors.temp_password}</p>}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Kullanıcı Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}

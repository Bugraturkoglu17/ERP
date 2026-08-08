"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Yönetici" },
  { value: "saha_muhendisi", label: "Saha Mühendisi" },
  { value: "depo_sorumlusu", label: "Depo Sorumlusu" },
  { value: "musteri_kullanici", label: "Müşteri Kullanıcı" },
];

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    default_role: "saha_muhendisi",
    phone: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/auth/users", form);
      router.push("/admin/users");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Kullanıcı oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Yeni Kullanıcı</h1>
          <p className="text-sm text-slate-400">Sisteme yeni kullanıcı ekle</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl bg-slate-800 border border-slate-700/60 p-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {(
          [
            { key: "full_name", label: "Ad Soyad", type: "text", placeholder: "Ahmet Yılmaz" },
            { key: "email", label: "E-posta", type: "email", placeholder: "ahmet@firma.com" },
            { key: "password", label: "Şifre", type: "password", placeholder: "••••••••" },
            { key: "phone", label: "Telefon (opsiyonel)", type: "tel", placeholder: "+90 5xx xxx xx xx" },
          ] as const
        ).map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
            <input
              type={type}
              required={key !== "phone"}
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Rol</label>
          <select
            value={form.default_role}
            onChange={set("default_role")}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Kullanıcı Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}

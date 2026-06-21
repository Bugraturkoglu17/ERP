"use client";

import { FormEvent, useState } from "react";
import { Building2, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { DEMO_MODE, demoLogin } from "@/lib/demo-auth";
import { buildApiUrl } from "@/lib/api";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";

function redirectByRole() {
  const payload = getTokenPayloadFromStorage();
  if (isPlatformAdmin(payload)) {
    window.location.href = "/platform";
  } else {
    window.location.href = "/";
  }
}

export default function LoginPage() {
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformError, setPlatformError] = useState("");

  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");

  const handlePlatformDemo = async () => {
    setPlatformLoading(true);
    setPlatformError("");
    const result = await demoLogin("platform");
    if (result.ok) {
      window.location.href = "/platform";
    } else {
      setPlatformError(result.error ?? "Giriş yapılamadı.");
      setPlatformLoading(false);
    }
  };

  const handleCompanyLogin = async (e: FormEvent) => {
    e.preventDefault();
    setCompanyLoading(true);
    setCompanyError("");
    try {
      const params = new URLSearchParams();
      params.append("username", companyEmail.trim().toLowerCase());
      params.append("password", companyPassword);
      const res = await axios.post<{ access_token: string }>(
        buildApiUrl("/auth/login"),
        params,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      localStorage.setItem("token", res.data.access_token);
      redirectByRole();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setCompanyError(typeof detail === "string" ? detail : "Geçersiz e-posta veya şifre.");
      setCompanyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white text-xl font-bold mb-4">
          G
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Golabs ERP</h1>
        <p className="mt-1 text-sm text-slate-500">Hangi panele giriş yapmak istiyorsunuz?</p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 md:grid-cols-2">

        {/* Platform Yöneticisi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Platform Yöneticisi</h2>
              <p className="text-xs text-slate-400">Firma ve lisans yönetimi</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            Firma ekleyin, lisans tanımlayın ve yönetici hesapları oluşturun.
          </p>

          {platformError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {platformError}
            </div>
          )}

          {DEMO_MODE ? (
            <button
              onClick={handlePlatformDemo}
              disabled={platformLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {platformLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {platformLoading ? "Giriş yapılıyor…" : "Yönetici Paneline Gir"}
            </button>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 text-center">
              Erişim için sistem yöneticinizle iletişime geçin.
            </div>
          )}
        </div>

        {/* Firma Paneli */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Firma Paneli</h2>
              <p className="text-xs text-slate-400">Proje ve operasyon yönetimi</p>
            </div>
          </div>

          <form onSubmit={handleCompanyLogin} className="space-y-3">
            {companyError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {companyError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">E-posta</label>
              <input
                type="email"
                required
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="yonetici@firma.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Şifre</label>
              <input
                type="password"
                required
                value={companyPassword}
                onChange={(e) => setCompanyPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={companyLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {companyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {companyLoading ? "Giriş yapılıyor…" : "Firma Paneline Gir"}
            </button>
          </form>
        </div>
      </div>

      {DEMO_MODE && (
        <p className="mt-8 text-xs text-slate-400">
          Demo mod aktif — Yönetici paneli tek tıkla açılır. Firma paneli için giriş bilgisi gerekir.
        </p>
      )}
    </div>
  );
}

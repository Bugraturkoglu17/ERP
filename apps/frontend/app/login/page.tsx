"use client";

import { FormEvent, useState } from "react";
import {
  Building2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { buildApiUrl } from "@/lib/api";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { AUTH_STORE_KEY } from "@/contexts/auth-context";

function redirectByRole() {
  const payload = getTokenPayloadFromStorage();
  if (!payload) { window.location.href = "/login"; return; }
  const roles = payload.roles ?? [];
  if (roles.includes("platform_admin")) { window.location.href = "/admin/dashboard"; return; }
  if (roles.includes("manager")) { window.location.href = "/manager/dashboard"; return; }
  if (roles.includes("admin")) { window.location.href = "/manager/dashboard"; return; }
  window.location.href = "/user/dashboard";
}

export default function LoginPage() {
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");

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
      localStorage.removeItem(AUTH_STORE_KEY);
      localStorage.setItem("token", res.data.access_token);
      redirectByRole();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setCompanyError(
        typeof detail === "string" ? detail : "Geçersiz e-posta veya şifre."
      );
      setCompanyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white text-xl font-bold mb-4">
          S
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Sismik Mekanik ERP
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Hesabınızla giriş yapın
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Hesabınızla Giriş Yapın
              </h2>
              <p className="text-xs text-slate-400">Şifreli giriş</p>
            </div>
          </div>

          <form onSubmit={handleCompanyLogin} className="space-y-3">
            {companyError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {companyError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Telefon veya E-posta
              </label>
              <input
                type="text"
                required
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="0555 123 45 67 veya kullanici@firma.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Şifre
              </label>
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
              {companyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {companyLoading ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

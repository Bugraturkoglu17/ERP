"use client";

import { FormEvent, useState } from "react";
import {
  Building2,
  ArrowRight,
  BriefcaseBusiness,
  ShieldCheck,
  Loader2,
  UserRound,
} from "lucide-react";
import axios from "axios";
import { buildApiUrl } from "@/lib/api";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { AUTH_STORE_KEY } from "@/contexts/auth-context";
import {
  DEMO_ACCOUNTS,
  DEMO_MODE,
  demoLogin,
  type LoginTarget,
} from "@/lib/demo-auth";

const QUICK_LOGIN: Array<{
  target: LoginTarget;
  icon: typeof ShieldCheck;
  tone: string;
}> = [
  { target: "admin", icon: ShieldCheck, tone: "bg-slate-900 text-white" },
  { target: "manager", icon: BriefcaseBusiness, tone: "bg-blue-600 text-white" },
  { target: "user", icon: UserRound, tone: "bg-emerald-600 text-white" },
];

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
  const [quickLoading, setQuickLoading] = useState<LoginTarget | null>(null);

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

  const handleQuickLogin = async (target: LoginTarget) => {
    setQuickLoading(target);
    setCompanyError("");
    localStorage.removeItem(AUTH_STORE_KEY);
    const result = await demoLogin(target);
    if (!result.ok) {
      setCompanyError(result.error ?? "Giriş yapılamadı.");
      setQuickLoading(null);
      return;
    }
    redirectByRole();
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

      <div className={`w-full ${DEMO_MODE ? "max-w-4xl" : "max-w-sm"}`}>
        <div className={DEMO_MODE ? "grid gap-5 lg:grid-cols-[0.95fr_1.25fr]" : ""}>
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
                Kullanıcı adı / E-posta
              </label>
              <input
                type="text"
                required
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="kullanici@firma.com"
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

        {DEMO_MODE && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Geçici hızlı giriş</h2>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Geliştirme
                  </span>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Test etmek istediğiniz yetki seviyesini seçin; bilgiler otomatik doldurulup giriş yapılır.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {QUICK_LOGIN.map(({ target, icon: Icon, tone }) => {
                const account = DEMO_ACCOUNTS[target];
                const isLoading = quickLoading === target;
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() => handleQuickLogin(target)}
                    disabled={quickLoading !== null || companyLoading}
                    className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{account.label}</span>
                      <span className="block truncate text-xs text-slate-500">{account.description}</span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-slate-400">
                        {account.email} · {account.password}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

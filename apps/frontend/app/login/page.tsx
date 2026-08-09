"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertTriangle,
  User,
  Users,
} from "lucide-react";
import axios from "axios";
import { buildApiUrl } from "@/lib/api";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { useAuth, AUTH_STORE_KEY } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/permissions";

function redirectByRole() {
  const payload = getTokenPayloadFromStorage();
  if (!payload) { window.location.href = "/login"; return; }
  const roles = payload.roles ?? [];
  if (roles.includes("admin")) { window.location.href = "/admin/dashboard"; return; }
  if (roles.includes("manager")) { window.location.href = "/manager/dashboard"; return; }
  window.location.href = "/user/dashboard";
}

const DEV_PANELS: {
  role: UserRole;
  label: string;
  desc: string;
  Icon: React.ElementType;
  cardCls: string;
  iconWrapCls: string;
  iconCls: string;
  labelCls: string;
  descCls: string;
  btnCls: string;
}[] = [
  {
    role: "ADMIN",
    label: "Admin Paneli",
    desc: "Kullanıcı, rol ve sistem ayarlarını yönetin.",
    Icon: ShieldCheck,
    cardCls: "border-slate-700 bg-slate-900",
    iconWrapCls: "bg-indigo-600",
    iconCls: "text-white",
    labelCls: "text-white",
    descCls: "text-slate-400",
    btnCls: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  {
    role: "MANAGER",
    label: "Yönetici Paneli",
    desc: "İş emirlerini oluşturun, atayın ve takip edin.",
    Icon: Users,
    cardCls: "border-blue-800 bg-blue-950",
    iconWrapCls: "bg-blue-600",
    iconCls: "text-white",
    labelCls: "text-white",
    descCls: "text-blue-300",
    btnCls: "bg-blue-600 hover:bg-blue-500 text-white",
  },
  {
    role: "USER",
    label: "Kullanıcı Paneli",
    desc: "Size atanan işleri görün ve raporlayın.",
    Icon: User,
    cardCls: "border-slate-200 bg-white",
    iconWrapCls: "bg-teal-100",
    iconCls: "text-teal-600",
    labelCls: "text-slate-900",
    descCls: "text-slate-500",
    btnCls: "bg-teal-500 hover:bg-teal-600 text-white",
  },
];

const PANEL_HOME: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  MANAGER: "/manager/dashboard",
  USER: "/user/dashboard",
};

export default function LoginPage() {
  const router = useRouter();
  const { loginAs } = useAuth();

  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");

  const handleMockLogin = (role: UserRole) => {
    loginAs(role);
    // localStorage'a yazıldıktan sonra hard reload — AuthProvider fresh okur
    window.location.href = PANEL_HOME[role];
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
      // Clear mock auth, save real JWT
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
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white text-xl font-bold mb-4">
          G
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Golabs ERP
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Hangi panele giriş yapmak istiyorsunuz?
        </p>
      </div>

      {/* Warning */}
      <div className="w-full max-w-3xl mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
        <p className="text-xs text-amber-700">
          Bu giriş ekranı geliştirme/test amaçlıdır. Gerçek şifreli giriş
          sistemi sonraki aşamada bağlanacaktır.
        </p>
      </div>

      {/* 3 Panel Cards */}
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3 mb-8">
        {DEV_PANELS.map(
          ({
            role,
            label,
            desc,
            Icon,
            cardCls,
            iconWrapCls,
            iconCls,
            labelCls,
            descCls,
            btnCls,
          }) => (
            <div
              key={role}
              className={`rounded-2xl border p-6 shadow-sm ${cardCls}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrapCls}`}
                >
                  <Icon className={`h-5 w-5 ${iconCls}`} />
                </div>
                <h2 className={`text-sm font-semibold ${labelCls}`}>{label}</h2>
              </div>
              <p className={`text-xs leading-relaxed mb-5 ${descCls}`}>{desc}</p>
              <button
                onClick={() => handleMockLogin(role)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${btnCls}`}
              >
                <ArrowRight className="h-4 w-4" />
                Giriş Yap
              </button>
            </div>
          )
        )}
      </div>

      {/* Divider */}
      <div className="w-full max-w-3xl flex items-center gap-4 mb-8">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs font-medium text-slate-400">
          veya gerçek hesabınızla giriş yapın
        </span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* Real login section */}
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

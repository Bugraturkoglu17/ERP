"use client";

/**
 * GEÇİCİ geliştirme aracı — test sürecini hızlandırmak için gerçek hesaplar
 * arasında tek tıkla geçiş sağlar (mock/sahte veri kullanmaz, her geçiş
 * gerçek backend login'i yapar). Kullanıcı bu paneli üretime almadan
 * kaldıracağını belirtti — silinecekse bu dosya ve corporate-shell.tsx'teki
 * <QuickSwitch /> çağrısı kaldırılır.
 */
import { useState } from "react";
import { ArrowRight, Loader2, LogOut } from "lucide-react";
import { useAuth, AUTH_STORE_KEY } from "@/contexts/auth-context";
import { ROLE_LABEL, type UserRole } from "@/lib/permissions";
import { DEMO_MODE, demoLogin, type LoginTarget } from "@/lib/demo-auth";

const QUICK_ACCOUNTS: {
  role: UserRole;
  label: string;
  email: string;
  target: LoginTarget;
  home: string;
  avatarCls: string;
}[] = [
  { role: "ADMIN",   target: "admin",   label: "Admin",     email: "admin@sismik.com",    home: "/admin/dashboard",   avatarCls: "bg-indigo-500" },
  { role: "MANAGER", target: "manager", label: "Yönetici",  email: "yonetici@sismik.com", home: "/manager/dashboard", avatarCls: "bg-blue-500"   },
  { role: "USER",    target: "user",    label: "Kullanıcı", email: "saha@sismik.com",     home: "/user/dashboard",    avatarCls: "bg-teal-500"   },
];

export function QuickSwitch() {
  const { user, logout } = useAuth();
  const [switching, setSwitching] = useState<UserRole | null>(null);

  if (!DEMO_MODE || !user) return null;

  const others = QUICK_ACCOUNTS.filter((a) => a.role !== user.role);

  const switchTo = async (acc: (typeof QUICK_ACCOUNTS)[0]) => {
    setSwitching(acc.role);
    try {
      localStorage.removeItem(AUTH_STORE_KEY);
      const result = await demoLogin(acc.target);
      if (!result.ok) throw new Error(result.error ?? "Hesap değiştirilemedi.");
      window.location.assign(acc.home);
    } catch {
      setSwitching(null);
    }
  };

  return (
    <div className="border-t border-white/[0.06]">
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
          Hızlı Geçiş · Geçici
        </p>
      </div>

      <div className="px-3 pb-1 space-y-0.5">
        {others.map((acc) => (
          <button
            key={acc.role}
            onClick={() => switchTo(acc)}
            disabled={switching !== null}
            className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${acc.avatarCls}`}>
              {acc.label.slice(0, 2).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-left text-xs text-slate-300">{acc.label}</span>
            {switching === acc.role ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-500" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-300" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/[0.06] p-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-semibold text-slate-900">
          {ROLE_LABEL[user.role].slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white">{ROLE_LABEL[user.role]}</p>
          <p className="text-[10px] text-white/40">Aktif hesap</p>
        </div>
        <button
          onClick={logout}
          title="Çıkış Yap"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

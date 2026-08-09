"use client";

import { ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/permissions";

type Theme = "slate" | "blue" | "teal";

const ACCOUNTS: Array<{
  role: UserRole;
  label: string;
  name: string;
  initials: string;
  home: string;
  avatarCls: string;
}> = [
  { role: "ADMIN",   label: "Admin",     name: "Admin Kullanıcı", initials: "AU", home: "/admin/dashboard",   avatarCls: "bg-indigo-600" },
  { role: "MANAGER", label: "Yönetici",  name: "Bilal Yönetici",  initials: "BY", home: "/manager/dashboard", avatarCls: "bg-blue-500"   },
  { role: "USER",    label: "Kullanıcı", name: "Buğra Türkoğlu",  initials: "BT", home: "/user/dashboard",    avatarCls: "bg-teal-500"   },
];

const T: Record<Theme, {
  border: string; label: string;
  rowHover: string; rowName: string; rowArrow: string;
  activeBg: string; activeName: string; activeSub: string;
  logoutHover: string; logoutText: string;
  divider: string;
}> = {
  slate: {
    border: "border-slate-700/50", label: "text-slate-500",
    rowHover: "hover:bg-slate-800", rowName: "text-slate-300", rowArrow: "text-slate-600 group-hover:text-slate-300",
    activeBg: "bg-slate-800/60", activeName: "text-white", activeSub: "text-slate-400",
    logoutHover: "hover:bg-slate-800", logoutText: "text-slate-500 hover:text-slate-200",
    divider: "border-slate-800",
  },
  blue: {
    border: "border-blue-900", label: "text-blue-500",
    rowHover: "hover:bg-blue-900/70", rowName: "text-blue-200", rowArrow: "text-blue-700 group-hover:text-blue-200",
    activeBg: "bg-blue-900/60", activeName: "text-white", activeSub: "text-blue-400",
    logoutHover: "hover:bg-blue-900/70", logoutText: "text-blue-500 hover:text-blue-200",
    divider: "border-blue-900",
  },
  teal: {
    border: "border-teal-900", label: "text-teal-500",
    rowHover: "hover:bg-teal-900/70", rowName: "text-teal-200", rowArrow: "text-teal-700 group-hover:text-teal-200",
    activeBg: "bg-teal-900/60", activeName: "text-white", activeSub: "text-teal-400",
    logoutHover: "hover:bg-teal-900/70", logoutText: "text-teal-500 hover:text-teal-200",
    divider: "border-teal-900",
  },
};

export function DevAccountSwitcher({ theme = "slate" }: { theme?: Theme }) {
  const { user, switchAccount, logout } = useAuth();
  const t = T[theme];

  if (!user) return null;

  const current = ACCOUNTS.find((a) => a.role === user.role)!;
  const others  = ACCOUNTS.filter((a) => a.role !== user.role);

  function switchTo(acc: (typeof ACCOUNTS)[0]) {
    switchAccount(acc.role);       // Sadece localStorage güncelle — React state değişmez, RoleGuard tetiklenmez
    window.location.href = acc.home; // Tam sayfa reload — yeni panel AuthProvider'ı temiz başlar
  }

  return (
    <div className={`border-t ${t.border}`}>
      {/* Label */}
      <div className="px-5 pt-3 pb-1">
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.label}`}>
          Hesap Geçişi
        </p>
      </div>

      {/* Diğer hesaplar — geçiş butonları */}
      <div className="px-3 pb-1 space-y-0.5">
        {others.map((acc) => (
          <button
            key={acc.role}
            onClick={() => switchTo(acc)}
            className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors ${t.rowHover}`}
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${acc.avatarCls}`}>
              {acc.initials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className={`truncate text-xs font-medium ${t.rowName}`}>{acc.name}</p>
              <p className={`text-[10px] ${t.label}`}>{acc.label}</p>
            </div>
            <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${t.rowArrow}`} />
          </button>
        ))}
      </div>

      {/* Aktif hesap */}
      <div className="px-3 pb-1">
        <div className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${t.activeBg}`}>
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${current.avatarCls}`}>
            {current.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-medium ${t.activeName}`}>{current.name}</p>
            <p className={`text-[10px] ${t.activeSub}`}>{current.label}</p>
          </div>
          <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Çıkış */}
      <div className={`border-t ${t.divider} px-3 py-2`}>
        <button
          onClick={logout}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${t.logoutHover}`}
        >
          <LogOut className={`h-3.5 w-3.5 shrink-0 ${t.logoutText}`} />
          <span className={`text-xs ${t.logoutText}`}>Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
}

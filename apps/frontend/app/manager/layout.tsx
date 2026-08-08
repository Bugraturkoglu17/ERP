"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Store,
  Archive,
  Users,
  LogOut,
} from "lucide-react";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { apiGet } from "@/lib/api";

const NAV = [
  { href: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
  { href: "/manager/magaza-karti", label: "Mağaza Kartı", icon: Store },
  { href: "/manager/genel-arsiv", label: "Genel Arşiv", icon: Archive },
  { href: "/manager/kullanicilar", label: "Kullanıcılar", icon: Users },
];

function ManagerSidebar({
  mobileOpen,
  onClose,
  userName,
  isDev,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  userName: string;
  isDev: boolean;
}) {
  const pathname = usePathname();

  const inner = (
    <div className="flex h-full flex-col bg-blue-950 text-blue-100">
      <div className="flex h-16 items-center justify-between px-4 border-b border-blue-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white text-xs font-bold">
            Y
          </div>
          <span className="text-sm font-semibold text-white">Yönetici Paneli</span>
        </div>
        <button onClick={onClose} className="lg:hidden text-blue-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {isDev && (
        <div className="mx-3 mt-3 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300">
          DEV MODE — token yok
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-blue-300 hover:bg-blue-900 hover:text-blue-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-blue-900 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-blue-400">Yönetici</p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-400 hover:bg-blue-900 hover:text-blue-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0 border-r border-blue-900">
        {inner}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-60">{inner}</aside>
        </div>
      )}
    </>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Yönetici");
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setMounted(true);
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      setIsDev(true);
      return;
    }
    const roles: string[] = payload.roles ?? [];
    if (
      !roles.includes("manager") &&
      !roles.includes("admin") &&
      !roles.includes("platform_admin")
    ) {
      window.location.href = "/";
      return;
    }
    apiGet<{ full_name: string }>("/auth/me")
      .then((me) => { if (me?.full_name) setUserName(me.full_name); })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-950">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ManagerSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={userName}
        isDev={isDev}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Operasyon Yönetimi</span>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

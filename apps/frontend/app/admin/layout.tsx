"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { apiGet } from "@/lib/api";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/roles", label: "Roller & Yetkiler", icon: Shield },
  { href: "/admin/audit-logs", label: "Audit Log", icon: FileText },
  { href: "/admin/settings", label: "Sistem Ayarları", icon: Settings },
];

function AdminSidebar({
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
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white text-xs font-bold">
            A
          </div>
          <span className="text-sm font-semibold text-white">Admin Paneli</span>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
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
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/50 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-700">
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setMounted(true);
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      setIsDev(true);
      return;
    }
    const roles: string[] = payload.roles ?? [];
    if (!roles.includes("admin") && !roles.includes("platform_admin")) {
      window.location.href = "/";
      return;
    }
    apiGet<{ full_name: string }>("/auth/me")
      .then((me) => { if (me?.full_name) setUserName(me.full_name); })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={userName}
        isDev={isDev}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Admin Yönetimi</span>
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

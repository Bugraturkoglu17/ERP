"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, ClipboardList, User, LogOut } from "lucide-react";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { apiGet } from "@/lib/api";

const NAV = [
  { href: "/user/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/user/islerim", label: "İşlerim", icon: ClipboardList },
  { href: "/user/profile", label: "Profil", icon: User },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Kullanıcı");
  const [isDev, setIsDev] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      setIsDev(true);
      return;
    }
    apiGet<{ full_name: string }>("/auth/me")
      .then((me) => { if (me?.full_name) setUserName(me.full_name); })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500 text-white text-xs font-bold">
            K
          </div>
          <span className="text-sm font-semibold text-slate-900">Kullanıcı Paneli</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-400 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isDev && (
        <div className="mx-3 mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
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
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-teal-600" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">Saha Ekibi</p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden lg:block w-60 shrink-0">{sidebarContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60">{sidebarContent}</aside>
        </div>
      )}

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
            <span className="text-xs font-medium text-slate-500">{userName}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">
              {userName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

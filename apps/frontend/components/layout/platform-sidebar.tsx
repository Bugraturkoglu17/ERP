"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, LayoutDashboard, Building2, CreditCard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  mobileOpen?: boolean;
  onClose?: () => void;
  userName?: string;
};

const NAV = [
  { label: "Genel Bakış", href: "/platform", icon: LayoutDashboard, exact: true },
  { label: "Firmalar", href: "/platform/firmalar", icon: Building2 },
  { label: "Lisanslar", href: "/platform/lisanslar", icon: CreditCard },
  { label: "Kullanıcılar", href: "/platform/kullanicilar", icon: Users },
];

export function PlatformSidebar({ mobileOpen = false, onClose, userName = "Platform Admin" }: Props) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Overlay mobil */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold">
              G
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">Golabs ERP</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Platform Yönetimi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 shrink-0">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-400">Platform Yöneticisi</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}

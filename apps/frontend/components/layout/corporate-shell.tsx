"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { QuickSwitch } from "@/components/layout/quick-switch";
import type { UserRole } from "@/lib/permissions";

export type CorporateNavItem = { href: string; label: string; icon: LucideIcon };

function CorporateSidebar({
  mobileOpen,
  onClose,
  monogram,
  title,
  navItems,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  monogram: string;
  title: string;
  navItems: CorporateNavItem[];
}) {
  const pathname = usePathname();

  const inner = (
    <div className="flex h-full flex-col border-t-[3px] border-t-amber-400" style={{ background: "#0c1520" }}>
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-400 text-slate-900 text-xs font-black shrink-0">
            {monogram}
          </div>
          <div>
            <span className="text-sm font-semibold text-white leading-none">{title}</span>
            <span className="block text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">ERP Sistemi</span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-600 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-white/[0.08] text-white font-medium"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <QuickSwitch />
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0">{inner}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-60">{inner}</aside>
        </div>
      )}
    </>
  );
}

/**
 * Ortak "Kurumsal Güç" kabuğu — admin/manager/user panelleri arasında
 * sidebar teması, Hesap Geçişi paneli ve header düzenini tek noktadan tutar.
 */
export function CorporateShell({
  children,
  allowedRoles,
  monogram,
  title,
  navItems,
  headerLabel,
}: {
  children: ReactNode;
  allowedRoles: UserRole[];
  monogram: string;
  title: string;
  navItems: CorporateNavItem[];
  headerLabel: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={allowedRoles} spinnerBg="bg-slate-50">
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <CorporateSidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          monogram={monogram}
          title={title}
          navItems={navItems}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{headerLabel}</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

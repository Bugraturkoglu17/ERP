"use client";

import { type CSSProperties, type PointerEventHandler, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { QuickSwitch } from "@/components/layout/quick-switch";
import type { UserRole } from "@/lib/permissions";
import { AppLaunch } from "@/components/brand/app-launch";
import { BrandMark, type BrandTone } from "@/components/brand/brand-mark";
import { useMobileDrawer } from "@/hooks/use-mobile-drawer";

export type CorporateNavItem = { href: string; label: string; icon: LucideIcon };

function CorporateSidebar({
  mobileOpen,
  onClose,
  brandTone,
  title,
  navItems,
  dragX,
  edgeSwipeEnabled,
  edgeGestureProps,
  drawerGestureProps,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  brandTone: BrandTone;
  title: string;
  navItems: CorporateNavItem[];
  dragX: number | null;
  edgeSwipeEnabled: boolean;
  edgeGestureProps: {
    onPointerDown: PointerEventHandler<HTMLElement>;
    onPointerMove: PointerEventHandler<HTMLElement>;
    onPointerUp: PointerEventHandler<HTMLElement>;
    onPointerCancel: PointerEventHandler<HTMLElement>;
    onLostPointerCapture: PointerEventHandler<HTMLElement>;
  };
  drawerGestureProps: {
    onPointerDown: PointerEventHandler<HTMLElement>;
    onPointerMove: PointerEventHandler<HTMLElement>;
    onPointerUp: PointerEventHandler<HTMLElement>;
    onPointerCancel: PointerEventHandler<HTMLElement>;
    onLostPointerCapture: PointerEventHandler<HTMLElement>;
    onClickCapture: React.MouseEventHandler<HTMLElement>;
  };
}) {
  const pathname = usePathname();
  const backdropProgress = mobileOpen
    ? Math.max(0, 1 - Math.abs(dragX ?? 0) / 360)
    : Math.min(1, Math.max(0, (dragX ?? 0) / 360));

  const inner = (
    <div className={`flex h-full flex-col border-t-[3px] bg-[#0c1520] ${brandTone === "amber" ? "border-t-amber-400" : "border-t-[#ff3131]"}`}>
      <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
        <div className="flex items-center gap-2.5">
          <BrandMark
            key={`sidebar-brand-${mobileOpen ? "open" : "closed"}`}
            tone={brandTone}
            animated
            className="h-9 w-9 shrink-0"
          />
          <div>
            <span className="text-sm font-semibold tracking-[-0.02em] text-white leading-none">{title}</span>
            <span className="block text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">ERP Sistemi</span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-600 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              draggable={false}
              onClick={onClose}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                active
                  ? "bg-white/[0.09] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "text-slate-400 hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              {active && <span className={`absolute -left-3 h-5 w-0.5 rounded-r ${brandTone === "amber" ? "bg-amber-400" : "bg-[#ff3131]"}`} />}
              <Icon className={`h-4 w-4 shrink-0 ${active ? (brandTone === "amber" ? "text-amber-300" : "text-red-400") : "text-slate-500 group-hover:text-slate-300"}`} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <QuickSwitch onNavigate={onClose} />
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0">{inner}</aside>
      {edgeSwipeEnabled && !mobileOpen && (
        <div
          className="fixed bottom-0 left-0 top-0 z-30 w-8 touch-pan-y lg:hidden"
          aria-hidden="true"
          {...edgeGestureProps}
        />
      )}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen || dragX !== null ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen && dragX === null}
      >
        <button
          type="button"
          aria-label="Menüyü kapat"
          className={`absolute inset-0 h-full w-full bg-slate-950/30 will-change-[opacity,backdrop-filter] ${dragX === null ? "transition-[opacity,backdrop-filter] duration-[240ms] ease-out" : ""}`}
          style={{
            opacity: backdropProgress,
            backdropFilter: `blur(${backdropProgress * 3}px)`,
            WebkitBackdropFilter: `blur(${backdropProgress * 3}px)`,
          } as CSSProperties}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 m-0 w-[86vw] max-w-[360px] touch-pan-y select-none overflow-hidden overscroll-contain ${dragX === null ? "transition-transform duration-[260ms] ease-out" : ""}`}
          {...drawerGestureProps}
          onDragStart={(event) => event.preventDefault()}
          style={{
            transform: mobileOpen
              ? `translate3d(${Math.min(0, dragX ?? 0)}px, 0, 0)`
              : `translate3d(calc(-100% + ${Math.max(0, dragX ?? 0)}px), 0, 0)`,
          } as CSSProperties}
        >
          {inner}
        </aside>
      </div>
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
  brandTone = "red",
  title,
  navItems,
  headerLabel,
}: {
  children: ReactNode;
  allowedRoles: UserRole[];
  brandTone?: BrandTone;
  title: string;
  navItems: CorporateNavItem[];
  headerLabel: ReactNode;
}) {
  const drawer = useMobileDrawer();

  return (
    <RoleGuard allowedRoles={allowedRoles} spinnerBg="bg-slate-50">
      <AppLaunch tone={brandTone} scope={allowedRoles.join("-")} />
      <div
        className="flex min-h-dvh max-w-full overflow-x-clip bg-slate-50"
        style={{ transform: "none" }}
      >
        <CorporateSidebar
          mobileOpen={drawer.open}
          onClose={drawer.close}
          brandTone={brandTone}
          title={title}
          navItems={navItems}
          dragX={drawer.dragX}
          edgeSwipeEnabled={drawer.edgeSwipeEnabled}
          edgeGestureProps={drawer.edgeGestureProps}
          drawerGestureProps={drawer.drawerGestureProps}
        />
        <div className="flex min-w-0 max-w-full flex-1 flex-col" style={{ transform: "none" }}>
          <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 pb-0 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6">
            <button
              onClick={drawer.openDrawer}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold tracking-[-0.01em] text-slate-700">Sismik ERP</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Güvenli operasyon çalışma alanı</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
              <span className="max-w-[11rem] truncate text-[11px] font-semibold tracking-wide text-slate-500 sm:max-w-none">{headerLabel}</span>
            </div>
          </header>
          <main id="main-content" className="erp-workspace min-w-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}

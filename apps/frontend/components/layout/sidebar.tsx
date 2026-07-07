"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronRight, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getVisibleNavEntries, isNavGroup, type NavGroup } from "@/lib/navigation";
import { getRoles, getTokenPayloadFromStorage } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { logout } from "@/lib/session";
import { fetchTenantContext } from "@/lib/tenant-context";

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

function getActiveGroup(groups: NavGroup[], pathname: string): string | null {
  for (const g of groups) {
    if (pathname === g.href || pathname.startsWith(g.href + "/") ||
        g.items.some((i) => pathname === i.href.split("?")[0] || pathname.startsWith(i.href.split("?")[0] + "/"))) {
      return g.href;
    }
  }
  return null;
}

function extractEntitlements(rawContext: string | null): { modules?: string[]; features?: string[] } | undefined {
  try {
    const parsed = rawContext ? JSON.parse(rawContext) : null;
    const modules = Array.isArray(parsed?.active_modules)
      ? parsed.active_modules
      : Array.isArray(parsed?.enabled_modules)
        ? parsed.enabled_modules
        : undefined;
    const features = Array.isArray(parsed?.active_features)
      ? parsed.active_features
      : Array.isArray(parsed?.feature_flags)
        ? parsed.feature_flags
        : undefined;
    return modules || features ? { modules, features } : undefined;
  } catch {
    return undefined;
  }
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [roles, setRoles]       = useState<string[]>([]);
  const [fullName, setFullName] = useState("Kullanıcı");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [hasContext, setHasContext] = useState(false);
  const [entitlements, setEntitlements] = useState<{ modules?: string[]; features?: string[] }>();

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    const r = getRoles(payload);
    setRoles(r);
    apiGet<{ full_name: string }>("/auth/me")
      .then((me) => { if (me?.full_name) setFullName(me.full_name); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const contextToken = window.localStorage.getItem("tenant_context_token");
      setHasContext(Boolean(contextToken));
      const rawContext = window.localStorage.getItem("tenant_context_data") || window.sessionStorage.getItem("tenant_context_v1");
      setEntitlements(extractEntitlements(rawContext));
    }
  }, [pathname]);

  useEffect(() => {
    if (!roles.length) return;

    const refreshEntitlements = async () => {
      if (typeof window === "undefined") return;

      const contextToken = window.localStorage.getItem("tenant_context_token");
      setHasContext(Boolean(contextToken));

      if (contextToken) {
        const rawContext = window.localStorage.getItem("tenant_context_data");
        setEntitlements(extractEntitlements(rawContext));
        return;
      }

      const ctx = await fetchTenantContext(true);
      const modules = Array.isArray(ctx?.active_modules) ? ctx.active_modules : undefined;
      const features = Array.isArray(ctx?.active_features) ? ctx.active_features : Array.isArray(ctx?.feature_flags) ? ctx.feature_flags : undefined;
      setEntitlements(modules || features ? { modules, features } : undefined);
    };

    const onRefresh = () => {
      void refreshEntitlements();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshEntitlements();
    };

    void refreshEntitlements();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onRefresh);
    window.addEventListener("tenant-entitlements-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(onRefresh, 30000);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onRefresh);
      window.removeEventListener("tenant-entitlements-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [roles]);

  useEffect(() => {
    if (!roles.length) return;
    const isPlatformUser = roles.includes("platform_admin");
    if (isPlatformUser && !hasContext) return;
    if (hasContext) return;
    fetchTenantContext()
      .then((ctx) => {
        const modules = Array.isArray(ctx?.active_modules) ? ctx.active_modules : undefined;
        const features = Array.isArray(ctx?.active_features) ? ctx.active_features : Array.isArray(ctx?.feature_flags) ? ctx.feature_flags : undefined;
        setEntitlements(modules || features ? { modules, features } : undefined);
      })
      .catch(() => {});
  }, [roles, hasContext]);

  const isPlatform = roles.includes("platform_admin");
  const entries = getVisibleNavEntries(roles, isPlatform, hasContext, entitlements);
  const navGroups = entries.filter(isNavGroup) as NavGroup[];

  // Auto-open the group that contains the current path
  useEffect(() => {
    const active = getActiveGroup(navGroups, pathname);
    if (active) setOpenGroups((prev) => new Set(Array.from(prev).concat(active)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, roles, hasContext]);

  const toggleGroup = (href: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  const isActive = (href: string, exact?: boolean) => {
    const [base, query] = href.split("?");
    if (exact) return pathname === base;
    if (base === "/") return pathname === "/";
    const pathMatch = pathname === base || pathname.startsWith(base + "/");
    if (!pathMatch) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    for (const [k, v] of Array.from(params.entries())) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  };

  const handleLogout = () => {
    logout(router);
  };

  return (
    <>
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
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0">
              S
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{isPlatform ? "Golabs ERP" : "Golabs ERP"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{isPlatform ? "Platform Yönetimi" : "Mağaza Takip"}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {entries.map((entry, idx) => {
            if (isNavGroup(entry)) {
              const isOpen    = openGroups.has(entry.href);
              const isGroupActive = entry.items.some((i) => isActive(i.href, i.exact)) || isActive(entry.href, entry.exact);
              const GroupIcon = entry.icon;
              return (
                <div key={`${entry.href}-${idx}`}>
                  <button
                    onClick={() => toggleGroup(entry.href)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isGroupActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <GroupIcon className={cn("h-4 w-4 shrink-0", isGroupActive ? "text-blue-600" : "text-slate-400")} />
                    <span className="flex-1 text-left">{entry.label}</span>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-150", isOpen && "rotate-90")} />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
                      {entry.items.map((item, subIdx) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.href, item.exact);
                        return (
                          <Link
                            key={`${item.href}-${subIdx}`}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                              active
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            )}
                          >
                            <ItemIcon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-blue-600" : "text-slate-300")} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Plain nav item
            const Icon   = entry.icon;
            const active = isActive(entry.href, entry.exact);
            return (
              <Link
                key={`${entry.href}-${idx}`}
                href={entry.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-600" : "text-slate-400")} />
                {entry.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-2">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 mb-0.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 shrink-0">
              {fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-900 truncate">{fullName}</p>
              {isPlatform && <p className="text-[10px] text-slate-400">Platform Yöneticisi</p>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}

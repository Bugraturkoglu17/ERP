"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getVisibleNavItems } from "@/lib/navigation";
import { getRoles, getTokenPayloadFromStorage } from "@/lib/auth";
import { fetchTenantContext } from "@/lib/tenant-context";
import { apiGet } from "@/lib/api";

type SidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);
  const [tenantName, setTenantName] = useState("Firma");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("Kullanıcı");

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    setRoles(getRoles(payload));

    (async () => {
      const [ctx, me] = await Promise.all([
        fetchTenantContext(),
        apiGet<{ full_name: string }>("/auth/me").catch(() => null),
      ]);
      if (ctx?.tenant_name) {
        setTenantName(ctx.tenant_name);
      }
      if (ctx?.logo_url) {
        setLogoUrl(ctx.logo_url);
      }
      if (me?.full_name) {
        setFullName(me.full_name);
      }
    })();
  }, []);

  const navItems = getVisibleNavItems(roles);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/50 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform lg:static lg:translate-x-0 lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt="Firma logosu" className="h-full w-full object-cover" /> : tenantName.slice(0, 1).toUpperCase()}
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          {tenantName} ERP
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Menüyü kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                "hover:bg-slate-800 hover:text-white",
                isActive ? "bg-blue-600 text-white" : "text-slate-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium">
            JD
          </div>
          <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{fullName}</p>
            <p className="text-xs text-slate-500 truncate">Yönetici</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Cikis Yap
        </button>
      </div>
      </aside>
    </>
  );
}

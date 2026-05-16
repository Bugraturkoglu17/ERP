/**
 * apps/frontend/src/app/dashboard/layout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Dashboard App Layout
 * Sol menü + üst bar + içerik alanı.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { LogOut, LayoutDashboard, FolderKanban, Package, DollarSign, User } from "lucide-react";
import Link                  from "next/link";
import { usePathname }       from "next/navigation";
import { useAuth }           from "@/contexts/AuthContext";
import { useToast }          from "@/contexts/ToastContext";

const NAV_ITEMS = [
  { href: "/dashboard",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/dashboard/projects",  label: "Projeler",   icon: FolderKanban   },
  { href: "/dashboard/inventory", label: "Envanter",   icon: Package        },
  { href: "/dashboard/finance",   label: "Finans",     icon: DollarSign     },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const { logout, user } = useAuth();
  const toastSuccess = useToast().toastSuccess;

  const handleLogout = () => {
    logout();
    toastSuccess("Oturum Kapatıldı", "Güvenle çıkış yapıldı.");
    window.location.href = "/login";
  };

  const fullName   = user?.full_name ?? "Kullanıcı";
  const roleLabel  = user?.default_role ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Logo */}
        <div className="h-14 px-5 flex items-center gap-2 border-b border-gray-200">
          <div className="h-7 w-7 rounded-lg bg-blue-600 grid place-content-center text-white text-[13px] font-bold">
            SM
          </div>
          <span className="font-semibold text-sm text-gray-900 tracking-tight">
            Sismik<span className="text-blue-600">ERP</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <item.icon className={isActive ? "text-blue-600" : "text-gray-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "Dashboard"}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">{fullName}</p>
              <p className="text-[11px] text-gray-500">{roleLabel}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 grid place-content-center text-blue-700 text-xs font-semibold">
              {fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

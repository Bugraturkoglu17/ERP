"use client";

import "./globals.css";
import { Menu } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { fetchTenantContext } from "@/lib/tenant-context";

function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [title, setTitle] = useState("Sismik Mağaza Kartı");
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/password-reset" ||
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname.startsWith("/is-emri/");
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");

  useEffect(() => {
    if (!mounted) return;
    const isPlatformRoute = pathname === "/platform" || pathname.startsWith("/platform/");
    if (!isPublicRoute && !isPlatformRoute && !hasToken) {
      window.location.href = "/login";
    }
  }, [mounted, isPublicRoute, hasToken, pathname]);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/password-reset") {
      return;
    }
    if (!hasToken) {
      return;
    }
    (async () => {
      const ctx = await fetchTenantContext();
      if (ctx?.tenant_name) {
        setTitle(`${ctx.tenant_name} — Mağaza Kartı`);
      }
    })();
  }, [pathname, hasToken]);

  // Prevent hydration mismatch and rendering layout components before path is determined
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const isPlatformRoute = pathname === "/platform" || pathname.startsWith("/platform/");
  // Redirecting state
  if (!isPublicRoute && !isPlatformRoute && !hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 w-full">
      <Suspense fallback={<div className="w-64 shrink-0" />}>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base lg:text-lg">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

"use client";

import "./globals.css";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { fetchTenantContext } from "@/lib/tenant-context";

function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [title, setTitle] = useState("Yönetim Paneli");

  useEffect(() => {
    (async () => {
      const ctx = await fetchTenantContext();
      if (ctx?.tenant_name) {
        setTitle(`${ctx.tenant_name} ERP Paneli`);
      }
    })();
  }, []);

  return (
    <body className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
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
    </body>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <AppShell>{children}</AppShell>
    </html>
  );
}

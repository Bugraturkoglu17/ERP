"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";
import { apiGet } from "@/lib/api";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Platform Admin");

  useEffect(() => {
    setMounted(true);
    const payload = getTokenPayloadFromStorage();
    if (!payload) { window.location.href = "/login"; return; }
    if (!isPlatformAdmin(payload)) { window.location.href = "/"; return; }

    apiGet<{ full_name: string }>("/auth/me")
      .then((me) => { if (me?.full_name) setUserName(me.full_name); })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PlatformSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={userName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Platform Yönetimi</span>
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-semibold">
              {userName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

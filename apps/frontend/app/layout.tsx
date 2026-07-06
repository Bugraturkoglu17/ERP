"use client";

import "./globals.css";
import { Menu, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { fetchTenantContext } from "@/lib/tenant-context";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";
import { hasAuthToken } from "@/lib/session";

function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [title, setTitle] = useState("Yönetim Paneli");
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contextInfo, setContextInfo] = useState<any>(null);
  
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [timeLeftString, setTimeLeftString] = useState("");

  const checkContext = () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("tenant_context_token");
    const data = window.localStorage.getItem("tenant_context_data");
    if (token && data) {
      try {
        setContextInfo(JSON.parse(data));
      } catch {
        setContextInfo(null);
      }
    } else {
      setContextInfo(null);
    }
  };

  const handleEndContext = async () => {
    try {
      const { apiPost } = await import("@/lib/api");
      await apiPost("/platform/context/end");
    } catch {}
    localStorage.removeItem("tenant_context_token");
    localStorage.removeItem("tenant_context_data");
    window.location.href = "/platform";
  };

  const handleRenewContext = async () => {
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<any>("/platform/context/renew");
      if (res && res.context_token) {
        window.localStorage.setItem("tenant_context_token", res.context_token);
        const updatedData = {
          ...contextInfo,
          expires_at: res.expires_at
        };
        window.localStorage.setItem("tenant_context_data", JSON.stringify(updatedData));
        setContextInfo(updatedData);
        setShowRenewModal(false);
      }
    } catch (err: any) {
      alert("Destek oturumu yenilenemedi, oturum sonlandırılıyor.");
      handleEndContext();
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (payload) {
      setIsAdmin(isPlatformAdmin(payload));
    } else {
      setIsAdmin(false);
    }
  }, [pathname]);

  const hasToken = mounted ? hasAuthToken() : false;
  const isPublicRoute = pathname === "/login" || pathname === "/password-reset";

  useEffect(() => {
    if (!mounted) return;
    if (!isPublicRoute && !hasToken) {
      router.replace("/login");
    }
  }, [mounted, isPublicRoute, hasToken, router]);

  useEffect(() => {
    checkContext();
  }, [pathname]);

  useEffect(() => {
    if (!contextInfo?.active || !contextInfo?.expires_at) {
      setShowRenewModal(false);
      return;
    }
    const interval = setInterval(() => {
      const expires = new Date(contextInfo.expires_at).getTime();
      const now = new Date().getTime();
      const diffMs = expires - now;
      const diffMin = Math.floor(diffMs / 60000);
      const diffSec = Math.floor((diffMs % 60000) / 1000);
      
      if (diffMs <= 0) {
        clearInterval(interval);
        localStorage.removeItem("tenant_context_token");
        localStorage.removeItem("tenant_context_data");
        window.location.href = "/platform";
        return;
      }
      
      if (diffMin < 5) {
        setTimeLeftString(`${diffMin}:${diffSec.toString().padStart(2, "0")}`);
        setShowRenewModal(true);
      } else {
        setShowRenewModal(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [contextInfo]);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/password-reset") {
      return;
    }
    if (!hasToken) {
      return;
    }
    if (contextInfo?.active) {
      setTitle(`${contextInfo.tenant_name} (Destek Paneli)`);
      return;
    }
    if (isAdmin) {
      setTitle("Platform Yönetimi");
      return;
    }
    (async () => {
      const ctx = await fetchTenantContext();
      if (ctx?.tenant_name) {
        setTitle(`${ctx.tenant_name} ERP Paneli`);
      }
    })();
  }, [pathname, hasToken, isAdmin, contextInfo]);

  // Prevent hydration mismatch and rendering layout components before path is determined
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Redirecting state
  if (!isPublicRoute && !hasToken) {
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
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col">
        {contextInfo?.active && (
          <div className="bg-amber-500 text-white text-xs font-bold px-4 py-3 flex items-center justify-between shadow-inner shrink-0 z-40">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span>
                <strong>{contextInfo.tenant_name}</strong> firması bağlamındasınız (Tenant Context) —{" "}
                <span className="uppercase font-extrabold">{contextInfo.mode === "read_only" ? "Salt Okunur (Read-Only)" : "Destek / Yazma Yetkili (Support-Write)"}</span>
              </span>
            </span>
            <button
              onClick={handleEndContext}
              className="bg-white text-amber-700 hover:bg-amber-100 px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all shadow-sm"
            >
              Platforma Geri Dön
            </button>
          </div>
        )}
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
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-slate-200" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      
      {showRenewModal && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-white border border-amber-200 shadow-2xl rounded-2xl p-4 z-50 animate-bounce flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 self-start shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">Destek Oturumu Süresi Doluyor</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                Destek oturumunuz {timeLeftString} dakika sonra otomatik olarak sonlandırılacaktır. Süreyi uzatmak ister misiniz?
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={handleEndContext}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-[10px] font-bold text-slate-655 hover:bg-slate-50 transition-all"
            >
              Kapat
            </button>
            <button
              onClick={handleRenewContext}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-[10px] font-bold text-white hover:bg-amber-600 transition-all shadow-sm"
            >
              Süreyi Uzat
            </button>
          </div>
        </div>
      )}
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

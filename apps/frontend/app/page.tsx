"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTokenPayloadFromStorage, getRoles, isPlatformAdmin } from "@/lib/auth";
import { AUTH_STORE_KEY } from "@/contexts/auth-context";
import { ROLE_PANEL_HOME, type UserRole } from "@/lib/permissions";

function jwtRoleHome(roles: string[]): string {
  if (roles.includes("manager")) return ROLE_PANEL_HOME.MANAGER;
  if (roles.includes("admin")) return ROLE_PANEL_HOME.MANAGER;
  return ROLE_PANEL_HOME.USER;
}

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
      if (isPlatformAdmin(payload)) {
        router.replace("/platform");
        return;
      }
      router.replace(jwtRoleHome(getRoles(payload)));
      return;
    }

    try {
      const raw = localStorage.getItem(AUTH_STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { user?: { role?: UserRole } }) : null;
      const role = parsed?.user?.role;
      if (role && ROLE_PANEL_HOME[role]) {
        router.replace(ROLE_PANEL_HOME[role]);
        return;
      }
    } catch {
      // ignore parse errors
    }

    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/permissions";
import { getTokenPayloadFromStorage } from "@/lib/auth";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  spinnerBg?: string;
}

function Spinner({ bg }: { bg: string }) {
  return (
    <div className={`flex min-h-screen items-center justify-center ${bg}`}>
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-300 border-t-transparent" />
    </div>
  );
}

export function RoleGuard({
  allowedRoles,
  children,
  spinnerBg = "bg-slate-50",
}: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // ADMIN her panele erişebilir (superuser)
  const hasAccess = !!user && (user.role === "ADMIN" || allowedRoles.includes(user.role));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (getTokenPayloadFromStorage()?.force_password_change) {
      window.location.href = "/password-reset";
      return;
    }
    if (!hasAccess) {
      window.location.href = "/403";
    }
  }, [isLoading, isAuthenticated, hasAccess]);

  if (isLoading) return <Spinner bg={spinnerBg} />;
  if (!isAuthenticated || !user || !hasAccess) {
    return <Spinner bg={spinnerBg} />;
  }

  return <>{children}</>;
}

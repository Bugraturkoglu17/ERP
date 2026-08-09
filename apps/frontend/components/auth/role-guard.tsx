"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/permissions";

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

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (!allowedRoles.includes(user!.role)) {
      window.location.href = "/403";
    }
  }, [isLoading, isAuthenticated, user, allowedRoles]);

  if (isLoading) return <Spinner bg={spinnerBg} />;
  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return <Spinner bg={spinnerBg} />;
  }

  return <>{children}</>;
}

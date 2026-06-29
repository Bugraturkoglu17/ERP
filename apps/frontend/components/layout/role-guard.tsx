"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTokenPayloadFromStorage, getRoles } from "@/lib/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      router.replace("/login");
      return;
    }
    const roles = getRoles(payload);
    const isAuthorized = roles.some(r => allowedRoles.includes(r));
    if (!isAuthorized) {
      router.replace("/"); // Redirect to dashboard / home
      return;
    }
    setAuthorized(true);
  }, [router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="flex min-h-[380px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

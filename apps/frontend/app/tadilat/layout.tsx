"use client";

import { RoleGuard } from "@/components/layout/role-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["admin", "saha_muhendisi", "operasyon", "yonetici"]}>
      {children}
    </RoleGuard>
  );
}

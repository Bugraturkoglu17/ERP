"use client";

import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
} from "lucide-react";
import { CorporateShell, type CorporateNavItem } from "@/components/layout/corporate-shell";

const NAV: CorporateNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/roles", label: "Roller & Yetkiler", icon: Shield },
  { href: "/admin/settings", label: "Sistem Ayarları", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <CorporateShell
      allowedRoles={["ADMIN"]}
      monogram="A"
      title="Admin Paneli"
      navItems={NAV}
      headerLabel="Sistem Yönetimi"
    >
      {children}
    </CorporateShell>
  );
}

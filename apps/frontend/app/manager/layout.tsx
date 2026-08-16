"use client";

import {
  LayoutDashboard,
  ClipboardList,
  Store,
  Archive,
  Users,
} from "lucide-react";
import { CorporateShell, type CorporateNavItem } from "@/components/layout/corporate-shell";

const NAV: CorporateNavItem[] = [
  { href: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
  { href: "/manager/magaza-karti", label: "Mağaza Kartı", icon: Store },
  { href: "/manager/genel-arsiv", label: "Genel Arşiv", icon: Archive },
  { href: "/manager/kullanicilar", label: "Kullanıcılar", icon: Users },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CorporateShell
      allowedRoles={["MANAGER"]}
      monogram="Y"
      title="Yönetici Paneli"
      navItems={NAV}
      headerLabel="Operasyon Yönetimi"
    >
      {children}
    </CorporateShell>
  );
}

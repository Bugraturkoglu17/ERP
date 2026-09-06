"use client";

import {
  LayoutDashboard,
  ClipboardList,
  Store,
  Archive,
  BarChart3,
  Users,
} from "lucide-react";
import { CorporateShell, type CorporateNavItem } from "@/components/layout/corporate-shell";

const NAV: CorporateNavItem[] = [
  { href: "/manager/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/manager/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
  { href: "/manager/magaza-karti", label: "Mağaza Kartı", icon: Store },
  { href: "/manager/genel-arsiv", label: "Genel Arşiv", icon: Archive },
  { href: "/manager/kullanicilar", label: "Kullanıcılar", icon: Users },
  { href: "/manager/raporlar", label: "Raporlar", icon: BarChart3 },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CorporateShell
      allowedRoles={["MANAGER"]}
      brandTone="red"
      title="Yönetici Paneli"
      navItems={NAV}
      headerLabel="Operasyon Yönetimi"
    >
      {children}
    </CorporateShell>
  );
}

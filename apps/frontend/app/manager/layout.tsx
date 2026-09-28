"use client";

import {
  LayoutDashboard,
  ClipboardList,
  Store,
  Archive,
  BarChart3,
  Users,
  DatabaseBackup,
} from "lucide-react";
import { CorporateShell, type CorporateNavItem } from "@/components/layout/corporate-shell";
import { useAuth } from "@/contexts/auth-context";

const BASE_NAV: CorporateNavItem[] = [
  { href: "/manager/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/manager/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
  { href: "/manager/magaza-karti", label: "Mağaza Kartı", icon: Store },
  { href: "/manager/genel-arsiv", label: "Genel Arşiv", icon: Archive },
  { href: "/manager/kullanicilar", label: "Kullanıcılar", icon: Users },
  { href: "/manager/raporlar", label: "Raporlar", icon: BarChart3 },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // "Sistem Yedeği" yalnızca GERÇEK Yönetici (MANAGER) rolüne gösterilir.
  // platform_admin ("Geliştirici Admin") /manager/* panelini görüntüleyebilir
  // (RoleGuard'ın superuser bypass'ı) ama bu özelliği kullanamaz — backend
  // require_manager_only() ile platform_admin'i de 403'ler; buton da hiç
  // görünmemeli (istek maddesi: "ADMIN: Yedekleme butonunu görmemeli").
  const navItems: CorporateNavItem[] =
    user?.role === "MANAGER"
      ? [...BASE_NAV, { href: "/manager/sistem-yedegi", label: "Sistem Yedeği", icon: DatabaseBackup }]
      : BASE_NAV;

  return (
    <CorporateShell
      allowedRoles={["MANAGER"]}
      brandTone="red"
      title="Yönetici Paneli"
      navItems={navItems}
      headerLabel="Operasyon Yönetimi"
    >
      {children}
    </CorporateShell>
  );
}

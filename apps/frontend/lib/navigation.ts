import { 
  LayoutDashboard, 
  FolderTree, 
  Warehouse, 
  CircleDollarSign, 
  Users, 
  Settings, 
  FileText,
  Building2,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  allowedRoles?: string[];
  platformNav?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Operasyon Panosu",
    href: "/",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici", "depo_sorumlusu"],
    platformNav: true,
  },
  {
    label: "Projeler",
    href: "/projects",
    icon: FolderTree,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici"],
  },
  {
    label: "Depo & Stok",
    href: "/inventory",
    icon: Warehouse,
    allowedRoles: ["admin", "depo_sorumlusu"],
  },
  {
    label: "Finans",
    href: "/finance",
    icon: CircleDollarSign,
    allowedRoles: ["admin"],
  },
  {
    label: "Dokümanlar",
    href: "/documents",
    icon: FileText,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici"],
  },
  {
    label: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
    allowedRoles: ["admin"],
  },
  {
    label: "Platform Dashboard",
    href: "/platform",
    icon: LayoutDashboard,
    allowedRoles: ["platform_admin"],
    platformNav: true,
  },
  {
    label: "Platform Firma",
    href: "/platform/firmalar",
    icon: Building2,
    allowedRoles: ["platform_admin"],
    platformNav: true,
  },
  {
    label: "Ayarlar",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["admin", "platform_admin"],
    platformNav: true,
  },
];

export function getVisibleNavItems(roles: string[]): NavItem[] {
  const isPlatform = roles.includes("platform_admin");

  return NAV_ITEMS.filter((item) => {
    if (isPlatform) {
      if (!item.platformNav) return false;
      return !item.allowedRoles || item.allowedRoles.includes("platform_admin");
    }

    if (!item.allowedRoles || item.allowedRoles.length === 0) {
      return true;
    }
    return item.allowedRoles.some((role) => roles.includes(role));
  });
}

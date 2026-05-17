import { 
  LayoutDashboard, 
  FolderTree, 
  Warehouse, 
  CircleDollarSign, 
  Users, 
  Settings, 
  FileText 
} from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Operasyon Panosu",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Projeler",
    href: "/projects",
    icon: FolderTree,
  },
  {
    label: "Depo & Stok",
    href: "/inventory",
    icon: Warehouse,
  },
  {
    label: "Finans",
    href: "/finance",
    icon: CircleDollarSign,
  },
  {
    label: "Dokümanlar",
    href: "/documents",
    icon: FileText,
  },
  {
    label: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Ayarlar",
    href: "/settings",
    icon: Settings,
  },
];

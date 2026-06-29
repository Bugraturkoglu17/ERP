import {
  LayoutDashboard,
  Store,
  Wrench,
  HardHat,
  Building2,
  CheckCircle,
  GitCommit,
  Receipt,
  Users,
  FileText,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";


export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles?: string[];
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  href: string;
  allowedRoles?: string[];
  items: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry && Array.isArray((entry as NavGroup).items);
}

export const NAV_ENTRIES: NavEntry[] = [
  {
    label: "Genel Bakış",
    href: "/",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici"],
  },
  {
    label: "Mağaza Arşivi",
    href: "/projects",
    icon: Store,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici"],
  },

  // ── İş Emirleri ────────────────────────────────────────────────────────────
  {
    label: "İş Emirleri",
    href: "/is-emirleri",
    icon: ClipboardList,
    allowedRoles: ["admin", "saha_muhendisi"],
  },

  // ── Bakım & Onarım ─────────────────────────────────────────────────────────
  {
    label: "Bakım & Onarım",
    href: "/bakim",
    icon: Wrench,
    allowedRoles: ["admin", "saha_muhendisi"],
    items: [
      { label: "Bakım Mağazaları",   href: "/bakim",                  icon: Store,         allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Servis Formları",    href: "/bakim/servis-formlari",  icon: FileText,      allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Bakım Faturaları",   href: "/bakim/faturalar",        icon: Receipt,       allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Bakım Hakkedişleri", href: "/bakim/hakkedisler",      icon: Receipt,       allowedRoles: ["admin", "saha_muhendisi"] },
    ],
  },

  // ── Tadilat ────────────────────────────────────────────────────────────────
  {
    label: "Tadilat",
    href: "/tadilat",
    icon: HardHat,
    allowedRoles: ["admin", "saha_muhendisi"],
    items: [
      { label: "Aktif Tadilatlar",      href: "/tadilat",                        icon: HardHat,     allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Tamamlanan Tadilatlar", href: "/tadilat/tamamlanan",             icon: CheckCircle, allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Tadilat Süreçleri",     href: "/tadilat/surecleri",              icon: GitCommit,   allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Tadilat Dosyaları",     href: "/tadilat/dosyalar",               icon: FileText,    allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Tadilat Hakedişleri",   href: "/tadilat/hakkedisler",            icon: Receipt,     allowedRoles: ["admin", "saha_muhendisi"] },
    ],
  },

  // ── Yeni Yapım ─────────────────────────────────────────────────────────────
  {
    label: "Yeni Yapım",
    href: "/yeni-yapim",
    icon: Building2,
    allowedRoles: ["admin", "saha_muhendisi"],
    items: [
      { label: "Yeni Yapım İşleri",      href: "/yeni-yapim",                      icon: Building2,   allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Yeni Yapım Süreçleri",   href: "/yeni-yapim/surecleri",             icon: GitCommit,   allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Yapılacak İşler",        href: "/yeni-yapim/isler",                 icon: FileText,    allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Teklifler",              href: "/yeni-yapim/teklifler",             icon: FileText,    allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Yeni Yapım Hakedişleri", href: "/yeni-yapim/hakkedisler",           icon: Receipt,     allowedRoles: ["admin", "saha_muhendisi"] },
    ],
  },

  // ── Onay Süreçleri ─────────────────────────────────────────────────────────
  {
    label: "Onay Süreçleri",
    href: "/onay-surecleri",
    icon: CheckCircle,
    allowedRoles: ["admin", "saha_muhendisi"],
    items: [
      { label: "Tümü",                  href: "/onay-surecleri",                       icon: CheckCircle, allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Hakkediş Onayı",        href: "/onay-surecleri?tip=hakkediş",          icon: Receipt,     allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Fatura Onayı",          href: "/onay-surecleri?tip=fatura",            icon: Receipt,     allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Proje Onayı",           href: "/onay-surecleri?tip=proje",             icon: FileText,    allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "Teklif Onayı",          href: "/onay-surecleri?tip=teklif",            icon: FileText,    allowedRoles: ["admin", "saha_muhendisi"] },
      { label: "İş Tamamlandı Onayı",   href: "/onay-surecleri?tip=is_tamamlandi",    icon: CheckCircle, allowedRoles: ["admin", "saha_muhendisi"] },
    ],
  },

  // ── Düz linkler ────────────────────────────────────────────────────────────
  {
    label: "Faturalar / Hakkedişler",
    href: "/hakkedisler",
    icon: Receipt,
    allowedRoles: ["admin", "saha_muhendisi"],
  },
  {
    label: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
    allowedRoles: ["admin"],
  },
];

// ── Legacy flat list (backward compat for SmartSearch etc.) ──────────────────
export const NAV_ITEMS: NavItem[] = NAV_ENTRIES.flatMap((e) =>
  isNavGroup(e) ? e.items : [e]
);

export type NavItemCompat = NavItem;

// ── Filter by roles ───────────────────────────────────────────────────────────
function roleMatch(roles: string[], allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.some((r) => roles.includes(r));
}

export function getVisibleNavEntries(roles: string[]): NavEntry[] {
  if (roles.includes("platform_admin")) return [];
  return NAV_ENTRIES.filter((e) => roleMatch(roles, e.allowedRoles)).map((e) => {
    if (isNavGroup(e)) {
      return { ...e, items: e.items.filter((i) => roleMatch(roles, i.allowedRoles)) };
    }
    return e;
  });
}

// ── Legacy compat ─────────────────────────────────────────────────────────────
export function getVisibleNavItems(roles: string[]): NavItem[] {
  if (roles.includes("platform_admin")) return [];
  return NAV_ITEMS.filter((i) => roleMatch(roles, i.allowedRoles));
}

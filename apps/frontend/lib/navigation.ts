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
  CreditCard,
  Cpu,
  History,
  Workflow,
  type LucideIcon,
} from "lucide-react";


export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles?: string[];
  exact?: boolean;
  context?: "platform" | "tenant" | "both";
  moduleKey?: string;
  featureKey?: string;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  href: string;
  allowedRoles?: string[];
  exact?: boolean;
  context?: "platform" | "tenant" | "both";
  moduleKey?: string;
  featureKey?: string;
  items: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry && Array.isArray((entry as NavGroup).items);
}

export type NavigationEntitlements = {
  modules?: string[];
  features?: string[];
};

export type RegistryOption = {
  id: string;
  label: string;
  category: "core" | "professional" | "enterprise" | "ai" | "automation" | "integration" | "marketplace" | "industry_pack";
  planTier: "core" | "professional" | "enterprise";
  description: string;
};

export const MODULE_REGISTRY_V2: RegistryOption[] = [
  { id: "projects", label: "Projects / Store Archive", category: "core", planTier: "core", description: "Müşteri, bölge, şube ve proje omurgası." },
  { id: "work_orders", label: "Work Orders", category: "professional", planTier: "professional", description: "Saha iş emirleri, public link ve operasyon takibi." },
  { id: "documents", label: "Documents", category: "core", planTier: "core", description: "Doküman yükleme, indirme ve proje dosyaları." },
  { id: "approvals", label: "Approvals", category: "professional", planTier: "professional", description: "Hakediş, fatura, proje ve iş onayları." },
  { id: "finance", label: "Finance", category: "professional", planTier: "professional", description: "Fatura, hakediş, ödeme ve karlılık altyapısı." },
  { id: "inventory", label: "Inventory", category: "enterprise", planTier: "enterprise", description: "Depo, stok, malzeme ve transfer yönetimi." },
  { id: "procurement", label: "Procurement", category: "enterprise", planTier: "enterprise", description: "Tedarikçi, satın alma talebi ve sipariş yönetimi." },
  { id: "field_reports", label: "Field Reports", category: "professional", planTier: "professional", description: "Günlük/haftalık saha raporları." },
  { id: "whatsapp", label: "WhatsApp Integration", category: "integration", planTier: "professional", description: "WhatsApp template, webhook ve teslimat takibi." },
  { id: "workflow", label: "Workflow Foundation", category: "automation", planTier: "enterprise", description: "Sprint 18 sonrası Workflow Studio için temel yetkilendirme." },
  { id: "ai", label: "AI Foundation", category: "ai", planTier: "enterprise", description: "Sprint 19 AI Pack için token ve feature zemini." },
  { id: "notifications", label: "Notifications", category: "core", planTier: "core", description: "In-app ve e-posta bildirim omurgası." },
  { id: "users", label: "Users & RBAC", category: "core", planTier: "core", description: "Tenant kullanıcı ve rol yönetimi." },
];

export const FEATURE_REGISTRY_V2: RegistryOption[] = [
  { id: "workflow.studio", label: "Workflow Studio", category: "automation", planTier: "enterprise", description: "Workflow Studio entitlement flag'i; ürün henüz eklenmez." },
  { id: "ai.assistant", label: "AI Assistant", category: "ai", planTier: "enterprise", description: "AI Pack entitlement flag'i; ürün henüz eklenmez." },
  { id: "whatsapp.templates", label: "WhatsApp Templates", category: "integration", planTier: "professional", description: "Tenant bazlı WhatsApp template kullanımı." },
  { id: "whatsapp.notifications", label: "WhatsApp Notifications", category: "integration", planTier: "professional", description: "İş emri WhatsApp bildirim gönderimi." },
  { id: "finance.cashflow", label: "Finance Cashflow", category: "professional", planTier: "professional", description: "Nakit akış görünümü." },
  { id: "documents.versioning", label: "Document Versioning", category: "core", planTier: "core", description: "Doküman versiyonlama." },
  { id: "inventory.low_stock_alerts", label: "Low Stock Alerts", category: "enterprise", planTier: "enterprise", description: "Kritik stok uyarıları." },
  { id: "procurement.po_receive", label: "PO Receive", category: "enterprise", planTier: "enterprise", description: "Satın alma teslim alma ve stok giriş entegrasyonu." },
  { id: "platform.support_context", label: "Support Context", category: "enterprise", planTier: "enterprise", description: "Platform admin tenant destek oturumu." },
  { id: "marketplace.install", label: "Marketplace Install", category: "marketplace", planTier: "enterprise", description: "Marketplace paket kurulum yetkisi." },
];

export const QUOTA_REGISTRY_V2 = [
  { id: "users", label: "Users", defaultLimit: 10 },
  { id: "storage_gb", label: "Storage GB", defaultLimit: 5 },
  { id: "whatsapp_messages", label: "WhatsApp / Month", defaultLimit: 500 },
  { id: "ai_tokens", label: "AI Tokens / Month", defaultLimit: 0 },
  { id: "projects", label: "Projects", defaultLimit: 100 },
  { id: "documents", label: "Documents", defaultLimit: 10000 },
  { id: "work_orders", label: "Work Orders / Month", defaultLimit: 1000 },
];

export const NAV_ENTRIES: NavEntry[] = [
  // ── Platform Yönetimi ──────────────────────────────────────────────────────
  {
    label: "Platform Dashboard",
    href: "/platform",
    icon: LayoutDashboard,
    allowedRoles: ["platform_admin"],
    exact: true,
    context: "platform",
  },
  {
    label: "Firmalar",
    href: "/platform/firmalar",
    icon: Building2,
    allowedRoles: ["platform_admin"],
    context: "platform",
  },
  {
    label: "Planlar",
    href: "/platform/plans",
    icon: CreditCard,
    allowedRoles: ["platform_admin"],
    context: "platform",
  },
  {
    label: "Sistem Modülleri",
    href: "/platform/system",
    icon: Cpu,
    allowedRoles: ["platform_admin"],
    context: "platform",
  },
  {
    label: "Audit Log",
    href: "/platform/audit",
    icon: History,
    allowedRoles: ["platform_admin"],
    context: "platform",
  },

  // ── Tenant Operasyonları ───────────────────────────────────────────────────
  {
    label: "Workflow Studio",
    href: "/workflow",
    icon: Workflow,
    allowedRoles: ["admin"],
    context: "tenant",
    moduleKey: "workflow",
    featureKey: "workflow.studio",
  },
  {
    label: "Genel Bakış",
    href: "/",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici"],
    context: "tenant",
    moduleKey: "projects",
  },
  {
    label: "Mağaza Arşivi",
    href: "/projects",
    icon: Store,
    allowedRoles: ["admin", "saha_muhendisi", "musteri_kullanici"],
    context: "tenant",
    moduleKey: "projects",
  },

  // ── İş Emirleri ────────────────────────────────────────────────────────────
  {
    label: "İş Emirleri",
    href: "/is-emirleri",
    icon: ClipboardList,
    allowedRoles: ["admin", "saha_muhendisi"],
    context: "tenant",
    moduleKey: "work_orders",
  },

  // ── Bakım & Onarım ─────────────────────────────────────────────────────────
  {
    label: "Bakım & Onarım",
    href: "/bakim",
    icon: Wrench,
    allowedRoles: ["admin", "saha_muhendisi"],
    context: "tenant",
    moduleKey: "work_orders",
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
    context: "tenant",
    moduleKey: "work_orders",
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
    context: "tenant",
    moduleKey: "approvals",
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
    context: "tenant",
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
    href: "/finance",
    icon: Receipt,
    allowedRoles: ["admin", "saha_muhendisi"],
    context: "tenant",
    moduleKey: "finance",
  },
  {
    label: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
    allowedRoles: ["admin"],
    context: "tenant",
    moduleKey: "users",
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

function entitlementMatch(entry: NavItem | NavGroup, entitlements?: NavigationEntitlements): boolean {
  if (!entitlements) return true;
  if ((entry.context || "both") === "platform") return true;
  if (entry.moduleKey && entitlements.modules && !entitlements.modules.includes(entry.moduleKey)) return false;
  if (entry.featureKey && entitlements.features && !entitlements.features.includes(entry.featureKey)) return false;
  return true;
}

export function getVisibleNavEntries(
  roles: string[],
  isPlatformAdminUser: boolean = false,
  hasTenantContext: boolean = false,
  entitlements?: NavigationEntitlements
): NavEntry[] {
  return NAV_ENTRIES.filter((e) => {
    if (!roleMatch(roles, e.allowedRoles)) return false;
    if (!entitlementMatch(e, entitlements)) return false;
    
    const itemCtx = e.context || "both";
    if (isPlatformAdminUser) {
      if (hasTenantContext && itemCtx === "platform") return false;
      if (!hasTenantContext && itemCtx === "tenant") return false;
    } else {
      if (itemCtx === "platform") return false;
    }
    return true;
  }).map((e) => {
    if (isNavGroup(e)) {
      return {
        ...e,
        items: e.items.filter((i) => {
          if (!roleMatch(roles, i.allowedRoles)) return false;
          if (!entitlementMatch(i, entitlements)) return false;
          
          const subItemCtx = i.context || "both";
          if (isPlatformAdminUser) {
            if (hasTenantContext && subItemCtx === "platform") return false;
            if (!hasTenantContext && subItemCtx === "tenant") return false;
          } else {
            if (subItemCtx === "platform") return false;
          }
          return true;
        }),
      };
    }
    return e;
  });
}

// ── Legacy compat ─────────────────────────────────────────────────────────────
export function getVisibleNavItems(roles: string[]): NavItem[] {
  return NAV_ITEMS.filter((i) => roleMatch(roles, i.allowedRoles));
}

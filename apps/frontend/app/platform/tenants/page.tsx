"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";
import { FEATURE_REGISTRY_V2, MODULE_REGISTRY_V2, QUOTA_REGISTRY_V2 } from "@/lib/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Filter,
  History,
  KeyRound,
  Lock,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
  XCircle,
  Mail,
  Sliders,
  Settings,
  Cpu,
  FileText,
  User,
  Trash2,
  ChevronRight,
  Sparkles
} from "lucide-react";

type Firma = {
  id: string;
  name: string;
  code: string;
  logo_url?: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
};

type FirmaAyar = {
  tenant_id: string;
  tax_no?: string | null;
  sector?: string | null;
  country?: string | null;
  theme_color?: string | null;
  domain?: string | null;
  subdomain?: string | null;
  email_mode?: "platform" | "tenant_domain" | null;
  from_name?: string | null;
  from_email?: string | null;
  reply_to?: string | null;
  email_domain_verified?: boolean | null;
  email_provider_identity_id?: string | null;
  email_branding?: {
    logo_url?: string;
    color?: string;
    footer?: string;
  } | null;
  updated_at: string;
};

type FirmaYoneticisi = {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  force_password_change: boolean;
};

type Plan = {
  id: string;
  code: string;
  name: string;
  max_users: number;
  storage_limit_gb: number;
  modules: string[];
  features?: string[];
  quotas?: Record<string, number>;
  is_active: boolean;
  created_at: string;
};

type Lisans = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  overrides?: Record<string, unknown>;
  starts_at: string;
  ends_at?: string | null;
};

type Audit = {
  id: string;
  actor_user_id: string;
  action: string;
  tenant_id?: string | null;
  target_user_id?: string | null;
  details?: string | null;
  created_at: string;
};

type TenantEntitlement = {
  modules: string[];
  features: string[];
  quotas: Record<string, number>;
  usage?: Record<string, { quantity?: number; limit?: number; period_key?: string }>;
  entitlement_source?: {
    plan?: Record<string, unknown> | null;
    subscription_override?: Record<string, unknown>;
    tenant_override?: Array<Record<string, unknown>>;
    marketplace_install?: Array<Record<string, unknown>>;
  };
};

type ConfirmState = {
  open: boolean;
  title: string;
  detail: string;
  action: () => Promise<void>;
};

const TABS = ["firmalar", "yoneticiler", "lisans", "audit"] as const;
type TabKey = (typeof TABS)[number];

const STATUS_LABELS: Record<string, string> = {
  trial: "Deneme",
  active: "Aktif",
  suspended: "Askıda",
  archived: "Arşiv",
};

const STATUS_BADGE: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700 border-blue-150",
  active: "bg-emerald-50 text-emerald-700 border-emerald-150",
  suspended: "bg-amber-50 text-amber-700 border-amber-150",
  archived: "bg-slate-100 text-slate-700 border-slate-200",
};

function statusText(value: string): string {
  const key = value.toLowerCase();
  return STATUS_LABELS[key] || value;
}

function statusBadge(value: string): string {
  const key = value.toLowerCase();
  return STATUS_BADGE[key] || "bg-slate-50 text-slate-705 border-slate-200";
}

function randomPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 animate-pulse" />
          <div>
            <h3 className="text-base font-bold text-slate-900">{state.title}</h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{state.detail}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Vazgeç
          </button>
          <button
            onClick={async () => {
              await state.action();
              onClose();
            }}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}

const renderAuditDetails = (detailsStr: string | null | undefined) => {
  if (!detailsStr) return null;
  try {
    const parsed = JSON.parse(detailsStr);
    return (
      <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-100 pt-1 leading-normal font-mono bg-slate-50/50 p-2 rounded">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key} className="truncate">
            <span className="font-bold text-slate-700">{key}:</span>{" "}
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </div>
        ))}
      </div>
    );
  } catch {
    return (
      <p className="text-[10px] text-slate-500 break-words mt-1 border-t border-slate-100 pt-1 leading-normal font-semibold font-mono">
        {detailsStr}
      </p>
    );
  }
};

function PlatformTenantsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [tab, setTab] = useState<TabKey>("firmalar");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [selectedFirmaId, setSelectedFirmaId] = useState("");
  const [selectedFirmaTab, setSelectedFirmaTab] = useState<"bilgiler" | "yoneticiler" | "lisans" | "entegrasyonlar" | "audit">("bilgiler");

  const [firmaAyar, setFirmaAyar] = useState<FirmaAyar | null>(null);
  const [firmaYoneticileri, setFirmaYoneticileri] = useState<FirmaYoneticisi[]>([]);
  const [planlar, setPlanlar] = useState<Plan[]>([]);
  const [lisanslar, setLisanslar] = useState<Lisans[]>([]);
  const [tenantEntitlement, setTenantEntitlement] = useState<TenantEntitlement | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);

  const [firmaForm, setFirmaForm] = useState({
    name: "",
    code: "",
    logo_url: "",
    tax_no: "",
    sector: "",
    country: "",
    theme_color: "",
    domain: "",
    subdomain: "",
  });
  const [firmaDuzenleForm, setFirmaDuzenleForm] = useState({ name: "", code: "", logo_url: "" });
  const [yasamForm, setYasamForm] = useState({ status: "trial", is_active: true, reason: "" });
  const [ayarForm, setAyarForm] = useState({
    tax_no: "",
    sector: "",
    country: "",
    theme_color: "",
    domain: "",
    subdomain: "",
    email_mode: "platform" as "platform" | "tenant_domain",
    from_name: "",
    from_email: "",
    reply_to: "",
    email_domain_verified: false,
    email_provider_identity_id: "",
    branding_logo_url: "",
    branding_color: "",
    branding_footer: "",
  });
  const [yoneticiForm, setYoneticiForm] = useState({ full_name: "", email: "", temporary_password: "" });
  const [resetForm, setResetForm] = useState({
    admin_user_id: "",
    temporary_password: "",
    force_password_change: true,
    reason: "",
  });
  const [planForm, setPlanForm] = useState({
    code: "",
    name: "",
    max_users: 10,
    storage_limit_gb: 5,
    modules: ["projects", "documents", "notifications", "work_orders", "finance"] as string[],
    features: ["documents.versioning", "finance.cashflow"] as string[],
    quotas: Object.fromEntries(QUOTA_REGISTRY_V2.map((q) => [q.id, q.defaultLimit])) as Record<string, number>,
  });
  const [atamaForm, setAtamaForm] = useState({ plan_id: "", status: "active", ends_at: "", overridesJson: "{}" });

  const [searchFirma, setSearchFirma] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditTextFilter, setAuditTextFilter] = useState("");

  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: "", detail: "", action: async () => {} });
  const [rightPanelMode, setRightPanelMode] = useState<"detail" | "create">("detail");
  const [editingAdminId, setEditingAdminId] = useState("");
  const [editingAdminForm, setEditingAdminForm] = useState({ full_name: "", force_password_change: false, is_active: true });

  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextMode, setContextMode] = useState<"read_only" | "support_write">("read_only");
  const [contextReason, setContextReason] = useState("");
  const [contextTicketRef, setContextTicketRef] = useState("");

  const [toasts, setToasts] = useState<Array<{ id: number; type: "ok" | "err"; text: string }>>([]);
  const toastCounterRef = useRef(1);

  const pushToast = (type: "ok" | "err", text: string) => {
    const id = toastCounterRef.current;
    toastCounterRef.current += 1;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const selectedFirma = useMemo(() => firmalar.find((f) => f.id === selectedFirmaId) || null, [firmalar, selectedFirmaId]);

  const filteredFirmalar = useMemo(() => {
    return firmalar.filter((f) => {
      const term = searchFirma.toLowerCase();
      const passText = f.name.toLowerCase().includes(term) || f.code.toLowerCase().includes(term);
      const passStatus = statusFilter === "all" || f.status.toLowerCase() === statusFilter;
      return passText && passStatus;
    });
  }, [firmalar, searchFirma, statusFilter]);

  const selectedPlan = useMemo(() => planlar.find((p) => p.id === atamaForm.plan_id) || null, [planlar, atamaForm.plan_id]);

  const aktifLisans = useMemo(() => {
    if (!lisanslar.length) return null;
    return lisanslar[0];
  }, [lisanslar]);

  const aktifPlan = useMemo(() => {
    if (!aktifLisans) return null;
    return planlar.find((p) => p.id === aktifLisans.plan_id) || null;
  }, [aktifLisans, planlar]);

  const auditActions = useMemo(() => {
    const setValues = new Set(audit.map((x) => x.action));
    return Array.from(setValues).sort();
  }, [audit]);

  const filteredAudit = useMemo(() => {
    return audit.filter((row) => {
      const passAction = auditActionFilter === "all" || row.action === auditActionFilter;
      const text = `${row.action} ${row.details || ""} ${row.actor_user_id}`.toLowerCase();
      const passText = text.includes(auditTextFilter.toLowerCase());
      return passAction && passText;
    });
  }, [audit, auditActionFilter, auditTextFilter]);

  const filteredTenantAudit = useMemo(() => {
    return audit.filter((row) => row.tenant_id === selectedFirmaId);
  }, [audit, selectedFirmaId]);

  const metrik = useMemo(() => {
    const adminSayisi = firmaYoneticileri.filter((u) => u.is_active).length;
    const limit = aktifPlan?.max_users || 0;
    const oran = limit > 0 ? Math.min(100, Math.round((adminSayisi / limit) * 100)) : 0;
    return { adminSayisi, limit, oran };
  }, [firmaYoneticileri, aktifPlan]);

  const togglePlanModule = (moduleId: string) => {
    setPlanForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter((id) => id !== moduleId)
        : [...prev.modules, moduleId],
    }));
  };

  const togglePlanFeature = (featureId: string) => {
    setPlanForm((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((id) => id !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const updatePlanQuota = (quotaId: string, value: number) => {
    setPlanForm((prev) => ({
      ...prev,
      quotas: { ...prev.quotas, [quotaId]: value },
      max_users: quotaId === "users" ? value : prev.max_users,
      storage_limit_gb: quotaId === "storage_gb" ? value : prev.storage_limit_gb,
    }));
  };

  const loadCore = async () => {
    const [firmaRows, planRows, auditRows] = await Promise.all([
      apiGet<Firma[]>("/platform/tenants"),
      apiGet<Plan[]>("/platform/plans"),
      apiGet<Audit[]>("/platform/audit"),
    ]);
    setFirmalar(Array.isArray(firmaRows) ? firmaRows : []);
    setPlanlar(Array.isArray(planRows) ? planRows : []);
    setAudit(Array.isArray(auditRows) ? auditRows : []);
  };

  const loadFirmaScope = async (firmaId: string) => {
    if (!firmaId) return;
    const [ayar, yoneticiler, abonelik, entitlement, usage] = await Promise.all([
      apiGet<FirmaAyar>(`/platform/tenants/${firmaId}/settings`),
      apiGet<FirmaYoneticisi[]>(`/platform/tenants/${firmaId}/admins`),
      apiGet<Lisans[]>("/platform/subscriptions", { tenant_id: firmaId }),
      apiGet<TenantEntitlement>(`/platform/tenants/${firmaId}/entitlements`).catch(() => null),
      apiGet<any>(`/platform/tenants/${firmaId}/usage`).catch(() => null),
    ]);
    setFirmaAyar(ayar);
    setAyarForm({
      tax_no: ayar?.tax_no || "",
      sector: ayar?.sector || "",
      country: ayar?.country || "",
      theme_color: ayar?.theme_color || "",
      domain: ayar?.domain || "",
      subdomain: ayar?.subdomain || "",
      email_mode: (ayar?.email_mode as "platform" | "tenant_domain") || "platform",
      from_name: ayar?.from_name || "",
      from_email: ayar?.from_email || "",
      reply_to: ayar?.reply_to || "",
      email_domain_verified: Boolean(ayar?.email_domain_verified),
      email_provider_identity_id: ayar?.email_provider_identity_id || "",
      branding_logo_url: ayar?.email_branding?.logo_url || "",
      branding_color: ayar?.email_branding?.color || "",
      branding_footer: ayar?.email_branding?.footer || "",
    });
    setFirmaYoneticileri(Array.isArray(yoneticiler) ? yoneticiler : []);
    setLisanslar(Array.isArray(abonelik) ? abonelik : []);
    setTenantEntitlement(entitlement ? { ...entitlement, usage: usage?.usage || {} } : null);
  };

  // Route path tab synchronization
  useEffect(() => {
    if (pathname.includes("/plans")) {
      setTab("lisans");
    } else if (pathname.includes("/audit")) {
      setTab("audit");
    } else if (pathname.includes("/firmalar") || pathname.includes("/tenants")) {
      setTab("firmalar");
    }
  }, [pathname]);

  const handleTabChange = (key: TabKey) => {
    setTab(key);
    if (key === "lisans") {
      router.push("/platform/plans");
    } else if (key === "audit") {
      router.push("/platform/audit");
    } else if (key === "firmalar") {
      router.push("/platform/firmalar");
    }
  };

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      router.replace("/login");
      return;
    }
    if (!isPlatformAdmin(payload)) {
      router.replace("/");
      return;
    }

    setAuthorized(true);
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadCore();
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Platform verileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedFirmaId) return;
    (async () => {
      try {
        await loadFirmaScope(selectedFirmaId);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Firma detayları yüklenemedi.");
      }
    })();
  }, [selectedFirmaId]);

  useEffect(() => {
    if (!selectedFirma) {
      setFirmaDuzenleForm({ name: "", code: "", logo_url: "" });
      return;
    }
    setFirmaDuzenleForm({
      name: selectedFirma.name || "",
      code: selectedFirma.code || "",
      logo_url: selectedFirma.logo_url || "",
    });
    setYasamForm({
      status: selectedFirma.status,
      is_active: selectedFirma.is_active,
      reason: "",
    });
  }, [selectedFirma]);

  useEffect(() => {
    setResetForm((prev) => {
      const currentValid = prev.admin_user_id && firmaYoneticileri.some((admin) => admin.id === prev.admin_user_id);
      if (currentValid) return prev;
      return {
        ...prev,
        admin_user_id: firmaYoneticileri[0]?.id || "",
      };
    });
  }, [firmaYoneticileri]);

  const createFirma = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await apiPost<Firma>("/platform/tenants", {
        name: firmaForm.name.trim(),
        code: firmaForm.code.trim().toLowerCase(),
        logo_url: firmaForm.logo_url.trim() || null,
      });
      if (created?.id) {
        await apiPut(`/platform/tenants/${created.id}/settings`, {
          tax_no: firmaForm.tax_no.trim() || null,
          sector: firmaForm.sector.trim() || null,
          country: firmaForm.country.trim() || null,
          theme_color: firmaForm.theme_color.trim() || null,
          domain: firmaForm.domain.trim() || null,
          subdomain: firmaForm.subdomain.trim() || null,
        });
      }
      setFirmaForm({
        name: "",
        code: "",
        logo_url: "",
        tax_no: "",
        sector: "",
        country: "",
        theme_color: "",
        domain: "",
        subdomain: "",
      });
      await loadCore();
      setSelectedFirmaId(created.id);
      setRightPanelMode("detail");
      pushToast("ok", "Firma oluşturuldu.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Firma oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  const patchFirmaYasam = async () => {
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      await apiPatch(`/platform/tenants/${selectedFirmaId}`, {
        status: yasamForm.status,
        is_active: yasamForm.is_active,
      });
      await loadCore();
      pushToast("ok", "Firma yaşam döngüsü güncellendi.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Firma güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const saveFirmaVeAyar = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFirmaId) return;
    const name = firmaDuzenleForm.name.trim();
    const code = firmaDuzenleForm.code.trim().toLowerCase();
    if (!name || !code) {
      pushToast("err", "Firma adı ve kodu zorunludur.");
      return;
    }
    setBusy(true);
    try {
      await Promise.all([
        apiPatch(`/platform/tenants/${selectedFirmaId}`, {
          name,
          code,
          logo_url: firmaDuzenleForm.logo_url.trim() || null,
        }),
        apiPut(`/platform/tenants/${selectedFirmaId}/settings`, {
          tax_no: ayarForm.tax_no,
          sector: ayarForm.sector,
          country: ayarForm.country,
          theme_color: ayarForm.theme_color,
          domain: ayarForm.domain,
          subdomain: ayarForm.subdomain,
          email_mode: ayarForm.email_mode,
          from_name: ayarForm.from_name || null,
          from_email: ayarForm.from_email || null,
          reply_to: ayarForm.reply_to || null,
          email_domain_verified: ayarForm.email_domain_verified,
          email_provider_identity_id: ayarForm.email_provider_identity_id || null,
          email_branding: {
            logo_url: ayarForm.branding_logo_url || undefined,
            color: ayarForm.branding_color || undefined,
            footer: ayarForm.branding_footer || undefined,
          },
        }),
      ]);
      await loadFirmaScope(selectedFirmaId);
      await loadCore();
      pushToast("ok", "Firma bilgileri ve ayarları kaydedildi.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Firma kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const createYonetici = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      await apiPost("/platform/tenants/provision-admin", {
        tenant_id: selectedFirmaId,
        email: yoneticiForm.email.trim().toLowerCase(),
        full_name: yoneticiForm.full_name.trim(),
        temporary_password: yoneticiForm.temporary_password,
      });
      setYoneticiForm({ full_name: "", email: "", temporary_password: "" });
      await loadFirmaScope(selectedFirmaId);
      await loadCore();
      pushToast("ok", "Firma yöneticisi oluşturuldu.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Firma yöneticisi oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  const resetYoneticiParola = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      await apiPost(`/platform/tenants/${selectedFirmaId}/reset-admin-password`, {
        admin_user_id: resetForm.admin_user_id || null,
        temporary_password: resetForm.temporary_password,
        force_password_change: resetForm.force_password_change,
      });
      setResetForm((prev) => ({
        admin_user_id: prev.admin_user_id,
        temporary_password: "",
        force_password_change: true,
        reason: "",
      }));
      await loadFirmaScope(selectedFirmaId);
      await loadCore();
      pushToast("ok", "Yönetici şifresi sıfırlandı.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Şifre sıfırlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const updateYonetici = async (
    admin: FirmaYoneticisi,
    payload: { full_name?: string; is_active?: boolean; force_password_change?: boolean },
  ) => {
    setBusy(true);
    try {
      await apiPatch(`/platform/admin-users/${admin.id}`, payload);
      if (selectedFirmaId) await loadFirmaScope(selectedFirmaId);
      await loadCore();
      pushToast("ok", "Yönetici güncellendi.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Yönetici güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const removeFirma = async () => {
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      await apiPatch(`/platform/tenants/${selectedFirmaId}`, {
        status: "archived",
        is_active: false,
      });
      await loadCore();
      await loadFirmaScope(selectedFirmaId);
      pushToast("ok", "Firma pasife alındı ve arşive taşındı.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Firma arşivleme başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const openYoneticiDuzenle = (admin: FirmaYoneticisi) => {
    setEditingAdminId(admin.id);
    setEditingAdminForm({
      full_name: admin.full_name,
      force_password_change: admin.force_password_change,
      is_active: admin.is_active,
    });
  };

  const saveYoneticiDuzenle = async (admin: FirmaYoneticisi) => {
    const fullName = editingAdminForm.full_name.trim();
    if (!fullName) {
      pushToast("err", "Ad soyad boş bırakılamaz.");
      return;
    }
    await updateYonetici(admin, {
      full_name: fullName,
      is_active: editingAdminForm.is_active,
      force_password_change: editingAdminForm.force_password_change,
    });
    setEditingAdminId("");
  };

  const createPlan = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/platform/plans", {
        code: planForm.code.trim().toLowerCase(),
        name: planForm.name.trim(),
        max_users: planForm.max_users,
        storage_limit_gb: planForm.storage_limit_gb,
        modules: planForm.modules,
        features: planForm.features,
        quotas: planForm.quotas,
      });
      setPlanForm({
        code: "",
        name: "",
        max_users: 10,
        storage_limit_gb: 5,
        modules: ["projects", "documents", "notifications", "work_orders", "finance"],
        features: ["documents.versioning", "finance.cashflow"],
        quotas: Object.fromEntries(QUOTA_REGISTRY_V2.map((q) => [q.id, q.defaultLimit])) as Record<string, number>,
      });
      await loadCore();
      pushToast("ok", "Plan oluşturuldu.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Plan oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  const assignLisans = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFirmaId || !atamaForm.plan_id) return;
    setBusy(true);
    try {
      let overrides: Record<string, unknown> = {};
      try {
        overrides = JSON.parse(atamaForm.overridesJson || "{}");
      } catch {
        pushToast("err", "Tenant override JSON geçerli değil.");
        setBusy(false);
        return;
      }
      await apiPost("/platform/subscriptions/assign", {
        tenant_id: selectedFirmaId,
        plan_id: atamaForm.plan_id,
        status: atamaForm.status,
        ends_at: atamaForm.ends_at || null,
        overrides,
      });
      await loadFirmaScope(selectedFirmaId);
      await loadCore();
      pushToast("ok", "Lisans atandı.");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Lisans atanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const toggleTenantModule = async (moduleId: string, enabled: boolean) => {
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      const entitlement = await apiPut<TenantEntitlement>(`/platform/tenants/${selectedFirmaId}/overrides`, {
        target_type: "module",
        target_id: moduleId,
        enabled,
        reason: `Platform admin quick ${enabled ? "enable" : "disable"} from tenant screen`,
      });
      setTenantEntitlement({ ...entitlement, usage: tenantEntitlement?.usage || {} });
      pushToast("ok", `${moduleId} modülü ${enabled ? "açıldı" : "kapatıldı"}.`);
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Modül yetkisi güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const toggleTenantFeature = async (featureId: string, enabled: boolean) => {
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      const entitlement = await apiPut<TenantEntitlement>(`/platform/tenants/${selectedFirmaId}/overrides`, {
        target_type: "feature",
        target_id: featureId,
        enabled,
        reason: `Platform admin quick ${enabled ? "enable" : "disable"} from tenant screen`,
      });
      setTenantEntitlement({ ...entitlement, usage: tenantEntitlement?.usage || {} });
      pushToast("ok", `${featureId} özelliği ${enabled ? "aktifleştirildi" : "kapatıldı"}.`);
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Özellik yetkisi güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const updateTenantQuota = async (quotaId: string, limitValue: number, label: string) => {
    if (!selectedFirmaId) return;
    setBusy(true);
    try {
      const entitlement = await apiPut<TenantEntitlement>(`/platform/tenants/${selectedFirmaId}/overrides`, {
        target_type: "quota",
        target_id: quotaId,
        enabled: true,
        limit_value: limitValue,
        reason: `Platform admin quick quota ${label} from tenant screen`,
      });
      setTenantEntitlement({ ...entitlement, usage: tenantEntitlement?.usage || {} });
      pushToast("ok", `${quotaId} limiti ${label}.`);
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Quota limiti güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const exportAuditCsv = () => {
    const rows = filteredAudit.map((a) => ({
      zaman: new Date(a.created_at).toISOString(),
      aksiyon: a.action,
      aktor: a.actor_user_id,
      firma: a.tenant_id || "",
      hedef: a.target_user_id || "",
      detay: (a.details || "").replace(/\n/g, " "),
    }));

    const headers = ["zaman", "aksiyon", "aktor", "firma", "hedef", "detay"];
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] || "").replace(/"/g, '""')}"`).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startContext = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFirmaId) return;

    if (contextMode === "support_write") {
      if (!contextReason || contextReason.trim().length < 10) {
        pushToast("err", "Destek/Yazma (support_write) modu için en az 10 karakter uzunluğunda işlem gerekçesi (reason) girmek zorunludur.");
        return;
      }
    }

    setBusy(true);
    try {
      const res = await apiPost<any>("/platform/context/start", {
        tenant_id: selectedFirmaId,
        mode: contextMode,
        reason: contextReason.trim() || null,
        ticket_ref: contextTicketRef.trim() || null,
      });

      // Save token and context data
      localStorage.setItem("tenant_context_token", res.context_token);
      localStorage.setItem(
        "tenant_context_data",
        JSON.stringify({
          active: true,
          tenant_id: res.tenant_id,
          tenant_name: res.tenant_name,
          mode: res.mode,
          expires_at: res.expires_at,
          context_id: res.context_id,
          enabled_modules: res.enabled_modules || [],
          feature_flags: res.feature_flags || [],
          active_modules: res.active_modules || res.enabled_modules || [],
          active_features: res.active_features || res.feature_flags || [],
          effective_quotas: res.effective_quotas || {},
          usage_summary: res.usage_summary || {},
          entitlement_source: res.entitlement_source || {},
        })
      );

      setContextModalOpen(false);
      pushToast("ok", `${res.tenant_name} bağlamına geçiş yapıldı.`);
      router.replace("/");
    } catch (err: any) {
      pushToast("err", err?.response?.data?.detail || "Bağlam başlatılamadı.");
    } finally {
      setBusy(false);
    }
  };

  if (!authorized || loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2 md:p-4">
      <ConfirmModal state={confirm} onClose={() => setConfirm((p) => ({ ...p, open: false }))} />

      {/* Toast System */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow ${t.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-250 bg-rose-50 text-rose-800"}`}>
            {t.type === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
            <span className="font-semibold text-xs">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Top Breadcrumb Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Platform Control</span>
          <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            {tab === "firmalar" && "Firma Yönetim Merkezi (Tenants)"}
            {tab === "lisans" && "Plan ve Lisans Kataloğu"}
            {tab === "audit" && "Sistem Denetim İzleri (Audits)"}
          </h1>
        </div>
        
        {/* Tab Selection */}
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50">
          <button onClick={() => handleTabChange("firmalar")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === "firmalar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Firmalar</button>
          <button onClick={() => handleTabChange("lisans")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === "lisans" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Planlar</button>
          <button onClick={() => handleTabChange("audit")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Audit Log</button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-250 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* TAB: FIRMALAR (TENANTS DIRECTORY + DETAIL PANEL) */}
      {tab === "firmalar" && (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN: Firmalar Directory (1/3 width) */}
          <div className="lg:col-span-1 space-y-4">
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Firma Listesi</h3>
                <button 
                  onClick={() => {
                    setRightPanelMode("create");
                    setSelectedFirmaId("");
                  }}
                  className="text-xs font-bold text-indigo-650 hover:text-indigo-750 flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Yeni Firma
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium focus:border-slate-400 focus:outline-none" placeholder="Firma adı veya kod ara" value={searchFirma} onChange={(e) => setSearchFirma(e.target.value)} />
                </div>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <select className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:border-slate-400 focus:outline-none appearance-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">Tüm Durumlar</option>
                    <option value="trial">Deneme</option>
                    <option value="active">Aktif</option>
                    <option value="suspended">Askıda</option>
                    <option value="archived">Arşiv</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scrollable Tenant List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredFirmalar.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <p className="text-xs font-semibold text-slate-450 italic">Aramaya uygun firma bulunamadı.</p>
                </div>
              )}
              {filteredFirmalar.map((firma) => {
                const isSelected = selectedFirmaId === firma.id;
                return (
                  <button
                    key={firma.id}
                    onClick={() => {
                      setSelectedFirmaId(firma.id);
                      setRightPanelMode("detail");
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? "bg-slate-900 border-slate-900 text-white shadow-md transform translate-x-1" 
                        : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                      }`}>
                        {firma.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{firma.name}</p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? "text-slate-400" : "text-slate-450"}`}>
                          Kod: {firma.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                        isSelected 
                          ? "bg-white/10 text-white border-white/20" 
                          : statusBadge(firma.status)
                      }`}>
                        {statusText(firma.status)}
                      </span>
                      <ChevronRight className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* RIGHT COLUMN: Selected Tenant Details Panel (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            
            {rightPanelMode === "create" && (
              <form onSubmit={createFirma} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-850">
                    <PlusCircle className="h-4.5 w-4.5 text-indigo-500" /> Yeni Firma Kaydı Oluştur
                  </h3>
                  <button type="button" onClick={() => setRightPanelMode("detail")} className="text-xs text-slate-400 font-bold hover:text-slate-650">Kapat</button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Firma Adı *</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="Örn: Akme Havalandırma A.Ş." value={firmaForm.name} onChange={(e) => setFirmaForm((p) => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Kısa Kod * (Benzersiz, küçük harf)</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="akme" pattern="[a-z0-9-]{2,32}" value={firmaForm.code} onChange={(e) => setFirmaForm((p) => ({ ...p, code: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Logo URL</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="https://..." value={firmaForm.logo_url} onChange={(e) => setFirmaForm((p) => ({ ...p, logo_url: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Vergi Numarası</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="Vergi No" value={firmaForm.tax_no} onChange={(e) => setFirmaForm((p) => ({ ...p, tax_no: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Sektör</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="Mekanik Taahhüt" value={firmaForm.sector} onChange={(e) => setFirmaForm((p) => ({ ...p, sector: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Ülke</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="Türkiye" value={firmaForm.country} onChange={(e) => setFirmaForm((p) => ({ ...p, country: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Özel Domain (Opsiyonel)</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="firma.com" value={firmaForm.domain} onChange={(e) => setFirmaForm((p) => ({ ...p, domain: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Alt Domain (Subdomain)</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" placeholder="akme" value={firmaForm.subdomain} onChange={(e) => setFirmaForm((p) => ({ ...p, subdomain: e.target.value }))} />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setRightPanelMode("detail")} className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Vazgeç</button>
                  <button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Firmayı Oluştur</button>
                </div>
              </form>
            )}

            {rightPanelMode === "detail" && (
              <>
                {!selectedFirmaId ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm">
                    <div className="rounded-2xl bg-slate-50 p-4 text-slate-400 mb-4">
                      <Building2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Firma Seçilmedi</h3>
                    <p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed">Platform üzerindeki firmaların lisanslarını, yöneticilerini, entegrasyon ayarlarını ve güvenlik kayıtlarını yönetmek için sol listeden bir firma seçin.</p>
                    <button 
                      onClick={() => setRightPanelMode("create")} 
                      className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-850"
                    >
                      <PlusCircle className="h-4 w-4" /> Yeni Firma Kaydı Ekle
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Selected Tenant Summary Header */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-sm text-indigo-700 uppercase">
                            {selectedFirma?.name.slice(0, 2)}
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedFirma?.name}</h2>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Kod: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-650 font-bold">{selectedFirma?.code}</code></p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setContextModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm mr-2"
                          >
                            <Building2 className="h-4 w-4 text-indigo-500" /> Firma Olarak Aç
                          </button>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge(selectedFirma?.status || "")}`}>
                            {statusText(selectedFirma?.status || "")}
                          </span>
                          <span className={`h-2.5 w-2.5 rounded-full ${selectedFirma?.is_active ? "bg-emerald-500" : "bg-rose-500"}`} title={selectedFirma?.is_active ? "Giriş Yetkisi Aktif" : "Giriş Yetkisi Kapalı"} />
                        </div>
                      </div>

                      {/* Usage bar */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
                        <div>
                          <p className="text-[10px] uppercase text-slate-400">Aktif Plan</p>
                          <p className="text-slate-800 font-bold mt-1 text-sm">{aktifPlan ? aktifPlan.name : "Lisans Atanmamış"}</p>
                        </div>
                        <div>
                          <div className="flex justify-between items-center text-[10px] uppercase text-slate-400">
                            <span>Kullanıcı Sınırı</span>
                            <span>{metrik.adminSayisi} / {metrik.limit || "∞"}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 overflow-hidden rounded mt-1.5">
                            <div className="h-full bg-indigo-605" style={{ width: `${metrik.oran}%` }} />
                          </div>
                        </div>
                      </div>

                      {tenantEntitlement && (
                        <div className="grid gap-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600 lg:grid-cols-3">
                          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                            <p className="text-[10px] uppercase text-slate-400 font-bold">Aktif Modüller</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tenantEntitlement.modules.map((moduleId) => <span key={moduleId} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-100">{moduleId}</span>)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                            <p className="text-[10px] uppercase text-indigo-400 font-bold">Aktif Özellikler</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tenantEntitlement.features.map((featureId) => <span key={featureId} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-100">{featureId}</span>)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                            <p className="text-[10px] uppercase text-emerald-500 font-bold">Kullanım / Limit</p>
                            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                              {Object.entries(tenantEntitlement.quotas).map(([key, limit]) => {
                                const usage = tenantEntitlement.usage?.[key]?.quantity || 0;
                                return <span key={key} className="rounded-md bg-white px-2 py-0.5 font-bold text-emerald-800 ring-1 ring-emerald-100">{key}: {usage}/{limit || "∞"}</span>;
                              })}
                            </div>
                          </div>
                          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100 lg:col-span-3">
                            <p className="text-[10px] uppercase text-amber-600 font-bold">Override / Marketplace Kaynağı</p>
                            <p className="mt-1 text-[10px] text-amber-800">Tenant override: {tenantEntitlement.entitlement_source?.tenant_override?.length || 0} · Marketplace install: {tenantEntitlement.entitlement_source?.marketplace_install?.length || 0}</p>
                          </div>
                          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-150 lg:col-span-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold">Hızlı Modül Yetkileri</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">Planı değiştirmeden tenant override ile modül aç/kapat.</p>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                {tenantEntitlement.modules.length}/{MODULE_REGISTRY_V2.length} aktif
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {MODULE_REGISTRY_V2.map((mod) => {
                                const isEnabled = tenantEntitlement.modules.includes(mod.id);
                                return (
                                  <button
                                    key={mod.id}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => toggleTenantModule(mod.id, !isEnabled)}
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-all ${isEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"}`}
                                    title={mod.description}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-[11px] font-black">{mod.label}</span>
                                      <span className="block truncate text-[10px] font-semibold opacity-70">{mod.id} · {mod.planTier}</span>
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${isEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                                      {isEnabled ? "Açık" : "Kapalı"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100 lg:col-span-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[10px] uppercase text-indigo-500 font-bold">Hızlı Özellik Yetkileri</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">Feature flag seviyesinde aç/kapat.</p>
                              </div>
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                                {tenantEntitlement.features.length}/{FEATURE_REGISTRY_V2.length} aktif
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {FEATURE_REGISTRY_V2.map((feature) => {
                                const isEnabled = tenantEntitlement.features.includes(feature.id);
                                return (
                                  <button
                                    key={feature.id}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => toggleTenantFeature(feature.id, !isEnabled)}
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-all ${isEnabled ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"}`}
                                    title={feature.description}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-[11px] font-black">{feature.label}</span>
                                      <span className="block truncate text-[10px] font-semibold opacity-70">{feature.id} · {feature.planTier}</span>
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${isEnabled ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                                      {isEnabled ? "Aktif" : "Kapalı"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100 lg:col-span-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[10px] uppercase text-emerald-600 font-bold">Hızlı Kullanım Limitleri</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">Quota değerlerini dondur veya varsayılan limite çek.</p>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                {Object.keys(tenantEntitlement.quotas).length} quota
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                              {QUOTA_REGISTRY_V2.map((quota) => {
                                const limit = tenantEntitlement.quotas[quota.id] ?? quota.defaultLimit;
                                const usage = tenantEntitlement.usage?.[quota.id]?.quantity || 0;
                                const isFrozen = limit === 0;
                                return (
                                  <div key={quota.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-[11px] font-black text-slate-800">{quota.label}</p>
                                        <p className="text-[10px] font-semibold text-slate-400">{quota.id}: {usage}/{limit || 0}</p>
                                      </div>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isFrozen ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                                        {isFrozen ? "Donuk" : "Aktif"}
                                      </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => updateTenantQuota(quota.id, 0, "donduruldu")}
                                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                      >
                                        Dondur
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => updateTenantQuota(quota.id, quota.defaultLimit, "varsayılan limite çekildi")}
                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                      >
                                        Aktifleştir
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sub-tabs for the Selected Tenant */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <div className="flex flex-wrap bg-slate-50 rounded-xl p-1 border border-slate-200/50 text-xs font-bold">
                        <button onClick={() => setSelectedFirmaTab("bilgiler")} className={`flex-1 px-3 py-2 rounded-lg text-center transition-all ${selectedFirmaTab === "bilgiler" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Firma Bilgileri</button>
                        <button onClick={() => setSelectedFirmaTab("yoneticiler")} className={`flex-1 px-3 py-2 rounded-lg text-center transition-all ${selectedFirmaTab === "yoneticiler" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Yöneticiler</button>
                        <button onClick={() => setSelectedFirmaTab("lisans")} className={`flex-1 px-3 py-2 rounded-lg text-center transition-all ${selectedFirmaTab === "lisans" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Lisans & Plan</button>
                        <button onClick={() => setSelectedFirmaTab("entegrasyonlar")} className={`flex-1 px-3 py-2 rounded-lg text-center transition-all ${selectedFirmaTab === "entegrasyonlar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Entegrasyonlar</button>
                        <button onClick={() => setSelectedFirmaTab("audit")} className={`flex-1 px-3 py-2 rounded-lg text-center transition-all ${selectedFirmaTab === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Audit Log</button>
                      </div>
                    </div>

                    {/* Tab: Bilgiler (General info & lifecycle) */}
                    {selectedFirmaTab === "bilgiler" && (
                      <div className="space-y-4">
                        <form onSubmit={saveFirmaVeAyar} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><Settings className="h-4 w-4 text-indigo-500" /> Firma Detay Bilgileri</h3>
                          
                          <div className="grid gap-3 sm:grid-cols-3 text-xs font-semibold text-slate-700">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Firma Adı</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Firma Adı" value={firmaDuzenleForm.name} onChange={(e) => setFirmaDuzenleForm((p) => ({ ...p, name: e.target.value }))} required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Firma Kodu</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold bg-slate-50 cursor-not-allowed" placeholder="Kısa kod" value={firmaDuzenleForm.code} disabled required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Logo URL</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Logo URL" value={firmaDuzenleForm.logo_url} onChange={(e) => setFirmaDuzenleForm((p) => ({ ...p, logo_url: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Vergi Numarası</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Vergi No" value={ayarForm.tax_no} onChange={(e) => setAyarForm((p) => ({ ...p, tax_no: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Sektör</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Sektör" value={ayarForm.sector} onChange={(e) => setAyarForm((p) => ({ ...p, sector: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Ülke</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Ülke" value={ayarForm.country} onChange={(e) => setAyarForm((p) => ({ ...p, country: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Ana Domain</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="firma.com" value={ayarForm.domain} onChange={(e) => setAyarForm((p) => ({ ...p, domain: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Alt Domain (Subdomain)</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="akme" value={ayarForm.subdomain} onChange={(e) => setAyarForm((p) => ({ ...p, subdomain: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Tema Rengi</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="#0f172a" pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" value={ayarForm.theme_color} onChange={(e) => setAyarForm((p) => ({ ...p, theme_color: e.target.value }))} />
                            </div>
                          </div>
                          
                          <div className="flex justify-end pt-2 border-t border-slate-100">
                            <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 inline-flex items-center gap-1.5"><Save className="h-4 w-4" /> Bilgileri Güncelle</button>
                          </div>
                        </form>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-855 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><Lock className="h-4 w-4 text-amber-500" /> Yaşam Döngüsü & Giriş Yetkisi</h3>
                          <div className="grid gap-4 md:grid-cols-2 text-xs font-semibold text-slate-700">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Firma Durumu</label>
                              <select className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none" value={yasamForm.status} onChange={(e) => setYasamForm((p) => ({ ...p, status: e.target.value }))}>
                                <option value="trial">Deneme (Trial)</option>
                                <option value="active">Aktif (Active)</option>
                                <option value="suspended">Askıya Al (Suspended)</option>
                                <option value="archived">Arşivle (Archived)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Kullanıcı Erişimi</label>
                              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50 cursor-pointer h-[38px]">
                                <input type="checkbox" checked={yasamForm.is_active} onChange={(e) => setYasamForm((p) => ({ ...p, is_active: e.target.checked }))} />
                                <span className="font-semibold text-xs text-slate-700">Oturum Açabilsinler</span>
                              </label>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] text-slate-400">İşlem Gerekçesi (Audit günlüğü için zorunlu)</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Örn: Fatura ödemesi gecikti, deneme süresi bitti vb." value={yasamForm.reason} onChange={(e) => setYasamForm((p) => ({ ...p, reason: e.target.value }))} />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  title: "Firmayı Arşive Taşı",
                                  detail: "Bu işlem firmayı pasife alır ve durumunu arşive çeker. Veritabanından herhangi bir veri silinmez ancak kullanıcıların tamamının erişimi engellenir.",
                                  action: async () => removeFirma(),
                                })
                              }
                              className="rounded-xl border border-rose-250 bg-rose-50 text-rose-800 px-4 py-2 text-xs font-bold hover:bg-rose-100 disabled:cursor-not-allowed"
                            >
                              Firmayı Arşivle
                            </button>
                            
                            <button
                              onClick={() => setConfirm({
                                open: true,
                                title: "Firma Yaşam Döngüsünü Değiştir",
                                detail: "Bu işlem organizasyon yetkilerini ve erişim izinlerini etkileyecektir. Emin misiniz?",
                                action: async () => patchFirmaYasam(),
                              })}
                              disabled={busy}
                              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 inline-flex items-center gap-1.5"
                            >
                              <Save className="h-4 w-4" /> Durumu Güncelle
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab: Yöneticiler */}
                    {selectedFirmaTab === "yoneticiler" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        
                        {/* Provision Admin */}
                        <form onSubmit={createYonetici} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><UserPlus className="h-4 w-4 text-emerald-500" /> Yeni Yönetici Yetkilendir (Provision)</h3>
                          <div className="space-y-3 text-xs font-semibold text-slate-700">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Ad Soyad</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Ad Soyad" value={yoneticiForm.full_name} onChange={(e) => setYoneticiForm((p) => ({ ...p, full_name: e.target.value }))} required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Kurumsal E-posta</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="admin@firma.com" type="email" value={yoneticiForm.email} onChange={(e) => setYoneticiForm((p) => ({ ...p, email: e.target.value }))} required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Geçici Parola</label>
                              <div className="flex gap-2">
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Geçici Şifre" type="text" value={yoneticiForm.temporary_password} onChange={(e) => setYoneticiForm((p) => ({ ...p, temporary_password: e.target.value }))} required />
                                <button type="button" onClick={() => setYoneticiForm((p) => ({ ...p, temporary_password: randomPassword() }))} className="rounded-xl border border-slate-300 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 shrink-0">Parola Üret</button>
                              </div>
                            </div>
                            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-800 pt-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Yönetici Olarak Ekle</button>
                          </div>
                        </form>

                        {/* Reset Password */}
                        <form onSubmit={resetYoneticiParola} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><KeyRound className="h-4 w-4 text-amber-500" /> Yönetici Şifresini Sıfırla</h3>
                          <div className="space-y-3 text-xs font-semibold text-slate-700">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Yönetici Hesap Seçimi</label>
                              <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none"
                                value={resetForm.admin_user_id}
                                onChange={(e) => setResetForm((p) => ({ ...p, admin_user_id: e.target.value }))}
                                required
                              >
                                <option value="">Yönetici seçin...</option>
                                {firmaYoneticileri.map((admin) => (
                                  <option key={admin.id} value={admin.id}>
                                    {admin.full_name} ({admin.email})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Yeni Geçici Parola</label>
                              <div className="flex gap-2">
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Yeni geçici şifre" type="text" value={resetForm.temporary_password} onChange={(e) => setResetForm((p) => ({ ...p, temporary_password: e.target.value }))} required />
                                <button type="button" onClick={() => setResetForm((p) => ({ ...p, temporary_password: randomPassword() }))} className="rounded-xl border border-slate-300 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 shrink-0">Parola Üret</button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50 cursor-pointer h-[38px]">
                                <input type="checkbox" checked={resetForm.force_password_change} onChange={(e) => setResetForm((p) => ({ ...p, force_password_change: e.target.checked }))} />
                                <span className="font-semibold text-xs text-slate-700">İlk girişte parolayı değiştirsin</span>
                              </label>
                            </div>
                            <button
                              disabled={!resetForm.admin_user_id || busy}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
                            >
                              <RefreshCw className="h-4 w-4" /> Şifreyi Sıfırla ve Mail Gönder
                            </button>
                          </div>
                        </form>

                        {/* List of Admins */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 space-y-4">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><UserCog className="h-4 w-4 text-indigo-500" /> Firma Yöneticileri Listesi</h3>
                          
                          <div className="space-y-3">
                            {firmaYoneticileri.length === 0 && <p className="text-xs font-semibold text-slate-400 italic py-4">Firma için tanımlanmış yönetici bulunamadı.</p>}
                            {firmaYoneticileri.map((admin) => (
                              <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50/30 transition-all">
                                <div>
                                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-slate-400" /> {admin.full_name}
                                    {!admin.is_active && <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-black">KİLİTLİ</span>}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{admin.email}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    onClick={() => openYoneticiDuzenle(admin)}
                                    className="rounded-lg border border-slate-350 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirm({
                                        open: true,
                                        title: admin.is_active ? "Yöneticiyi Kilitle" : "Yöneticinin Kilidini Aç",
                                        detail: admin.is_active ? "Bu yöneticinin sisteme giriş yetkisi anında engellenecektir." : "Bu yönetici yeniden sisteme giriş yapabilecektir.",
                                        action: async () => updateYonetici(admin, { is_active: !admin.is_active }),
                                      })
                                    }
                                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white transition-all ${
                                      admin.is_active ? "bg-slate-900 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                                  >
                                    {admin.is_active ? "Kilitle" : "Kilidi Aç"}
                                  </button>
                                  <button
                                    onClick={() => updateYonetici(admin, { force_password_change: !admin.force_password_change })}
                                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-all ${
                                      admin.force_password_change 
                                        ? "bg-amber-50 border-amber-250 text-amber-800 hover:bg-amber-100" 
                                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    Şifre Değişimi: {admin.force_password_change ? "İlk Girişte" : "Serbest"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirm({
                                        open: true,
                                        title: "Yöneticiyi Kaldır (Pasife Çek)",
                                        detail: "Yönetici hesabı pasif konuma getirilecektir. Devam edilsin mi?",
                                        action: async () => updateYonetici(admin, { is_active: false }),
                                      })
                                    }
                                    disabled={!admin.is_active}
                                    className="rounded-lg bg-rose-50 border border-rose-250 text-rose-800 px-2.5 py-1.5 text-[10px] font-bold hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Kaldır
                                  </button>
                                </div>
                                {editingAdminId === admin.id && (
                                  <div className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-700 space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] text-slate-450">Yönetici Ad Soyad</label>
                                        <input
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold"
                                          placeholder="Ad Soyad"
                                          value={editingAdminForm.full_name}
                                          onChange={(e) => setEditingAdminForm((p) => ({ ...p, full_name: e.target.value }))}
                                        />
                                      </div>
                                      <div className="flex flex-col justify-end">
                                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 cursor-pointer h-[38px]">
                                          <input
                                            type="checkbox"
                                            checked={editingAdminForm.force_password_change}
                                            onChange={(e) => setEditingAdminForm((p) => ({ ...p, force_password_change: e.target.checked }))}
                                          />
                                          <span className="text-xs text-slate-750">İlk girişte şifre değiştirsin</span>
                                        </label>
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-1.5 border-t border-slate-200/50 pt-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingAdminId("")}
                                        className="rounded-lg border px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                                      >
                                        Vazgeç
                                      </button>
                                      <button
                                        onClick={() => saveYoneticiDuzenle(admin)}
                                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800"
                                      >
                                        Değişiklikleri Kaydet
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Tab: Lisans & Plan */}
                    {selectedFirmaTab === "lisans" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        
                        {/* Assign Subscription */}
                        <form onSubmit={assignLisans} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Firmaya Plan / Lisans Ata</h3>
                          
                          <div className="space-y-3 text-xs font-semibold text-slate-700">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Üyelik Planı Seçimi</label>
                              <select className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none" value={atamaForm.plan_id} onChange={(e) => setAtamaForm((p) => ({ ...p, plan_id: e.target.value }))} required>
                                <option value="">Bir plan seçin...</option>
                                {planlar.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} ({plan.code})</option>)}
                              </select>
                            </div>
                            
                            <div className="grid gap-3 grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400">Lisans Durumu</label>
                                <select className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none" value={atamaForm.status} onChange={(e) => setAtamaForm((p) => ({ ...p, status: e.target.value }))}>
                                  <option value="active">Aktif (Active)</option>
                                  <option value="trial">Deneme (Trial)</option>
                                  <option value="suspended">Askıya Alınmış</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400">Bitiş Tarihi (Opsiyonel)</label>
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none" type="datetime-local" value={atamaForm.ends_at} onChange={(e) => setAtamaForm((p) => ({ ...p, ends_at: e.target.value }))} />
                              </div>
                            </div>

                            {selectedPlan && (
                              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-[11px] text-indigo-850 font-bold space-y-1">
                                <p className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Plan Limit Özeti:</p>
                                <ul className="list-disc pl-4 space-y-0.5 mt-1 font-semibold text-indigo-750">
                                  <li>Kullanıcı Limiti: {selectedPlan.max_users}</li>
                                  <li>Depolama Limiti: {selectedPlan.storage_limit_gb} GB</li>
                                  <li>Aktif Modüller: {(selectedPlan.modules || []).join(", ")}</li>
                                  {!!selectedPlan.features?.length && <li>Feature Flags: {selectedPlan.features.join(", ")}</li>}
                                  {!!selectedPlan.quotas && <li>Quota Sayısı: {Object.keys(selectedPlan.quotas).length}</li>}
                                </ul>
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Tenant Override JSON (Opsiyonel)</label>
                              <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px] font-semibold focus:outline-none" value={atamaForm.overridesJson} onChange={(e) => setAtamaForm((p) => ({ ...p, overridesJson: e.target.value }))} />
                              <p className="text-[10px] text-slate-400">Örn: {`{"modules":["inventory"],"features":["ai.assistant"],"quotas":{"ai_tokens":100000}}`}</p>
                            </div>

                            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 pt-2"><Save className="h-4 w-4" /> Yeni Planı Ata</button>
                          </div>
                        </form>

                        {/* License History */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Lisans Atama Geçmişi</h3>
                          
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {lisanslar.length === 0 ? (
                              <p className="text-xs font-semibold text-slate-400 italic py-4">Firma için henüz bir lisans geçmişi bulunmuyor.</p>
                            ) : (
                              lisanslar.map((sub) => {
                                const matchedPlan = planlar.find((p) => p.id === sub.plan_id);
                                return (
                                  <div key={sub.id} className="rounded-xl border border-slate-150 p-3 bg-slate-50/50 text-xs font-semibold text-slate-600 space-y-1">
                                    <div className="flex justify-between font-bold text-slate-800">
                                      <span>Plan: {matchedPlan ? matchedPlan.name : "Bilinmiyor"}</span>
                                      <span className="text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded uppercase tracking-wide">{sub.status}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-450 mt-1">Başlangıç: {new Date(sub.starts_at).toLocaleString("tr-TR")}</p>
                                    <p className="text-[10px] text-slate-455">Bitiş: {sub.ends_at ? new Date(sub.ends_at).toLocaleString("tr-TR") : "Süresiz"}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Tab: Entegrasyonlar */}
                    {selectedFirmaTab === "entegrasyonlar" && (
                      <form onSubmit={saveFirmaVeAyar} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                        
                        <div>
                          <h3 className="text-xs font-bold text-slate-855 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5"><Mail className="h-4 w-4 text-indigo-500" /> Kurumsal E-posta (White-label) Ayarları</h3>
                          <div className="grid gap-3 sm:grid-cols-2 mt-3 text-xs font-semibold text-slate-700">
                            
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Gönderim Modu</label>
                              <select className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none" value={ayarForm.email_mode} onChange={(e) => setAyarForm((p) => ({ ...p, email_mode: e.target.value as "platform" | "tenant_domain" }))}>
                                <option value="platform">Platform Kimliği (Varsayılan)</option>
                                <option value="tenant_domain">Müşteri Kendi Alan Adı (White-label)</option>
                              </select>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Gönderici Adı (From Name)</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="GOLABS ERP" value={ayarForm.from_name} onChange={(e) => setAyarForm((p) => ({ ...p, from_name: e.target.value }))} />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Gönderici Adresi (From Email)</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="bildirim@firma.com" type="email" value={ayarForm.from_email} onChange={(e) => setAyarForm((p) => ({ ...p, from_email: e.target.value }))} />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Yanıt Adresi (Reply-To)</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="destek@firma.com" type="email" value={ayarForm.reply_to} onChange={(e) => setAyarForm((p) => ({ ...p, reply_to: e.target.value }))} />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">E-posta Sağlayıcı Alan Adı Kimliği (Provider ID)</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Resend Domain ID" value={ayarForm.email_provider_identity_id} onChange={(e) => setAyarForm((p) => ({ ...p, email_provider_identity_id: e.target.value }))} />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400">Doğrulama Durumu</label>
                              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 bg-slate-50/50 cursor-pointer h-[38px]">
                                <input type="checkbox" checked={ayarForm.email_domain_verified} onChange={(e) => setAyarForm((p) => ({ ...p, email_domain_verified: e.target.checked }))} />
                                <span className="font-semibold text-xs text-slate-700">DKIM / SPF Alan Adı Doğrulandı</span>
                              </label>
                            </div>

                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">E-posta Özelleştirme (Branding)</h3>
                          <div className="grid gap-3 sm:grid-cols-3 mt-3 text-xs font-semibold text-slate-700">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Marka Logo URL</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Logo Resmi URL'si" value={ayarForm.branding_logo_url} onChange={(e) => setAyarForm((p) => ({ ...p, branding_logo_url: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Marka Birincil Rengi</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="#0f172a" pattern="^$|^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" value={ayarForm.branding_color} onChange={(e) => setAyarForm((p) => ({ ...p, branding_color: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">E-posta Altbilgi (Footer) Metni</label>
                              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="© 2026 Golabs Teknolojileri" value={ayarForm.branding_footer} onChange={(e) => setAyarForm((p) => ({ ...p, branding_footer: e.target.value }))} />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 inline-flex items-center gap-1.5"><Save className="h-4 w-4" /> Entegrasyonları Kaydet</button>
                        </div>

                      </form>
                    )}

                    {/* Tab: Tenant Audit */}
                    {selectedFirmaTab === "audit" && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Firma Güvenlik & Denetim İzleri</h3>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500">Immutable Logs</span>
                        </div>
                        
                        <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6 max-h-[450px] overflow-y-auto pr-1 text-xs py-2">
                          {filteredTenantAudit.length === 0 && (
                            <p className="text-xs font-semibold text-slate-400 italic py-4 pl-2">Firma için denetim günlüğü kaydı bulunmuyor.</p>
                          )}
                          {filteredTenantAudit.map((row) => {
                            const isContextStart = row.action === "context_started";
                            const isContextEnd = row.action === "context_ended";
                            const isContextRenew = row.action === "context_renewed";
                            const isContextRevoke = row.action === "context_revoked";
                            const isWriteAction = row.action === "context_write_action";
                            
                            let dotBg = "bg-indigo-500";
                            if (isContextStart) dotBg = "bg-emerald-500";
                            else if (isContextEnd) dotBg = "bg-slate-400";
                            else if (isContextRenew) dotBg = "bg-blue-500";
                            else if (isContextRevoke) dotBg = "bg-rose-500";
                            else if (isWriteAction) dotBg = "bg-amber-500 animate-pulse";
                            
                            return (
                              <div key={row.id} className="relative group">
                                {/* Bullet indicator on the line */}
                                <div className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white ${dotBg} shadow-sm transition-transform group-hover:scale-125`} />
                                
                                <div className="rounded-xl border border-slate-150 p-3 bg-slate-50/30 hover:bg-slate-50/70 transition-all space-y-1">
                                  <div className="flex justify-between font-bold text-slate-850">
                                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                                      {row.action}
                                      {(isContextStart || isWriteAction) && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                      )}
                                    </span>
                                    <span className="text-[10px] text-slate-450 font-semibold">{new Date(row.created_at).toLocaleString("tr-TR")}</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-semibold">Aktör: <code className="bg-slate-100 px-1 rounded text-slate-600">{row.actor_user_id}</code></p>
                                  {renderAuditDetails(row.details)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </>
            )}

          </div>

        </div>
      )}

      {/* TAB: LISANS (PLAN CREATION & PLAN DIRECTORY CARDS) */}
      {tab === "lisans" && (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Plan catalog creation form */}
          <form onSubmit={createPlan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-500" /> Yeni Paket / Plan Tanımla
            </h3>
            
            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Plan Benzersiz Kodu *</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="enterprise-tier" value={planForm.code} onChange={(e) => setPlanForm((p) => ({ ...p, code: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Plan Görünen Adı *</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Enterprise Plan" value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Maks Kullanıcı Sınırı *</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" type="number" min={1} value={planForm.max_users} onChange={(e) => setPlanForm((p) => ({ ...p, max_users: Number(e.target.value) }))} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Depolama Sınırı (GB) *</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" type="number" min={1} value={planForm.storage_limit_gb} onChange={(e) => setPlanForm((p) => ({ ...p, storage_limit_gb: Number(e.target.value) }))} required />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400">Module Registry</label>
                <div className="grid gap-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                  {MODULE_REGISTRY_V2.map((mod) => (
                    <label key={mod.id} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-3 py-2 text-[11px] shadow-sm ring-1 ring-slate-100 hover:ring-indigo-200">
                      <input type="checkbox" className="mt-0.5" checked={planForm.modules.includes(mod.id)} onChange={() => togglePlanModule(mod.id)} />
                      <span>
                        <span className="block font-bold text-slate-800">{mod.label}</span>
                        <span className="block text-[10px] text-slate-400">{mod.category} · {mod.planTier}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400">Feature Registry</label>
                <div className="grid gap-2 max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                  {FEATURE_REGISTRY_V2.map((feature) => (
                    <label key={feature.id} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-3 py-2 text-[11px] shadow-sm ring-1 ring-slate-100 hover:ring-indigo-200">
                      <input type="checkbox" className="mt-0.5" checked={planForm.features.includes(feature.id)} onChange={() => togglePlanFeature(feature.id)} />
                      <span>
                        <span className="block font-bold text-slate-800">{feature.label}</span>
                        <span className="block text-[10px] text-slate-400">{feature.id}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400">Quota Engine</label>
                <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
                  {QUOTA_REGISTRY_V2.map((quota) => (
                    <label key={quota.id} className="grid grid-cols-[1fr_90px] items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] shadow-sm ring-1 ring-slate-100">
                      <span>
                        <span className="block font-bold text-slate-800">{quota.label}</span>
                        <span className="block text-[10px] text-slate-400">{quota.id}</span>
                      </span>
                      <input className="rounded-lg border border-slate-200 px-2 py-1 text-right font-bold" type="number" min={0} value={planForm.quotas[quota.id] ?? quota.defaultLimit} onChange={(e) => updatePlanQuota(quota.id, Number(e.target.value))} />
                    </label>
                  ))}
                </div>
              </div>
              
              <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-800 pt-2">
                <PlusCircle className="h-4 w-4 text-emerald-500" /> Planı Katalog ve Satışa Aç
              </button>
            </div>
          </form>

          {/* Grid of plan cards */}
          <div className="lg:col-span-2 space-y-4">
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Aktif Planlar ve Paketler</h3>
              
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                {planlar.map((plan) => (
                  <article key={plan.id} className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{plan.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">Kod: {plan.code}</span>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                          plan.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-250" : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {plan.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                        <div>
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Kullanıcı Limiti</p>
                          <p className="text-slate-800 font-bold mt-0.5">{plan.max_users} Maks</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Depolama Sınırı</p>
                          <p className="text-slate-800 font-bold mt-0.5">{plan.storage_limit_gb} GB</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1">
                        <p className="text-[9px] uppercase text-slate-400 font-bold">Modül Erişim Yetkileri</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(plan.modules || []).map((mod) => (
                            <span key={mod} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{mod}</span>
                          ))}
                        </div>
                      </div>

                      {!!plan.features?.length && (
                        <div className="mt-3 space-y-1">
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Feature Flags</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {plan.features.map((feature) => (
                              <span key={feature} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">{feature}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 space-y-1">
                        <p className="text-[9px] uppercase text-slate-400 font-bold">Quota Engine</p>
                        <div className="grid grid-cols-2 gap-1 text-[9px] font-bold text-slate-500">
                          {Object.entries(plan.quotas || { users: plan.max_users, storage_gb: plan.storage_limit_gb }).slice(0, 6).map(([key, value]) => (
                            <span key={key} className="rounded-md bg-slate-50 px-2 py-1">{key}: {value}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-1.5">
                      <button 
                        disabled 
                        title="Plan güncelleme bir sonraki sprint kapsamında" 
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-400 cursor-not-allowed"
                      >
                        Düzenle
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB: AUDIT LOG (GLOBAL IMMUTABLE AUDIT TRAIL) */}
      {tab === "audit" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><History className="h-4.5 w-4.5 text-indigo-500 animate-spin-slow" /> Immutable Audit Trail</h3>
              <p className="text-xs text-slate-450 mt-0.5">Sistem yöneticilerinin ve kritik firma eylemlerinin silinemez güvenlik kayıtları.</p>
            </div>
            <button onClick={exportAuditCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> CSV İndir (Dışa Aktar)
            </button>
          </div>

          {/* Filtering */}
          <div className="grid gap-3 sm:grid-cols-3 text-xs font-semibold text-slate-700">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Eylem Türü Filtresi</label>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold focus:outline-none" value={auditActionFilter} onChange={(e) => setAuditActionFilter(e.target.value)}>
                <option value="all">Tüm Eylemler</option>
                {auditActions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Kelime Arama</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-405" />
                <input className="w-full rounded-xl border border-slate-200 pl-8.5 pr-3 py-2 font-semibold focus:outline-none" placeholder="İçerik, aktör ID veya detay ara" value={auditTextFilter} onChange={(e) => setAuditTextFilter(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 h-[38px] flex items-center justify-between text-xs text-slate-600 font-bold">
                <span>Eşleşen Kayıt Sayısı:</span>
                <span className="text-slate-800 font-extrabold">{filteredAudit.length}</span>
              </div>
            </div>
          </div>

          {/* List of audit logs */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 text-xs">
            {filteredAudit.length === 0 && <p className="text-xs font-semibold text-slate-400 italic py-4">Filtreye uygun güvenlik denetim izi bulunamadı.</p>}
            {filteredAudit.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4 bg-white hover:bg-slate-50/20 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">{row.action}</span>
                    <span className="text-[9px] font-black bg-indigo-50 border border-indigo-200 text-indigo-750 px-2 py-0.5 rounded">SAFETY</span>
                  </div>
                  <p className="text-[10px] text-slate-450 font-semibold">
                    Zaman: {new Date(row.created_at).toLocaleString("tr-TR")} · Aktör: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-650 font-bold">{row.actor_user_id}</code> · Firma ID: {row.tenant_id || "-"}
                  </p>
                  {row.details && (
                    <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 border border-slate-150 rounded-xl p-3 font-mono font-semibold break-words leading-relaxed whitespace-pre-wrap">
                      {row.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Context Start Configuration Modal */}
      {contextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={startContext} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-indigo-500" /> Firma Bağlamına Geçiş Yap
              </h3>
              <button type="button" onClick={() => setContextModalOpen(false)} className="text-xs text-slate-400 font-bold hover:text-slate-650">Kapat</button>
            </div>
            
            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Firma Adı</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 font-bold" value={selectedFirma?.name || ""} disabled />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Erişim Modu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContextMode("read_only")}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      contextMode === "read_only"
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Salt Okunur (Read-Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContextMode("support_write")}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      contextMode === "support_write"
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Destek / Yazma Yetkili
                  </button>
                </div>
              </div>

              {contextMode === "support_write" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Önemli: Yazma yetkisi ile yapacağınız tüm değişiklikler (ekleme, silme, güncelleme) kalıcı olarak denetlenecek ve audit loglarına kaydedilecektir.</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">
                  İşlem Gerekçesi {contextMode === "support_write" ? "(Zorunlu - En az 10 karakter)" : "(Opsiyonel / Önerilir)"}
                </label>
                <input 
                  className={`w-full rounded-xl border px-3 py-2 ${
                    contextMode === "support_write" && (!contextReason || contextReason.trim().length < 10)
                      ? "border-amber-400 focus:ring-amber-500"
                      : "border-slate-200"
                  }`} 
                  placeholder={
                    contextMode === "support_write"
                      ? "Destek gerekçesini detaylıca açıklayınız..."
                      : "Örn: WhatsApp entegrasyonu incelemesi..."
                  }
                  value={contextReason} 
                  onChange={(e) => setContextReason(e.target.value)} 
                  required={contextMode === "support_write"}
                />
                {contextMode === "support_write" && (!contextReason || contextReason.trim().length < 10) && (
                  <p className="text-[9px] text-amber-600 font-bold mt-0.5 animate-pulse">Yazma yetkisi için en az 10 karakter gerekçe zorunludur.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Destek Bilet Referansı (Opsiyonel)</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Örn: TICKET-4912" value={contextTicketRef} onChange={(e) => setContextTicketRef(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setContextModalOpen(false)} className="rounded-xl border px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                İptal
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-all ${
                  contextMode === "read_only" ? "bg-slate-900 hover:bg-slate-800" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {busy ? "Geçiş Yapılıyor..." : "Bağlamı Başlat"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default function PlatformTenantsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[450px] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" /></div>}>
      <PlatformTenantsPageContent />
    </Suspense>
  );
}

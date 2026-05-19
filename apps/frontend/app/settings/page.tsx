"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Bell,
  Shield,
  Settings2,
  Save,
  RotateCcw,
  Database,
  FileCog,
  Workflow,
  Globe,
  Clock3,
  Wallet,
  Users,
  CheckCircle2,
} from "lucide-react";
import { apiPut } from "@/lib/api";
import { fetchTenantContext, saveTenantContext, type TenantContext } from "@/lib/tenant-context";

type SettingsState = {
  companyName: string;
  taxNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  defaultCurrency: "TRY" | "USD" | "EUR";
  vatRate: number;
  locale: string;
  timezone: string;
  dateFormat: string;
  lowStockThreshold: number;
  autoInvoiceNo: boolean;
  invoicePrefix: string;
  requireApprovalForExpenses: boolean;
  defaultPaymentTermDays: number;
  sessionTimeoutMinutes: number;
  mfaRequiredForAdmins: boolean;
  loginIpWhitelist: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailySummaryHour: string;
  backupFrequency: "daily" | "weekly";
  retentionDays: number;
};

const DEFAULTS: SettingsState = {
  companyName: "",
  taxNumber: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  defaultCurrency: "TRY",
  vatRate: 20,
  locale: "tr-TR",
  timezone: "Europe/Istanbul",
  dateFormat: "DD.MM.YYYY",
  lowStockThreshold: 10,
  autoInvoiceNo: true,
  invoicePrefix: "SMK-INV",
  requireApprovalForExpenses: true,
  defaultPaymentTermDays: 30,
  sessionTimeoutMinutes: 60,
  mfaRequiredForAdmins: true,
  loginIpWhitelist: "",
  emailNotifications: true,
  pushNotifications: false,
  dailySummaryHour: "18:00",
  backupFrequency: "daily",
  retentionDays: 180,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ctx = await fetchTenantContext(true);
      if (!ctx) return;
      setSettings((prev) => ({
        ...prev,
        companyName: ctx.tenant_name || prev.companyName,
        taxNumber: ctx.tax_no || "",
        contactEmail: ctx.domain ? `info@${ctx.domain}` : prev.contactEmail,
        invoicePrefix: ctx.subdomain || prev.invoicePrefix,
      }));
    })();
  }, []);

  const isValid = useMemo(() => {
    if (!settings.companyName.trim()) return false;
    if (!settings.contactEmail.includes("@")) return false;
    if (settings.vatRate < 0 || settings.vatRate > 100) return false;
    if (settings.lowStockThreshold < 0) return false;
    if (settings.defaultPaymentTermDays < 0) return false;
    if (settings.sessionTimeoutMinutes < 5) return false;
    if (settings.retentionDays < 30) return false;
    return true;
  }, [settings]);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!isValid) {
      alert("Lütfen zorunlu alanları ve sayı aralıklarını kontrol edin.");
      return;
    }
    setSaving(true);
    try {
      const [profile, ctx] = await Promise.all([
        apiPut<TenantContext>("/auth/tenant-context/profile", {
          tenant_name: settings.companyName.trim(),
        }),
        apiPut<TenantContext>("/auth/tenant-context/settings", {
          tax_no: settings.taxNumber.trim() || null,
          sector: null,
          country: null,
          domain: settings.contactEmail.includes("@") ? settings.contactEmail.split("@")[1] : null,
          subdomain: settings.invoicePrefix.trim().toLowerCase() || null,
          theme_color: null,
        }),
      ]);
      saveTenantContext({ ...ctx, tenant_name: profile.tenant_name, logo_url: profile.logo_url });
      setSavedAt(new Date().toLocaleString("tr-TR"));
      alert("Firma ayarları kaydedildi.");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(DEFAULTS);
    setSavedAt(null);
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 animate-in fade-in duration-200">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 p-6 sm:p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Sistem Ayarları</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-3xl">
              Firma bilgileri, operasyon varsayımları, güvenlik politikaları, bildirim ayarları ve veri saklama stratejilerini merkezi olarak yönetin.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {savedAt ? `Son kayıt: ${savedAt}` : "Değişiklikler kaydedilmedi"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Building2 className="h-4 w-4" /> Kurumsal Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Firma adı" value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Vergi numarası" value={settings.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="E-posta" value={settings.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Telefon" value={settings.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
            </div>
            <textarea className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" rows={2} placeholder="Açık adres" value={settings.address} onChange={(e) => update("address", e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Workflow className="h-4 w-4" /> Operasyon ve Finans Varsayımları</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.defaultCurrency} onChange={(e) => update("defaultCurrency", e.target.value as SettingsState["defaultCurrency"])}>
                <option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
              <input type="number" className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.vatRate} onChange={(e) => update("vatRate", Number(e.target.value))} placeholder="KDV %" />
              <input type="number" className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.lowStockThreshold} onChange={(e) => update("lowStockThreshold", Number(e.target.value))} placeholder="Kritik stok eşiği" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                <span className="flex items-center gap-2"><FileCog className="h-4 w-4" /> Otomatik fatura numarası</span>
                <input type="checkbox" checked={settings.autoInvoiceNo} onChange={(e) => update("autoInvoiceNo", e.target.checked)} />
              </label>
              <input className="rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Fatura öneki" value={settings.invoicePrefix} onChange={(e) => update("invoicePrefix", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Giderler onaya düşsün</span>
                <input type="checkbox" checked={settings.requireApprovalForExpenses} onChange={(e) => update("requireApprovalForExpenses", e.target.checked)} />
              </label>
              <input type="number" className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.defaultPaymentTermDays} onChange={(e) => update("defaultPaymentTermDays", Number(e.target.value))} placeholder="Varsayılan vade (gün)" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Globe className="h-4 w-4" /> Bölgesel ve Zaman Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.locale} onChange={(e) => update("locale", e.target.value)} placeholder="Yerel format" />
              <input className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} placeholder="Zaman dilimi" />
              <input className="rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.dateFormat} onChange={(e) => update("dateFormat", e.target.value)} placeholder="Tarih formatı" />
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Shield className="h-4 w-4" /> Güvenlik</h3>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
              <span>Admin MFA zorunlu</span>
              <input type="checkbox" checked={settings.mfaRequiredForAdmins} onChange={(e) => update("mfaRequiredForAdmins", e.target.checked)} />
            </label>
            <input type="number" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.sessionTimeoutMinutes} onChange={(e) => update("sessionTimeoutMinutes", Number(e.target.value))} placeholder="Oturum süresi (dk)" />
            <textarea className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" rows={2} value={settings.loginIpWhitelist} onChange={(e) => update("loginIpWhitelist", e.target.value)} placeholder="IP whitelist (opsiyonel, virgülle)" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Bell className="h-4 w-4" /> Bildirimler</h3>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"><span>E-posta bildirimleri</span><input type="checkbox" checked={settings.emailNotifications} onChange={(e) => update("emailNotifications", e.target.checked)} /></label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"><span>Push bildirimleri</span><input type="checkbox" checked={settings.pushNotifications} onChange={(e) => update("pushNotifications", e.target.checked)} /></label>
            <input type="time" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.dailySummaryHour} onChange={(e) => update("dailySummaryHour", e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Database className="h-4 w-4" /> Veri Saklama ve Yedek</h3>
            <select className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.backupFrequency} onChange={(e) => update("backupFrequency", e.target.value as SettingsState["backupFrequency"])}>
              <option value="daily">Günlük yedek</option>
              <option value="weekly">Haftalık yedek</option>
            </select>
            <input type="number" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" value={settings.retentionDays} onChange={(e) => update("retentionDays", Number(e.target.value))} placeholder="Saklama süresi (gün)" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Settings2 className="h-4 w-4" /> Yönetim Kısayolları</h3>
            <Link href="/admin/hierarchy" className="block rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Müşteri - Bölge - Şube Yönetimi</Link>
            <Link href="/admin/users" className="block rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Kullanıcı ve Rol Yönetimi</Link>
            <Link href="/admin/api" className="block rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">API ve Entegrasyon Ayarları</Link>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500 flex items-center gap-2"><Clock3 className="h-4 w-4" /> Ayarlar kayıt edilmeden sistem davranışı değişmez.</div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Varsayılanlara Dön</button>
          <button onClick={handleSave} disabled={saving || !isValid} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}

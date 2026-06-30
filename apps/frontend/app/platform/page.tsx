"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  History,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Tenant = {
  id: string;
  name: string;
  code: string;
  status: string;
  is_active: boolean;
  created_at: string;
};

type Plan = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type Audit = {
  id: string;
  action: string;
  created_at: string;
};

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [auditRows, setAuditRows] = useState<Audit[]>([]);

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
        const [tenantRows, planRows, audit] = await Promise.all([
          apiGet<Tenant[]>("/platform/tenants"),
          apiGet<Plan[]>("/platform/plans"),
          apiGet<Audit[]>("/platform/audit"),
        ]);
        setTenants(Array.isArray(tenantRows) ? tenantRows : []);
        setPlans(Array.isArray(planRows) ? planRows : []);
        setAuditRows(Array.isArray(audit) ? audit : []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Platform dashboard yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const activeTenants = tenants.filter((row) => row.is_active).length;
    const suspendedTenants = tenants.filter((row) => row.status.toLowerCase() === "suspended").length;
    const activePlans = plans.filter((row) => row.is_active).length;
    const auditEvents = auditRows.length;
    return { activeTenants, suspendedTenants, activePlans, auditEvents };
  }, [tenants, plans, auditRows]);

  const recentAudit = useMemo(() => auditRows.slice(0, 6), [auditRows]);

  if (!authorized || loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <section className="corp-header">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-350">Platform Owner</p>
            <h1 className="text-2xl font-bold tracking-tight mt-1.5">Platform Yönetim Dashboardu</h1>
            <p className="mt-1 text-xs text-slate-350">Firma yaşam döngüsü, lisans sağlığı, yönetici güvenliği ve denetim görünürlüğü.</p>
          </div>
          <Link
            href="/platform/firmalar"
            className="corp-btn-secondary py-2 h-auto"
          >
            Firma Yönetimine Git <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-250/50 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">{error}</div>}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="corp-card p-5">
          <div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2 text-blue-700"><Building2 className="h-5 w-5" /></div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Toplam Firma</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{tenants.length}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Aktif: {stats.activeTenants}</p>
        </article>

        <article className="corp-card p-5">
          <div className="mb-3 inline-flex rounded-lg bg-amber-50 p-2 text-amber-700"><TriangleAlert className="h-5 w-5" /></div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Askıdaki Firma</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.suspendedTenants}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Müdahale gereken firmalar</p>
        </article>

        <article className="corp-card p-5">
          <div className="mb-3 inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700"><CreditCard className="h-5 w-5" /></div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Aktif Plan</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.activePlans}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Toplam plan {plans.length}</p>
        </article>

        <article className="corp-card p-5">
          <div className="mb-3 inline-flex rounded-lg bg-violet-50 p-2 text-violet-700"><Users className="h-5 w-5" /></div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Audit Olayı</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.auditEvents}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Platform denetim hacmi</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="corp-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><History className="h-4.5 w-4.5 text-indigo-500" /> Son Platform Olayları</h2>
            <Link href="/platform/firmalar?tab=audit" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Audit sekmesine git</Link>
          </div>
          <div className="space-y-3">
            {recentAudit.length === 0 && <p className="text-xs font-semibold text-slate-400 italic py-4">Henüz audit kaydı bulunamadı.</p>}
            {recentAudit.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-150 p-4 bg-slate-50/30">
                <p className="text-xs font-bold text-slate-800">{row.action}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">{new Date(row.created_at).toLocaleString("tr-TR")}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="corp-card p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2"><ShieldCheck className="h-4.5 w-4.5 text-indigo-500" /> Yönetim Kısayolları</h2>
          <div className="space-y-2">
            <Link href="/platform/firmalar?tab=firmalar" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-150 transition-all duration-150">
              Firma oluştur / güncelle <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/platform/firmalar?tab=yoneticiler" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-150 transition-all duration-150">
              Yönetici provision ve reset <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/platform/firmalar?tab=lisans" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-150 transition-all duration-150">
              Plan ve lisans ataması <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/settings" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-150 transition-all duration-150">
              Platform ayarları <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
          <div className="rounded-xl border border-emerald-250/50 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Bu panel platform_admin için varsayılan açılış sayfası olarak tanımlandı.</span>
          </div>
        </article>
      </section>
    </div>
  );
}

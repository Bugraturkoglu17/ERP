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
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [auditRows, setAuditRows] = useState<Audit[]>([]);

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (!payload) {
      window.location.href = "/login";
      return;
    }
    if (!isPlatformAdmin(payload)) {
      window.location.href = "/";
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
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Platform Owner</p>
            <h1 className="mt-1 text-3xl font-bold">Platform Yönetim Dashboardu</h1>
            <p className="mt-2 text-sm text-slate-300">Firma yaşam döngüsü, lisans sağlığı, yönetici güvenliği ve audit görünürlüğü.</p>
          </div>
          <Link
            href="/platform/firmalar"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Firma Yönetimine Git <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 inline-flex rounded-lg bg-blue-50 p-2 text-blue-700"><Building2 className="h-5 w-5" /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Toplam Firma</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{tenants.length}</p>
          <p className="text-xs text-slate-500">Aktif {stats.activeTenants}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 inline-flex rounded-lg bg-amber-50 p-2 text-amber-700"><TriangleAlert className="h-5 w-5" /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Askıdaki Firma</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{stats.suspendedTenants}</p>
          <p className="text-xs text-slate-500">Müdahale gereken firmalar</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700"><CreditCard className="h-5 w-5" /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aktif Plan</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{stats.activePlans}</p>
          <p className="text-xs text-slate-500">Toplam plan {plans.length}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 inline-flex rounded-lg bg-violet-50 p-2 text-violet-700"><Users className="h-5 w-5" /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Audit Olayı</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{stats.auditEvents}</p>
          <p className="text-xs text-slate-500">Platform denetim hacmi</p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><History className="h-4 w-4" /> Son Platform Olayları</h2>
            <Link href="/platform/firmalar?tab=audit" className="text-xs font-semibold text-blue-700">Audit sekmesine git</Link>
          </div>
          <div className="space-y-2">
            {recentAudit.length === 0 && <p className="text-sm text-slate-500">Henüz audit kaydı bulunamadı.</p>}
            {recentAudit.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{row.action}</p>
                <p className="text-xs text-slate-600">{new Date(row.created_at).toLocaleString("tr-TR")}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4" /> Yönetim Kısayolları</h2>
          <div className="space-y-2">
            <Link href="/platform/firmalar?tab=firmalar" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              Firma oluştur / güncelle <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/platform/firmalar?tab=yoneticiler" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              Yönetici provision ve reset <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/platform/firmalar?tab=lisans" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              Plan ve lisans ataması <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/settings" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              Platform ayarları <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
            Bu panel platform_admin için varsayılan açılış sayfası olarak tanımlandı.
          </div>
        </article>
      </section>
    </div>
  );
}

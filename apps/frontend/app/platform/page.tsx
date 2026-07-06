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
  Database,
  Mail,
  MessageSquare,
  Activity,
  Server,
  PlusCircle,
  FileText,
  Briefcase,
  AlertTriangle,
  Clock,
  Unlock,
  ShieldAlert,
  BarChart3
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getTokenPayloadFromStorage, isPlatformAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";

type HealthDetails = {
  database: string;
  redis: string;
  celery: string;
  whatsapp: string;
  email: string;
};

type HealthCheckResponse = {
  status: string;
  details: HealthDetails;
};

type SystemMetricsResponse = {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_projects: number;
  total_work_orders: number;
  plan_distribution: Record<string, number>;
};

type Audit = {
  id: string;
  action: string;
  created_at: string;
};

type ContextSession = {
  id: string;
  platform_admin_id: string;
  tenant_id: string;
  tenant_name: string;
  mode: "read_only" | "support_write";
  reason: string | null;
  ticket_ref: string | null;
  status: "active" | "ended" | "expired" | "revoked";
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  ended_reason: string | null;
};

type SupportAnalytics = {
  today_sessions_count: number;
  total_sessions_count: number;
  read_only_pct: number;
  support_write_pct: number;
  top_tenants: Array<{ tenant_name: string; count: number }>;
  avg_duration_minutes: number;
};

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardTab, setDashboardTab] = useState<"system" | "support">("system");
  
  // System states
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
  const [auditRows, setAuditRows] = useState<Audit[]>([]);

  // Support Workspace states
  const [activeSessions, setActiveSessions] = useState<ContextSession[]>([]);
  const [historySessions, setHistorySessions] = useState<ContextSession[]>([]);
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [historyRange, setHistoryRange] = useState("today");
  const [actionBusy, setActionBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [healthData, metricsData, auditData] = await Promise.all([
        apiGet<HealthCheckResponse>("/platform/health-check"),
        apiGet<SystemMetricsResponse>("/platform/system-metrics"),
        apiGet<Audit[]>("/platform/audit"),
      ]);
      setHealth(healthData);
      setMetrics(metricsData);
      setAuditRows(Array.isArray(auditData) ? auditData : []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Platform verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadSupportWorkspaceData = async (range = "today") => {
    try {
      const [activeData, historyData, analyticsData] = await Promise.all([
        apiGet<ContextSession[]>("/platform/context/active"),
        apiGet<ContextSession[]>(`/platform/context/history?range=${range}`),
        apiGet<SupportAnalytics>("/platform/context/analytics"),
      ]);
      setActiveSessions(activeData);
      setHistorySessions(historyData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error("Support workspace data load failed", err);
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
    loadData();
    loadSupportWorkspaceData(historyRange);
  }, []);

  useEffect(() => {
    if (authorized) {
      loadSupportWorkspaceData(historyRange);
    }
  }, [historyRange, authorized]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Bu aktif oturumu zorla sonlandırmak istediğinize emin misiniz? Platform admin paneline erişimi kesilecektir.")) {
      return;
    }
    setActionBusy(true);
    try {
      await apiPost(`/platform/context/revoke/${sessionId}`);
      
      // Cleanup locally if it's our own active switching context
      const localDataStr = localStorage.getItem("tenant_context_data");
      if (localDataStr) {
        const localData = JSON.parse(localDataStr);
        if (localData.context_id === sessionId) {
          localStorage.removeItem("tenant_context_token");
          localStorage.removeItem("tenant_context_data");
        }
      }
      
      await loadSupportWorkspaceData(historyRange);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Oturum iptal edilemedi.");
    } finally {
      setActionBusy(false);
    }
  };

  const recentAudit = useMemo(() => auditRows.slice(0, 5), [auditRows]);

  if (!authorized || loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Sistem verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Helper for status badge
  const renderStatusDot = (statusVal: string) => {
    const cleanVal = statusVal.toLowerCase();
    if (cleanVal === "ok" || cleanVal === "configured") {
      return (
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      );
    }
    if (cleanVal === "not_configured") {
      return <span className="h-2.5 w-2.5 rounded-full bg-slate-300" title="Yapılandırılmamış" />;
    }
    return (
      <span className="flex h-2.5 w-2.5 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" title={statusVal}></span>
      </span>
    );
  };

  const getStatusText = (statusVal: string) => {
    const cleanVal = statusVal.toLowerCase();
    if (cleanVal === "ok") return "Aktif / Çalışıyor";
    if (cleanVal === "configured") return "Yapılandırıldı";
    if (cleanVal === "not_configured") return "Yapılandırılmadı";
    if (cleanVal.startsWith("failed")) return "Hata Var";
    return statusVal;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
      
      {/* Platform Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 bg-slate-100 px-2.5 py-1 rounded-full">SaaS Super Admin</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2">Golabs ERP Platform Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Sistem sağlığı, lisanslar, destek çalışma alanı ve denetim geçmişi.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Yenile
          </button>
          <Link
            href="/platform/firmalar"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            Firmaları Yönet <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-250 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-bold">
          <button
            onClick={() => setDashboardTab("system")}
            className={`pb-3.5 border-b-2 transition-all ${
              dashboardTab === "system"
                ? "border-indigo-650 text-indigo-650"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Sistem İzleme & Entegrasyonlar
          </button>
          <button
            onClick={() => setDashboardTab("support")}
            className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 ${
              dashboardTab === "support"
                ? "border-indigo-650 text-indigo-650"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Destek Çalışma Alanı (Support Workspace)
            {activeSessions.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </nav>
      </div>

      {dashboardTab === "system" ? (
        <>
          {/* Grid of Basic Stats */}
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Firmalar</span>
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700"><Building2 className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{metrics?.total_tenants || 0}</p>
              <div className="flex gap-3 text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">
                <span className="text-emerald-600">Aktif: {metrics?.active_tenants || 0}</span>
                <span className="text-amber-600">Askıda: {metrics?.suspended_tenants || 0}</span>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kullanıcılar</span>
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Users className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{metrics?.total_users || 0}</p>
              <p className="text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">Platform genelindeki aktif hesaplar</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Projeler</span>
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Briefcase className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{metrics?.total_projects || 0}</p>
              <p className="text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">Tüm tenant&apos;lara ait şantiyeler</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">İş Emirleri</span>
                <div className="rounded-lg bg-violet-50 p-2 text-violet-700"><FileText className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{metrics?.total_work_orders || 0}</p>
              <p className="text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">Saha servis ve montaj emirleri</p>
            </article>
          </section>

          {/* Main Content Area */}
          <section className="grid gap-6 lg:grid-cols-3">
            
            {/* Integration Health Status Card */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Server className="h-4.5 w-4.5 text-indigo-500" /> Sistem ve Entegrasyon Sağlığı
                </h2>
                <span className="text-xs text-slate-400 font-medium">Anlık Sağlık Durumları</span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">PostgreSQL Veritabanı</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{health ? getStatusText(health.details.database) : "-"}</p>
                    </div>
                  </div>
                  <div>{health && renderStatusDot(health.details.database)}</div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Redis Cache & Kuyruk</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{health ? getStatusText(health.details.redis) : "-"}</p>
                    </div>
                  </div>
                  <div>{health && renderStatusDot(health.details.redis)}</div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Celery Arka Plan Worker</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{health ? getStatusText(health.details.celery) : "-"}</p>
                    </div>
                  </div>
                  <div>{health && renderStatusDot(health.details.celery)}</div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">WhatsApp Cloud API</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{health ? getStatusText(health.details.whatsapp) : "-"}</p>
                    </div>
                  </div>
                  <div>{health && renderStatusDot(health.details.whatsapp)}</div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50 sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Resend E-posta Altyapısı</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{health ? getStatusText(health.details.email) : "-"}</p>
                    </div>
                  </div>
                  <div>{health && renderStatusDot(health.details.email)}</div>
                </div>
              </div>
            </article>

            {/* Quick Actions Shortcuts */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" /> Hızlı Kısayollar
              </h2>
              <div className="space-y-2.5">
                <Link href="/platform/firmalar?tab=firmalar" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-650 hover:border-indigo-150 transition-all duration-150">
                  <span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-slate-400" /> Yeni Firma Ekle</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-405" />
                </Link>
                <Link href="/platform/firmalar?tab=lisans" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-650 hover:border-indigo-150 transition-all duration-150">
                  <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-slate-400" /> Plan & Lisans Yönetimi</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-405" />
                </Link>
                <Link href="/platform/firmalar?tab=audit" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-650 hover:border-indigo-150 transition-all duration-150">
                  <span className="flex items-center gap-2"><History className="h-4 w-4 text-slate-400" /> Audit Log (Denetim İzleri)</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-405" />
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-xs font-semibold text-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Kredileriniz başarıyla tanımlandı. Azure üzerinde Golabs ERP altyapısı bu panelden kontrol edilebilir durumdadır.</span>
              </div>
            </article>
          </section>

          {/* Plan Distribution and Recent Audits */}
          <section className="grid gap-6 lg:grid-cols-3">
            
            {/* Plan Distribution Widget */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Lisans & Plan Dağılımı</h2>
                <span className="text-xs text-slate-400 font-medium">Plan Oranları</span>
              </div>
              <div className="space-y-4">
                {!metrics || Object.keys(metrics.plan_distribution).length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 italic py-4">Aktif abonelik/plan verisi yok.</p>
                ) : (
                  Object.entries(metrics.plan_distribution).map(([planName, count]) => {
                    const total = metrics.active_tenants || 1;
                    const percentage = Math.min(100, Math.round((count / total) * 100));
                    return (
                      <div key={planName} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{planName}</span>
                          <span>{count} Firma ({percentage}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                          <div className="h-full bg-indigo-600" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            {/* Recent Audit Logs Widget */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <History className="h-4.5 w-4.5 text-indigo-500" /> Son Platform Olayları
                </h2>
                <Link href="/platform/firmalar?tab=audit" className="text-xs font-bold text-indigo-655 hover:text-indigo-700">Tümünü Gör</Link>
              </div>
              <div className="space-y-3">
                {recentAudit.length === 0 && (
                  <p className="text-xs font-semibold text-slate-400 italic py-4">Henüz audit kaydı bulunamadı.</p>
                )}
                {recentAudit.map((row) => (
                  <div key={row.id} className="rounded-xl border border-slate-150 p-4 bg-slate-50/30 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{row.action}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {new Date(row.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">Audit</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : (
        <>
          {/* Support Workspace Analytics */}
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bugünkü Destek Oturumu</span>
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Clock className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{analytics?.today_sessions_count || 0}</p>
              <p className="text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">Bugün başlatılan oturumlar</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Toplam Destek Oturumu</span>
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700"><BarChart3 className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{analytics?.total_sessions_count || 0}</p>
              <p className="text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">Tüm zamanların toplamı</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Erişim Modu Dağılımı</span>
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Unlock className="h-4.5 w-4.5" /></div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Salt Okunur: {analytics?.read_only_pct || 0}%</span>
                  <span>Yazma Yetkili: {analytics?.support_write_pct || 0}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-slate-100 flex">
                  <div className="h-full bg-slate-900" style={{ width: `${analytics?.read_only_pct || 50}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${analytics?.support_write_pct || 50}%` }} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ortalama Düzeltme Süresi</span>
                <div className="rounded-lg bg-purple-50 p-2 text-purple-700"><Clock className="h-4.5 w-4.5" /></div>
              </div>
              <p className="mt-2 text-4xl font-black text-slate-900">{analytics?.avg_duration_minutes || 0} dk</p>
              <p className="text-xs text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100">Oturum başına harcanan süre</p>
            </article>
          </section>

          {/* Active Context Sessions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-500" /> Aktif Destek Oturumları (Active Impersonations)
            </h2>
            {activeSessions.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 italic py-4">Şu an aktif bir destek bağlamı bulunmamaktadır.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-slate-700 font-semibold leading-normal">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-left bg-slate-50/50">
                      <th className="py-2.5 px-4">Firma Adı</th>
                      <th className="py-2.5 px-4">Erişim Yetkisi</th>
                      <th className="py-2.5 px-4">İşlem Gerekçesi</th>
                      <th className="py-2.5 px-4">Bilet No</th>
                      <th className="py-2.5 px-4">Başlangıç Zamanı</th>
                      <th className="py-2.5 px-4">Kalan Süre</th>
                      <th className="py-2.5 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSessions.map((session) => {
                      const expires = new Date(session.expires_at).getTime();
                      const now = new Date().getTime();
                      const diffMin = Math.max(0, Math.round((expires - now) / 60000));
                      return (
                        <tr key={session.id} className="hover:bg-slate-50/30">
                          <td className="py-3 px-4 font-bold text-slate-900">{session.tenant_name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              session.mode === "support_write"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                            }`}>
                              {session.mode === "support_write" ? "Yazma Yetkili" : "Salt Okunur"}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate">{session.reason || "-"}</td>
                          <td className="py-3 px-4"><code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800">{session.ticket_ref || "-"}</code></td>
                          <td className="py-3 px-4">{new Date(session.started_at).toLocaleString("tr-TR")}</td>
                          <td className="py-3 px-4 font-extrabold text-amber-600">{diffMin} dakika</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRevokeSession(session.id)}
                              disabled={actionBusy}
                              className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold border border-rose-200 transition-all text-[11px]"
                            >
                              Oturumu İptal Et
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Support Workspace History & Top Tenants */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Context Session History Table */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">Oturum Geçmişi</h2>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setHistoryRange("today")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      historyRange === "today" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => setHistoryRange("week")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      historyRange === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Bu Hafta
                  </button>
                  <button
                    onClick={() => setHistoryRange("month")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      historyRange === "month" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Bu Ay
                  </button>
                </div>
              </div>

              {historySessions.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 italic py-4">Bu zaman diliminde herhangi bir destek oturumu kaydı bulunmamaktadır.</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="min-w-full text-slate-700 font-semibold text-left">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-50/50">
                        <th className="py-2.5 px-4">Firma</th>
                        <th className="py-2.5 px-4">Yetki</th>
                        <th className="py-2.5 px-4">Bilet</th>
                        <th className="py-2.5 px-4">Gerekçe</th>
                        <th className="py-2.5 px-4">Süre</th>
                        <th className="py-2.5 px-4">Zaman</th>
                        <th className="py-2.5 px-4">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historySessions.map((session) => {
                        const started = new Date(session.started_at).getTime();
                        const ended = session.ended_at ? new Date(session.ended_at).getTime() : new Date(session.expires_at).getTime();
                        const min = Math.max(1, Math.round((ended - started) / 60000));
                        return (
                          <tr key={session.id} className="hover:bg-slate-50/30">
                            <td className="py-2.5 px-4 text-slate-900 font-bold">{session.tenant_name}</td>
                            <td className="py-2.5 px-4">
                              <span className={`text-[10px] font-bold ${session.mode === "support_write" ? "text-amber-600" : "text-slate-500"}`}>
                                {session.mode === "support_write" ? "Yazma" : "S.O"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{session.ticket_ref || "-"}</td>
                            <td className="py-2.5 px-4 max-w-[150px] truncate" title={session.reason || ""}>{session.reason || "-"}</td>
                            <td className="py-2.5 px-4 font-bold">{min} dk</td>
                            <td className="py-2.5 px-4 text-[10px] text-slate-400">{new Date(session.started_at).toLocaleDateString("tr-TR")}</td>
                            <td className="py-2.5 px-4">
                              <span className={`text-[10px] font-black uppercase ${
                                session.status === "ended"
                                  ? "text-slate-400"
                                  : session.status === "revoked"
                                  ? "text-rose-600"
                                  : session.status === "expired"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}>
                                {session.status === "ended" ? "Tamamlandı" : session.status === "revoked" ? "İptal Edildi" : session.status === "expired" ? "Süre Doldu" : "Aktif"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            {/* Top tenants receiving support */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800">En Çok Destek Verilen Firmalar</h2>
                <span className="text-xs text-slate-400 font-medium">Oturum Sayıları</span>
              </div>
              <div className="space-y-3.5">
                {!analytics || analytics.top_tenants.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 italic py-4">Herhangi bir destek oturumu kaydı yok.</p>
                ) : (
                  analytics.top_tenants.map((item, idx) => (
                    <div key={item.tenant_name} className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-3">
                        <span className="h-5 w-5 bg-slate-100 text-[10px] font-black text-slate-500 rounded-full flex items-center justify-center border">
                          #{idx + 1}
                        </span>
                        <span className="text-slate-800">{item.tenant_name}</span>
                      </div>
                      <span className="text-indigo-650 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded font-extrabold">
                        {item.count} Oturum
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        </>
      )}

    </div>
  );
}

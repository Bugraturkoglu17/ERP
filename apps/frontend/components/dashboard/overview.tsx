"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Package, 
  Briefcase, 
  DollarSign,
  ArrowRight,
  AlertTriangle,
  CircleCheck,
  Clock3,
  Plus,
  ClipboardList
} from "lucide-react";
import { apiGet } from "@/lib/api";

const KPI_LINKS = ["/projects", "/inventory", "/finance", "/finance"];
const SUMMARY_LINKS = {
  inquiry: "/projects",
  approved: "/projects",
  inProgress: "/projects",
  completed: "/projects",
};

export function DashboardOverview() {
  const [stats, setStats] = useState<{label: string, value: string, icon: any, color: string, bg: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [summary, setSummary] = useState({ inquiry: 0, approved: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    const statusMap: Record<string, string> = {
      inquiry: "Keşif / Keşif Aşaması",
      approved: "Onaylandı / Başlayacak",
      in_progress: "Sahada / Devam Ediyor",
      completed: "Tamamlandı",
      cancelled: "İptal Edildi",
    };

    function getStatusLabel(status: unknown): string {
      const key = String(status || "").toLowerCase();
      return statusMap[key] || (key ? key.replaceAll("_", " ") : "Bilinmiyor");
    }

    function getStatusBadgeClass(status: unknown): string {
      const key = String(status || "").toLowerCase();
      if (key === "approved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
      if (key === "in_progress") return "bg-blue-100 text-blue-700 border-blue-200";
      if (key === "inquiry") return "bg-violet-100 text-violet-700 border-violet-200";
      if (key === "completed") return "bg-slate-200 text-slate-700 border-slate-300";
      if (key === "cancelled") return "bg-rose-100 text-rose-700 border-rose-200";
      return "bg-slate-100 text-slate-600 border-slate-200";
    }

    async function fetchData() {
      try {
        const [projectsRes, materialsRes, invoicesRes, alertsRes] = await Promise.all([
          apiGet("/projects").catch(() => []),
          apiGet("/inventory/materials").catch(() => []),
          apiGet("/finance/invoices").catch(() => []),
          apiGet("/inventory/alerts/low-stock").catch(() => []),
        ]);

        const projects = Array.isArray(projectsRes) ? projectsRes : [];
        const materials = Array.isArray(materialsRes) ? materialsRes : [];
        const invoices = Array.isArray(invoicesRes) ? invoicesRes : [];
        const alerts = Array.isArray(alertsRes) ? alertsRes : [];

        const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (Number(inv?.grand_total) || 0), 0);
        const activeProjects = projects.length;
        const inquiryCount = projects.filter((p: any) => p?.status === "inquiry").length;
        const approvedCount = projects.filter((p: any) => p?.status === "approved").length;
        const inProgressCount = projects.filter((p: any) => p?.status === "in_progress").length;
        const completedCount = projects.filter((p: any) => p?.status === "completed").length;
        const orderedProjects = [...projects].sort((a: any, b: any) => {
          const aTime = new Date(a?.created_at || a?.updated_at || 0).getTime();
          const bTime = new Date(b?.created_at || b?.updated_at || 0).getTime();
          return bTime - aTime;
        });

        setStats([
          { label: "Aktif Projeler", value: activeProjects.toString(), icon: Briefcase, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Toplam Stok Kalemi", value: materials.length.toString(), icon: Package, color: "text-orange-600", bg: "bg-orange-100" },
          { label: "Toplam Ciro", value: `₺${(totalRevenue / 1000000).toFixed(2)}M`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
          { label: "Genel Karlılık", value: "%24", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
        ]);

        setRecentProjects(
          orderedProjects.slice(0, 5).map((project: any) => ({
            ...project,
            statusLabel: getStatusLabel(project?.status),
            statusClass: getStatusBadgeClass(project?.status),
          }))
        );
        setSummary({
          inquiry: inquiryCount,
          approved: approvedCount,
          inProgress: inProgressCount,
          completed: completedCount,
        });
        setLowStock(alerts);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500">Yükleniyor...</div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 p-5 sm:p-7 lg:p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Operasyon Panosu</h2>
            <p className="text-slate-300 mt-2 text-xs sm:text-sm max-w-2xl">
              Proje, stok ve finans göstergelerini tek ekranda izleyin; kritik aksiyon gerektiren kalemleri anında yakalayın.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <a href="/projects" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Yeni Proje
            </a>
            <a href="/finance" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 transition-colors">
              <ClipboardList className="w-4 h-4" /> Finans Detayı
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <a
            key={i}
            href={KPI_LINKS[i] || "/projects"}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`p-3.5 rounded-xl ${stat.bg} ${stat.color} border border-current/10`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{String(stat.value)}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <a href={SUMMARY_LINKS.inquiry} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 hover:shadow-sm transition-shadow">
          <p className="text-[11px] uppercase tracking-wide font-bold text-violet-700">Keşif Aşaması</p>
          <p className="text-2xl font-black text-violet-900 mt-1">{summary.inquiry}</p>
        </a>
        <a href={SUMMARY_LINKS.approved} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 hover:shadow-sm transition-shadow">
          <p className="text-[11px] uppercase tracking-wide font-bold text-emerald-700">Onaylı Plan</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{summary.approved}</p>
        </a>
        <a href={SUMMARY_LINKS.inProgress} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 hover:shadow-sm transition-shadow">
          <p className="text-[11px] uppercase tracking-wide font-bold text-blue-700">Sahada Devam</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{summary.inProgress}</p>
        </a>
        <a href={SUMMARY_LINKS.completed} className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 hover:shadow-sm transition-shadow">
          <p className="text-[11px] uppercase tracking-wide font-bold text-slate-700">Tamamlanan</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary.completed}</p>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm min-h-[20rem] flex flex-col hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-slate-800">Son Projeler</h3>
            <a href="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">
              Tumunu Gor <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {recentProjects.length > 0 ? (
              recentProjects.map((p: any, idx: number) => (
                <div key={p?.id || idx} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all duration-200">
                  <span className="text-sm font-semibold text-slate-800">{String(p?.name || "Adsız Proje")}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${String(p?.statusClass || "bg-slate-100 text-slate-600 border-slate-200")}`}>
                    {String(p?.statusLabel || "Bilinmiyor")}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic">Proje bulunamadı.</div>
            )}
          </div>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm min-h-[20rem] flex flex-col hover:shadow-md transition-all duration-200">
          <h3 className="text-md font-bold text-slate-800 mb-4">Kritik Stok Uyarilari</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {lowStock.length > 0 ? (
              lowStock.map((a: any, idx: number) => (
                <div key={a?.id || idx} className="flex items-center justify-between p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 hover:bg-rose-50 transition-all duration-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-sm font-semibold text-rose-800">Kritik Seviye</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-lg border border-rose-200 uppercase tracking-wider">Miktar: {String(a?.current_stock ?? "N/A")}</span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 text-emerald-600 font-medium">
                <CircleCheck className="w-4 h-4" /> Kritik stok uyarısı bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <a href="/projects" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700"><Clock3 className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Gunluk Aksiyon</p>
              <p className="text-xs text-slate-500 mt-1">Keşif aşamasındaki projelerin teklif geçişlerini kontrol edin.</p>
          </div>
        </a>
        <a href="/inventory" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700"><Package className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Stok Takibi</p>
              <p className="text-xs text-slate-500 mt-1">Kritik ürünler için sipariş planını haftalık olarak güncelleyin.</p>
          </div>
        </a>
        <a href="/finance" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700"><TrendingUp className="w-5 h-5" /></div>
          <div>
              <p className="text-sm font-semibold text-slate-800">Finans Özeti</p>
              <p className="text-xs text-slate-500 mt-1">Tahsilat ve gider trendini finans panelinden detaylandırın.</p>
          </div>
        </a>
      </div>
    </div>
  );
}

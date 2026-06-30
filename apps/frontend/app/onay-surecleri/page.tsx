"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle2, Clock, Download,
  FolderOpen, Loader2, RefreshCw, XCircle,
} from "lucide-react";
import { apiGet, apiPatch, apiPost, buildApiUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/session";

type ApprovalRequest = {
  id: string;
  project_id: string;
  project_name?: string;
  project_no?: string;
  approval_type: string;
  title: string;
  description?: string;
  amount?: number;
  file_url?: string;
  file_name?: string;
  status: string;
  requested_by_name?: string;
  requested_at: string;
  approved_by_name?: string;
  approved_at?: string;
  note?: string;
};

// Sidebar'daki ?tip= değerleri ile DB'deki approval_type değerlerinin eşlemesi
// Sidebar: ?tip=hakkediş  → DB: approval_type="hakkediş"
// Sidebar: ?tip=fatura    → DB: approval_type="fatura"
// Sidebar: ?tip=proje     → DB: approval_type="proje"
// Sidebar: ?tip=teklif    → DB: approval_type="teklif"
// Sidebar: ?tip=is_tamamlandi → DB: approval_type="is_tamamlandi"
const TABS: { key: string; label: string }[] = [
  { key: "",               label: "Tümü"                },
  { key: "hakkediş",      label: "Hakkediş Onayı"      },
  { key: "fatura",        label: "Fatura Onayı"         },
  { key: "proje",         label: "Proje Onayı"          },
  { key: "teklif",        label: "Teklif Onayı"         },
  { key: "is_tamamlandi", label: "İş Tamamlandı Onayı" },
];

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  "hakkediş":      "Hakkediş",
  "fatura":        "Fatura",
  "proje":         "Proje",
  "teklif":        "Teklif",
  "is_tamamlandi": "İş Tamamlandı",
  "mail":          "Mail Onayı",
};

const STATUS_CFG: Record<string, { label: string; icon: typeof CheckCircle2; dot: string; badge: string }> = {
  bekliyor:    { label: "Onay Bekliyor",    icon: Clock,        dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700"   },
  onaylandi:   { label: "Onaylandı",        icon: CheckCircle2, dot: "bg-green-400",  badge: "bg-green-50 text-green-700"   },
  reddedildi:  { label: "Reddedildi",       icon: XCircle,      dot: "bg-red-400",    badge: "bg-red-50 text-red-700"       },
  revizyon:    { label: "Revizyon İstendi", icon: AlertCircle,  dot: "bg-purple-400", badge: "bg-purple-50 text-purple-700" },
  iptal:       { label: "İptal Edildi",     icon: XCircle,      dot: "bg-slate-300",  badge: "bg-slate-100 text-slate-500"  },
  tamamlandi:  { label: "Tamamlandı",       icon: CheckCircle2, dot: "bg-slate-300",  badge: "bg-slate-100 text-slate-600"  },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAmount(amount?: number) {
  if (!amount) return null;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
}

function OnayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL'den aktif tip filtresini oku ("" = tümü)
  const activeType = searchParams.get("tip") ?? "";

  const [approvals,    setApprovals]    = useState<ApprovalRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [actingId,     setActingId]     = useState<string | null>(null);
  const [syncing,      setSyncing]      = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await apiGet<ApprovalRequest[]>("/approvals").catch(() => []);
    setApprovals(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiPost<{ synced: number; message: string }>(
        "/progress-payments/sync-approvals", {}
      );
      alert(res?.message ?? "Senkronizasyon tamamlandı.");
      await load();
    } catch {
      alert("Senkronizasyon başarısız.");
    } finally { setSyncing(false); }
  };

  const openDoc = async (docId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(buildApiUrl(`/documents/${docId}/download`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      alert("Dosya açılamadı.");
    }
  };

  const act = async (id: string, status: string, note?: string) => {
    setActingId(id);
    try {
      await apiPatch(`/approvals/${id}`, { status, note });
      await load();
    } finally { setActingId(null); }
  };

  // Tip sekmesine tıklayınca URL'yi güncelle (sidebar ile senkronize)
  const setType = (key: string) => {
    if (key === "") {
      router.push("/onay-surecleri");
    } else {
      router.push(`/onay-surecleri?tip=${key}`);
    }
  };

  // Her iki filtre bağımsız çalışır
  const displayed = approvals.filter((a) => {
    const typeMatch   = activeType === "" || a.approval_type === activeType;
    const statusMatch = statusFilter === "" || a.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const countByType = (key: string) =>
    key === "" ? approvals.length : approvals.filter((a) => a.approval_type === key).length;

  const pendingCount = approvals.filter((a) => a.status === "bekliyor").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Onay Süreçleri</h1>
            <p className="text-xs text-slate-500">Hakkediş, fatura, proje ve teklif onayları</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Durum filtresi */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="bekliyor">Onay Bekliyor</option>
            <option value="onaylandi">Onaylandı</option>
            <option value="reddedildi">Reddedildi</option>
            <option value="revizyon">Revizyon İstendi</option>
            <option value="iptal">İptal Edildi</option>
            <option value="tamamlandi">Tamamlandı</option>
          </select>
          {/* Kopuk kayıtları senkronize et */}
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Onaya gönderilmiş ama Onay Süreçleri'nde görünmeyen hakkedişleri senkronize eder"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Senkronize Et
          </button>
        </div>
      </div>

      {/* Bekleyen uyarı bandı */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {pendingCount} onay talebi bekliyor
          </p>
        </div>
      )}

      {/* Tip sekmeleri — URL ile senkronize */}
      <div className="flex gap-0.5 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`shrink-0 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeType === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeType === t.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
            }`}>
              {countByType(t.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle2 className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">
            {activeType
              ? `${APPROVAL_TYPE_LABELS[activeType] ?? activeType} onayı bulunamadı.`
              : "Onay talebi bulunamadı."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((a) => {
            const st = STATUS_CFG[a.status] ?? STATUS_CFG.bekliyor;
            const Icon = st.icon;
            const isPending = a.status === "bekliyor";
            const amt = fmtAmount(a.amount);
            return (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                  <div className="flex-1 min-w-0">
                    {/* Üst satır */}
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                            {APPROVAL_TYPE_LABELS[a.approval_type] ?? a.approval_type}
                          </span>
                          {a.project_no && (
                            <span className="text-[10px] font-mono text-slate-400">{a.project_no}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{a.title}</p>
                        {a.project_name && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{a.project_name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.badge}`}>
                        <Icon className="h-3 w-3" /> {st.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      <span>{a.requested_by_name ?? "—"}</span>
                      <span>{fmtDate(a.requested_at)}</span>
                      {amt && <span className="font-semibold text-slate-700">{amt}</span>}
                      {a.file_name && <span>{a.file_name}</span>}
                    </div>
                    {a.note && (
                      <p className="text-[11px] text-slate-500 italic mt-1">Not: {a.note}</p>
                    )}
                    {a.approved_by_name && a.approved_at && (
                      <p className="text-[11px] text-green-600 mt-1">
                        {a.approved_by_name} tarafından {fmtDate(a.approved_at)} tarihinde onaylandı.
                      </p>
                    )}

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Link
                        href={`/projects/${a.project_id}`}
                        className="flex items-center gap-1 text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50"
                      >
                        <FolderOpen className="h-3 w-3" /> Detaya Git
                      </Link>
                      {a.file_url && (
                        <button
                          onClick={() => openDoc(a.file_url!)}
                          className="flex items-center gap-1 text-[11px] text-blue-600 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-blue-50"
                        >
                          <Download className="h-3 w-3" /> Dosyayı Aç
                        </button>
                      )}
                      {isPending && (
                        <>
                          <button
                            onClick={() => act(a.id, "onaylandi")}
                            disabled={actingId === a.id}
                            className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 disabled:opacity-50"
                          >
                            {actingId === a.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <CheckCircle2 className="h-3 w-3" />}
                            Onayla
                          </button>
                          <button
                            onClick={() => act(a.id, "revizyon", "Revizyon gerekiyor")}
                            disabled={actingId === a.id}
                            className="flex items-center gap-1 text-[11px] text-purple-700 border border-purple-100 rounded-lg px-2.5 py-1 hover:bg-purple-50 disabled:opacity-50"
                          >
                            <AlertCircle className="h-3 w-3" /> Revizyon İste
                          </button>
                          <button
                            onClick={() => act(a.id, "reddedildi")}
                            disabled={actingId === a.id}
                            className="flex items-center gap-1 text-[11px] text-red-600 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" /> Reddet
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// useSearchParams Suspense zorunluluğu için wrapper
export default function OnayPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <OnayPage />
    </Suspense>
  );
}

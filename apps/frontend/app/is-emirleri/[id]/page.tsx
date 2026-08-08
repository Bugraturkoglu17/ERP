"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Store,
  User,
  X,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkOrder = {
  id: string; project_id: string; project_name?: string; project_no?: string;
  work_type: string; work_type_label: string; title: string; description?: string;
  assigned_to_name?: string; assigned_to_phone?: string;
  priority: string; status: string; status_label: string;
  completion_notes?: string;
  sent_at?: string; started_at?: string; completed_at?: string;
  created_by_name?: string; created_at: string;
  photo_count: number;
};

type WOPhoto = {
  id: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  photo_type: string;
  uploaded_by_name?: string;
  uploaded_at: string;
  is_added_to_inventory: boolean;
  vi_doc_id?: string;
  fresh_url?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  draft:            "bg-slate-100 text-slate-600",
  sent:             "bg-blue-50 text-blue-700",
  started:          "bg-amber-50 text-amber-700",
  completed:        "bg-emerald-50 text-emerald-700",
  failed:           "bg-red-50 text-red-700",
  cancelled:        "bg-slate-100 text-slate-500",
  material_waiting: "bg-orange-50 text-orange-700",
  revisit:          "bg-purple-50 text-purple-700",
  approval_pending: "bg-yellow-50 text-yellow-700",
  approved:         "bg-emerald-100 text-emerald-800",
};

const PRIORITY_LABEL: Record<string, string> = {
  normal: "Normal", urgent: "Acil", critical: "Kritik",
};

const VI_CATEGORIES = [
  { value: "klima",        label: "Klima"              },
  { value: "yangin",       label: "Yangın Sistemi"     },
  { value: "sprinkler",    label: "Sprinkler"          },
  { value: "havalandirma", label: "Havalandırma"       },
  { value: "sogutma",      label: "Soğutma"            },
  { value: "elektrik",     label: "Elektrik/Pano"      },
  { value: "pompa",        label: "Pompa Odası"        },
  { value: "genel",        label: "Genel Teknik Alan"  },
  { value: "ariza",        label: "Arıza Görseli"      },
  { value: "bakim",        label: "Bakım Sonrası"      },
  { value: "saha_gorseli", label: "Saha Görseli"       },
  { value: "diger",        label: "Diğer"              },
];

// ── Lightbox ───────────────────────────────────────────────────────────────────

function Lightbox({
  photos, index, onClose, onPrev, onNext,
}: {
  photos: WOPhoto[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const photo = photos[index];
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <div className="flex flex-col items-center gap-4 max-w-4xl w-full px-16" onClick={(e) => e.stopPropagation()}>
        {photo.fresh_url ? (
          <img src={photo.fresh_url} alt={photo.file_name ?? "foto"} className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl" />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-white/10">
            <ImageIcon className="h-12 w-12 text-white/30" />
          </div>
        )}
        <div className="w-full rounded-xl bg-white/10 px-4 py-3 text-white text-sm space-y-1">
          <p className="font-medium">{photo.file_name ?? "—"}</p>
          <p className="text-[12px] text-white/60">
            {photo.uploaded_by_name ?? "Saha"} · {new Date(photo.uploaded_at).toLocaleDateString("tr-TR")}
            {photo.is_added_to_inventory && " · ✓ Mağaza Kartına Eklendi"}
          </p>
        </div>
        <p className="text-xs text-white/40">{index + 1} / {photos.length}</p>
      </div>
      {index < photos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

// ── Transfer Modal ─────────────────────────────────────────────────────────────

function TransferModal({
  woId, photoIds, onClose, onDone,
}: {
  woId: string; photoIds: string[];
  onClose: () => void; onDone: () => void;
}) {
  const [category, setCategory] = useState("saha_gorseli");
  const [title, setTitle]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");

  const handleTransfer = async () => {
    setBusy(true); setErr("");
    try {
      const res = await apiPost<{ total_added: number; skipped: string[] }>(
        `/work-orders/${woId}/add-photos-to-inventory`,
        { photo_ids: photoIds, category, title: title.trim() || null }
      );
      onDone();
    } catch (ex: any) {
      setErr(ex?.response?.data?.detail ?? "Aktarım başarısız.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Mağaza Kartına Ekle</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{photoIds.length} fotoğraf seçildi</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Görsel Kategorisi</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {VI_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Başlık (İsteğe Bağlı)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ör: Klima montaj sonrası..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
            <p className="text-xs text-blue-700">
              Seçilen fotoğraflar mağaza kartındaki <strong>Görsel Envanter</strong> sekmesine eklenecek.
              Kaynak bilgisi ile birlikte saklanacak.
            </p>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Vazgeç
            </button>
            <button onClick={handleTransfer} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [wo,      setWo]      = useState<WorkOrder | null>(null);
  const [photos,  setPhotos]  = useState<WOPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(true);

  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");

  const loadPhotos = useCallback(async () => {
    if (!id) return;
    setPhotoLoading(true);
    const d = await apiGet<WOPhoto[]>(`/work-orders/${id}/photos`).catch(() => [] as WOPhoto[]);
    setPhotos(Array.isArray(d) ? d : []);
    setPhotoLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<WorkOrder>(`/work-orders/${id}`)
      .then((d) => setWo(d))
      .catch(() => setWo(null))
      .finally(() => setLoading(false));
    loadPhotos();
  }, [id, loadPhotos]);

  const toggleSelect = (photoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const toggleAll = () => {
    const eligible = photos.filter((p) => !p.is_added_to_inventory).map((p) => p.id);
    if (selected.size === eligible.length && eligible.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible));
    }
  };

  const handleTransferDone = async () => {
    setTransferOpen(false);
    setSelected(new Set());
    await loadPhotos();
    setSuccessMsg("Seçilen fotoğraflar mağaza kartına eklendi.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ClipboardList className="h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-500">İş emri bulunamadı.</p>
        <Link href="/is-emirleri" className="text-sm text-blue-600 hover:underline">← İş Emirleri</Link>
      </div>
    );
  }

  const eligiblePhotos = photos.filter((p) => !p.is_added_to_inventory);
  const allEligibleSelected = eligiblePhotos.length > 0 && selected.size === eligiblePhotos.length;
  const statusCls = STATUS_COLOR[wo.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/is-emirleri" className="flex items-center gap-1 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> İş Emirleri
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium truncate max-w-xs">{wo.title}</span>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
        </div>
      )}

      {/* İş Emri Bilgisi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusCls}`}>
                {wo.status_label}
              </span>
              <span className="text-[11px] font-medium border border-slate-200 rounded-full px-2 py-0.5 text-slate-600">
                {wo.work_type_label}
              </span>
              <span className="text-[11px] text-slate-400">
                {PRIORITY_LABEL[wo.priority] ?? wo.priority}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{wo.title}</h1>
            {wo.description && (
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{wo.description}</p>
            )}
          </div>
          <Link
            href={`/projects/${wo.project_id}?tab=visual_inventory`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Store className="h-3.5 w-3.5" /> Mağaza Kartı
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
        </div>

        {/* Bilgi grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Mağaza</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{wo.project_name ?? "—"}</p>
            {wo.project_no && <p className="text-[11px] text-slate-400 font-mono">{wo.project_no}</p>}
          </div>
          {(wo.assigned_to_name || wo.assigned_to_phone) && (
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Sorumlu</p>
              <p className="text-sm text-slate-700 mt-0.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {wo.assigned_to_name ?? wo.assigned_to_phone}
              </p>
              {wo.assigned_to_name && wo.assigned_to_phone && (
                <p className="text-[11px] text-slate-400">{wo.assigned_to_phone}</p>
              )}
            </div>
          )}
          {wo.completed_at && (
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Tamamlanma</p>
              <p className="text-sm text-slate-700 mt-0.5">{new Date(wo.completed_at).toLocaleDateString("tr-TR")}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Oluşturulma</p>
            <p className="text-sm text-slate-700 mt-0.5">{new Date(wo.created_at).toLocaleDateString("tr-TR")}</p>
            {wo.created_by_name && <p className="text-[11px] text-slate-400">{wo.created_by_name}</p>}
          </div>
        </div>

        {/* Tamamlama notu */}
        {wo.completion_notes && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Saha Notu</p>
            <p className="text-sm text-amber-900 leading-relaxed">{wo.completion_notes}</p>
          </div>
        )}
      </div>

      {/* Fotoğraflar */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Fotoğraf başlık + aksiyon barı */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <Camera className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">
              Saha Fotoğrafları
            </h2>
            {!photoLoading && (
              <span className="text-[11px] text-slate-400">{photos.length} adet</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {eligiblePhotos.length > 0 && (
              <button onClick={toggleAll}
                className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                {allEligibleSelected ? "Seçimi Kaldır" : "Tümünü Seç"}
              </button>
            )}
            {selected.size > 0 && (
              <button
                onClick={() => setTransferOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Store className="h-3.5 w-3.5" />
                {selected.size} Fotoğrafı Mağaza Kartına Ekle
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          {photoLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Camera className="h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">Bu iş emrinde henüz fotoğraf bulunmuyor.</p>
            </div>
          ) : (
            <>
              {/* Seçim özeti */}
              {selected.size > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-blue-800">
                    {selected.size} fotoğraf seçildi.
                    {eligiblePhotos.length - selected.size > 0 && (
                      <span className="text-blue-600 ml-1">
                        {eligiblePhotos.length - selected.size} daha seçilebilir.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, idx) => {
                  const isSelected = selected.has(photo.id);
                  const isEligible = !photo.is_added_to_inventory;
                  return (
                    <div key={photo.id} className="relative group">
                      {/* Checkbox — sadece henüz eklenmemiş fotoğraflarda */}
                      {isEligible && (
                        <button
                          onClick={() => toggleSelect(photo.id)}
                          className={`absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors shadow-sm ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "bg-white/80 border-slate-300 hover:border-blue-400"
                          }`}
                        >
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Eklendi badge */}
                      {photo.is_added_to_inventory && (
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 backdrop-blur-sm">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                          <span className="text-[10px] font-semibold text-white">Eklendi</span>
                        </div>
                      )}

                      {/* Thumbnail */}
                      <button
                        onClick={() => setLightboxIdx(idx)}
                        className={`w-full aspect-square overflow-hidden rounded-xl border transition-all ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-400"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {photo.fresh_url ? (
                          <img
                            src={photo.fresh_url}
                            alt={photo.file_name ?? "foto"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </button>

                      {/* Alt bilgi */}
                      <div className="mt-1.5 px-0.5">
                        <p className="text-[10px] text-slate-500 truncate">{photo.file_name ?? "—"}</p>
                        <p className="text-[10px] text-slate-400">
                          {photo.uploaded_by_name ?? "Saha"} · {new Date(photo.uploaded_at).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alt aksiyon */}
              {selected.size > 0 && (
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setTransferOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
                  >
                    <Store className="h-4 w-4" />
                    Seçilen {selected.size} Fotoğrafı Mağaza Kartına Ekle
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIdx((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
        />
      )}

      {/* Transfer Modal */}
      {transferOpen && (
        <TransferModal
          woId={wo.id}
          photoIds={Array.from(selected)}
          onClose={() => setTransferOpen(false)}
          onDone={handleTransferDone}
        />
      )}
    </div>
  );
}

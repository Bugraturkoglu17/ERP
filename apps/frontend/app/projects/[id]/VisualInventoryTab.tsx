"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  X,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { ZoomableImage } from "@/components/ui/zoomable-image";

// ── Types ──────────────────────────────────────────────────────────────────────

type Document = {
  id: string;
  original_name: string;
  doc_type: string;
  version: number;
  vi_meta?: string;
  uploaded_by_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  created_at: string;
};

type ViMeta = {
  c?: string;
  t?: string;
  dt?: string;
  l?: string;
  tags?: string;
  source?: string;
  wo_id?: string;
  wo_title?: string;
  reporter?: string;
  wo_date?: string;
};

// ── Visual Categories ──────────────────────────────────────────────────────────

const VI_CATEGORIES: { value: string; label: string }[] = [
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
  { value: "diger",        label: "Diğer"              },
];

const getCategoryLabel = (val?: string) =>
  VI_CATEGORIES.find((c) => c.value === val)?.label ?? val ?? "—";

function parseMeta(raw?: string): ViMeta {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ── Photo Card ─────────────────────────────────────────────────────────────────

function PhotoCard({ doc, onClick }: { doc: Document; onClick: () => void }) {
  const meta = parseMeta(doc.vi_meta);
  const [url, setUrl] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    apiGet<{ url: string }>(`/documents/${doc.id}/download`)
      .then((d) => setUrl(d?.url ?? null))
      .catch(() => setImgErr(true));
  }, [doc.id]);

  const isImage = doc.mime_type?.startsWith("image/") ?? true;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-square hover:border-blue-300 hover:shadow-md transition-all text-left w-full"
    >
      {url && isImage && !imgErr ? (
        <img
          src={url}
          alt={meta.t ?? doc.original_name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-slate-300" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {meta.c && (
        <span className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {getCategoryLabel(meta.c)}
        </span>
      )}
      {meta.source === "work_order" && (
        <span className="absolute top-2 right-2 rounded-full bg-blue-600/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm flex items-center gap-1">
          <ClipboardList className="h-2.5 w-2.5" /> İş Emri
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs font-medium text-white truncate leading-tight">
          {meta.t ?? doc.original_name}
        </p>
        {meta.dt && (
          <p className="text-[10px] text-white/70 mt-0.5">
            {new Date(meta.dt).toLocaleDateString("tr-TR")}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────────

function Lightbox({
  docs, index, onClose, onPrev, onNext,
}: {
  docs: Document[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const doc = docs[index];
  const meta = parseMeta(doc?.vi_meta);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    setUrl(null);
    apiGet<{ url: string }>(`/documents/${doc.id}/download`)
      .then((d) => setUrl(d?.url ?? null))
      .catch(() => {});
  }, [doc?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10">
        <X className="h-5 w-5" />
      </button>

      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Güvenli alan: header/footer çıkarılmış, kaydırılabilir kolon */}
      <div className="min-h-0 flex-1 flex flex-col items-center gap-4 overflow-y-auto px-4 py-14 sm:px-20" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-w-4xl min-h-[45vh] flex-1 flex items-center justify-center">
          {url ? (
            <ZoomableImage src={url} alt={meta.t ?? doc.original_name}
              className="rounded-xl shadow-2xl" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-white/10">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}
        </div>

        <div className="w-full max-w-4xl rounded-xl bg-white/10 backdrop-blur-sm px-5 py-4 text-white space-y-1">
          <p className="font-semibold text-sm">{meta.t ?? doc.original_name}</p>
          <div className="flex flex-wrap gap-3 text-[12px] text-white/70">
            {meta.c && (
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />{getCategoryLabel(meta.c)}
              </span>
            )}
            {meta.dt && <span>{new Date(meta.dt).toLocaleDateString("tr-TR")}</span>}
            {meta.l && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />{meta.l}
              </span>
            )}
            {doc.uploaded_by_name && <span>{doc.uploaded_by_name}</span>}
          </div>
          {meta.tags && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meta.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{tag}</span>
              ))}
            </div>
          )}
          {meta.source === "work_order" && (
            <div className="mt-3 border-t border-white/20 pt-3 space-y-1 text-[12px] text-white/70">
              <p className="flex items-center gap-1.5 font-semibold text-blue-300">
                <ClipboardList className="h-3.5 w-3.5" /> İş Emrinden Aktarıldı
              </p>
              {meta.wo_title && <p>İş Emri: {meta.wo_title}</p>}
              {meta.reporter && <p>Bildiren: {meta.reporter}</p>}
              {meta.wo_date && <p>Tarih: {new Date(meta.wo_date).toLocaleDateString("tr-TR")}</p>}
            </div>
          )}
        </div>

        <p className="text-xs text-white/40">{index + 1} / {docs.length}</p>
      </div>

      {index < docs.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

// ── Main Tab Component ─────────────────────────────────────────────────────────

export default function VisualInventoryTab({
  projectId: _projectId,
  docs,
}: {
  projectId: string;
  docs: Document[];
}) {
  const [lightboxIdx, setLightboxIdx]       = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredDocs = filterCategory === "all"
    ? docs
    : docs.filter((d) => parseMeta(d.vi_meta).c === filterCategory);

  const usedCategories = Array.from(
    new Set(docs.map((d) => parseMeta(d.vi_meta).c).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {usedCategories.length > 0 && (
          <>
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setFilterCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterCategory === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Tümü <span className="ml-0.5 opacity-70">({docs.length})</span>
            </button>
            {usedCategories.map((cat) => {
              const count = docs.filter((d) => parseMeta(d.vi_meta).c === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    filterCategory === cat
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {getCategoryLabel(cat)} <span className="ml-0.5 opacity-70">({count})</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Camera className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">
            {docs.length === 0
              ? "Bu mağazaya ait görsel bulunmuyor."
              : "Bu kategoride görsel yok."}
          </p>
          {docs.length === 0 && (
            <p className="text-xs text-slate-300">Görseller Genel Arşiv üzerinden bu sekmeye taşınabilir.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredDocs.map((doc, idx) => (
            <PhotoCard key={doc.id} doc={doc} onClick={() => setLightboxIdx(idx)} />
          ))}
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          docs={filteredDocs}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIdx((i) => (i !== null && i < filteredDocs.length - 1 ? i + 1 : i))}
        />
      )}
    </div>
  );
}

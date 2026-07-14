"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { apiGet, buildApiUrl } from "@/lib/api";

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
  c?: string;        // category
  t?: string;        // title
  dt?: string;       // captured_at (YYYY-MM-DD)
  l?: string;        // location_note
  tags?: string;     // comma-separated
  // iş emrinden geldiyse:
  source?: string;   // "work_order" | "manual"
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

function PhotoCard({
  doc,
  onClick,
}: {
  doc: Document;
  onClick: () => void;
}) {
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
      {/* Thumbnail */}
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

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Category badge */}
      {meta.c && (
        <span className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {getCategoryLabel(meta.c)}
        </span>
      )}
      {/* Source badge */}
      {meta.source === "work_order" && (
        <span className="absolute top-2 right-2 rounded-full bg-blue-600/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm flex items-center gap-1">
          <ClipboardList className="h-2.5 w-2.5" /> İş Emri
        </span>
      )}

      {/* Bottom info */}
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
  docs,
  index,
  onClose,
  onPrev,
  onNext,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div className="flex flex-col items-center gap-4 max-w-4xl w-full px-16" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-h-[70vh] flex items-center justify-center">
          {url ? (
            <img
              src={url}
              alt={meta.t ?? doc.original_name}
              className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-white/10">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}
        </div>

        {/* Meta panel */}
        <div className="w-full rounded-xl bg-white/10 backdrop-blur-sm px-5 py-4 text-white space-y-1">
          <p className="font-semibold text-sm">{meta.t ?? doc.original_name}</p>
          <div className="flex flex-wrap gap-3 text-[12px] text-white/70">
            {meta.c && (
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />{getCategoryLabel(meta.c)}
              </span>
            )}
            {meta.dt && (
              <span>{new Date(meta.dt).toLocaleDateString("tr-TR")}</span>
            )}
            {meta.l && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />{meta.l}
              </span>
            )}
            {doc.uploaded_by_name && (
              <span>{doc.uploaded_by_name}</span>
            )}
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

      {/* Next */}
      {index < docs.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

// ── Upload Modal ───────────────────────────────────────────────────────────────

function UploadModal({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [files, setFiles]           = useState<File[]>([]);
  const [category, setCategory]     = useState("");
  const [title, setTitle]           = useState("");
  const [capturedAt, setCapturedAt] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation]     = useState("");
  const [tags, setTags]             = useState("");
  const [busy, setBusy]             = useState(false);
  const [err, setErr]               = useState("");
  const [progress, setProgress]     = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(isImageFile);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const isImageFile = (f: File) =>
    /image\/(jpeg|png|webp|heic|heif)/i.test(f.type) || /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(f.name);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter(isImageFile);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { setErr("En az bir fotoğraf seçin."); return; }
    setBusy(true); setErr(""); setProgress(0);

    const viMeta: ViMeta = {};
    if (category)   viMeta.c    = category;
    if (title)       viMeta.t    = title;
    if (capturedAt)  viMeta.dt   = capturedAt;
    if (location)    viMeta.l    = location;
    if (tags.trim()) viMeta.tags = tags.trim();
    const viMetaJson = JSON.stringify(viMeta);

    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    let uploaded = 0;

    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("project_id", projectId);
        fd.append("doc_type", "visual_inventory");
        fd.append("vi_meta", viMetaJson);
        fd.append("file", file);
        const res = await fetch(buildApiUrl("/documents/upload"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Yükleme başarısız.");
        }
        uploaded++;
        setProgress(Math.round((uploaded / files.length) * 100));
      }
      onDone();
      onClose();
    } catch (ex: any) {
      setErr(ex.message ?? "Yükleme başarısız.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <h2 className="text-sm font-bold text-slate-900">Fotoğraf Yükle</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-700" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,.heic,.heif"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="mx-auto h-7 w-7 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Fotoğrafları sürükleyin veya seçin</p>
            <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, WEBP, HEIC desteklenir</p>
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="flex-1 text-[11px] text-slate-700 truncate">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)}>
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Seçin...</option>
                {VI_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Çekim Tarihi</label>
              <input
                type="date"
                value={capturedAt}
                onChange={(e) => setCapturedAt(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Başlık</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fotoğrafı açıklayan kısa başlık..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <MapPin className="inline h-3 w-3 mr-1" />Konum Notu
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Kat 2 Teknik Alan..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Tag className="inline h-3 w-3 mr-1" />Etiketler
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="arıza, bakım, acil (virgülle ayırın)"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {busy && files.length > 1 && (
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <div className="flex justify-between text-[11px] text-blue-700 mb-1">
                <span>Yükleniyor...</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Vazgeç
            </button>
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {files.length > 1 ? `${files.length} Fotoğraf Yükle` : "Yükle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Tab Component ─────────────────────────────────────────────────────────

export default function VisualInventoryTab({
  projectId,
  docs,
  onRefresh,
}: {
  projectId: string;
  docs: Document[];
  onRefresh: () => void;
}) {
  const [uploadOpen, setUploadOpen]     = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredDocs = filterCategory === "all"
    ? docs
    : docs.filter((d) => {
        const meta = parseMeta(d.vi_meta);
        return meta.c === filterCategory;
      });

  const usedCategories = Array.from(
    new Set(docs.map((d) => parseMeta(d.vi_meta).c).filter(Boolean))
  ) as string[];

  const handleUploadDone = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
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
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Fotoğraf Ekle
        </button>
      </div>

      {/* Grid */}
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Camera className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">
            {docs.length === 0
              ? "Henüz görsel yüklenmemiş."
              : "Bu kategoride görsel yok."}
          </p>
          {docs.length === 0 && (
            <button
              onClick={() => setUploadOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> İlk Fotoğrafı Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredDocs.map((doc, idx) => (
            <PhotoCard
              key={doc.id}
              doc={doc}
              onClick={() => setLightboxIdx(idx)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <UploadModal
          projectId={projectId}
          onClose={() => setUploadOpen(false)}
          onDone={handleUploadDone}
        />
      )}

      {/* Lightbox */}
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

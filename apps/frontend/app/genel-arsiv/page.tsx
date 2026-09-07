"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive, CheckSquare, Download, ExternalLink, Loader2, Search,
  Square, Trash2, Upload, ArrowRightCircle, Filter, AlertCircle, RefreshCw,
} from "lucide-react";
import { apiGet, buildApiUrl } from "@/lib/api";
import UploadModal   from "./UploadModal";
import TransferModal from "./TransferModal";
import { useAuth } from "@/contexts/auth-context";

// ── Sabitler / Yardımcılar ───────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  project_file:     "Proje Dosyaları",
  visual_inventory: "Görsel Envanter",
  field_report:     "Servis Formları",
  other:            "Diğer Dosyalar",
};

type FilterKey =
  | "all" | "dwg" | "pdf" | "image" | "excel"
  | "transferred" | "not_transferred";

const FILTER_OPTS: { key: FilterKey; label: string }[] = [
  { key: "all",             label: "Tüm Dosyalar"   },
  { key: "dwg",             label: "DWG"            },
  { key: "pdf",             label: "PDF"            },
  { key: "image",           label: "Görseller"      },
  { key: "excel",           label: "Excel"          },
  { key: "transferred",     label: "Mağazaya Aktarılanlar" },
  { key: "not_transferred", label: "Aktarılmayı Bekleyenler" },
];

const EXT_IMAGE = ["JPG","JPEG","PNG","GIF","WEBP","BMP"];
const EXT_EXCEL = ["XLSX","XLS","CSV"];

function matchesTypeFilter(doc: ArchiveDoc, f: FilterKey): boolean {
  const ext = getExtension(doc.original_name);
  switch (f) {
    case "all":             return true;
    case "dwg":             return ext === "DWG";
    case "pdf":             return ext === "PDF";
    case "image":           return EXT_IMAGE.includes(ext);
    case "excel":           return EXT_EXCEL.includes(ext);
    case "transferred":     return doc.archive_status === "transferred";
    case "not_transferred": return doc.archive_status !== "transferred";
    default:                return true;
  }
}

function fmtBytes(n?: number | null): string {
  if (!n) return "—";
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function getExtension(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "";
}

function ExtBadge({ name }: { name: string }) {
  const ext = getExtension(name);
  const cls =
    ext === "DWG"  ? "bg-orange-50 text-orange-600 border-orange-100" :
    ext === "PDF"  ? "bg-red-50    text-red-600    border-red-100"    :
    ["JPG","JPEG","PNG"].includes(ext) ? "bg-green-50 text-green-600 border-green-100" :
    ["XLSX","XLS"].includes(ext)       ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
    ext === "ZIP"  ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
    ext === "DOCX" ? "bg-blue-50   text-blue-600  border-blue-100"   :
    "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {ext || "?"}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ArchiveDoc = {
  id: string;
  original_name: string;
  file_size_bytes: number | null;
  doc_type: string;
  mime_type: string | null;
  created_at: string;
  uploaded_by_name: string | null;
  is_archive: boolean;
  archive_status: string;
  transferred_project_id: string | null;
  transferred_project_name: string | null;
  transferred_project_no: string | null;
  transferred_category: string | null;
  transferred_at: string | null;
  file_key: string;
};

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function GenelArsivPage() {
  const { user } = useAuth();
  const canDelete = user?.role === "MANAGER" || user?.role === "ADMIN";
  const [docs,        setDocs]        = useState<ArchiveDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [uploadOpen,  setUploadOpen]  = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteErr,   setDeleteErr]   = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<ArchiveDoc[]>("/documents/archive").catch(() => []);
    setDocs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Arama + filtre
  const filtered = docs.filter((d) => {
    if (!matchesTypeFilter(d, activeFilter)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.original_name.toLowerCase().includes(q) ||
      (d.transferred_project_name ?? "").toLowerCase().includes(q) ||
      (d.transferred_project_no ?? "").toLowerCase().includes(q) ||
      getExtension(d.original_name).toLowerCase().includes(q) ||
      (CATEGORY_MAP[d.transferred_category ?? ""] ?? "").toLowerCase().includes(q)
    );
  });

  const allSelected  = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
  const someSelected = filtered.some((d) => selected.has(d.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => { const ns = new Set(s); filtered.forEach((d) => ns.delete(d.id)); return ns; });
    } else {
      setSelected((s) => { const ns = new Set(s); filtered.forEach((d) => ns.add(d.id)); return ns; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };

  const selectedDocs = docs.filter((d) => selected.has(d.id));

  // İndir
  const handleDownload = async (doc: ArchiveDoc) => {
    try {
      const res = await apiGet<{ url: string }>(`/documents/${doc.id}/download`);
      window.open(res.url, "_blank");
    } catch { /* ignore */ }
  };

  // Aç
  const handleOpen = async (doc: ArchiveDoc) => {
    try {
      const res = await apiGet<{ url: string }>(`/documents/${doc.id}/download`);
      if (res?.url) window.open(res.url, "_blank");
    } catch { /* ignore */ }
  };

  // Sil (arşive al)
  const handleDelete = async (docId: string) => {
    if (!confirm("Bu dosyayı arşivden kaldırmak istediğinize emin misiniz?")) return;
    setDeleteErr(null);
    try {
      const res = await fetch(buildApiUrl(`/documents/${docId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      if (!res.ok) throw new Error("Silinemedi.");
      setSelected((s) => { const ns = new Set(s); ns.delete(docId); return ns; });
      loadDocs();
    } catch {
      setDeleteErr("Dosya silinemedi.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <Archive className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Genel Arşiv</h1>
            <p className="text-xs text-slate-500">“Dosya Yükle” ile ekleyin; dosyayı seçip “Mağazaya Aktar” ile ilgili mağaza kartına bağlayın.</p>
          </div>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4" /> Dosya Yükle
        </button>
      </div>

      {/* Araç çubuğu */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Arama */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dosya adı, mağaza, kategori..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Filtre chip'leri */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {FILTER_OPTS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                activeFilter === f.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button onClick={loadDocs} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Toplu işlem şeridi */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5">
          <span className="text-xs font-semibold text-blue-700">{selected.size} dosya seçildi</span>
          <button
            onClick={() => setTransferOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <ArrowRightCircle className="h-3.5 w-3.5" /> Mağazaya Aktar
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-blue-500 hover:underline">
            Seçimi Temizle
          </button>
        </div>
      )}

      {deleteErr && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-xs text-red-600">{deleteErr}</p>
        </div>
      )}

      {/* Liste */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Archive className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">
              {docs.length === 0 ? "Henüz genel arşive dosya yüklenmemiş." : "Aramanızla eşleşen dosya yok."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
          <table className="min-w-[720px] w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Dosya Adı</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 hidden sm:table-cell">Boyut</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 hidden md:table-cell">Yükleyen</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500 hidden md:table-cell">Tarih</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Durum</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-500">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const isChecked    = selected.has(doc.id);
                const transferred  = doc.archive_status === "transferred";
                return (
                  <tr
                    key={doc.id}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isChecked ? "bg-blue-50/50" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleOne(doc.id)} className="text-slate-400 hover:text-slate-700">
                        {isChecked ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>

                    {/* Dosya adı */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ExtBadge name={doc.original_name} />
                        <span className="font-medium text-slate-800 truncate max-w-[200px]">{doc.original_name}</span>
                      </div>
                    </td>

                    {/* Boyut */}
                    <td className="px-3 py-3 text-slate-400 hidden sm:table-cell">
                      {fmtBytes(doc.file_size_bytes)}
                    </td>

                    {/* Yükleyen */}
                    <td className="px-3 py-3 text-slate-500 hidden md:table-cell">
                      {doc.uploaded_by_name ?? "—"}
                    </td>

                    {/* Tarih */}
                    <td className="px-3 py-3 text-slate-400 hidden md:table-cell">
                      {fmtDate(doc.created_at)}
                    </td>

                    {/* Durum */}
                    <td className="px-3 py-3">
                      {transferred ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 border border-green-100">
                            Mağazaya Aktarıldı
                          </span>
                          <div className="mt-1 text-[11px] text-slate-400 leading-tight">
                            <span className="font-medium text-slate-600">{doc.transferred_project_name ?? "—"}</span>
                            {doc.transferred_project_no && <span className="ml-1 font-mono">({doc.transferred_project_no})</span>}
                            {doc.transferred_category && (
                              <> · {CATEGORY_MAP[doc.transferred_category] ?? doc.transferred_category}</>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Aktarılmayı Bekliyor
                        </span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpen(doc)}
                          title="Aç"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          title="İndir"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {!transferred && (
                          <button
                            onClick={() => { setSelected(new Set([doc.id])); setTransferOpen(true); }}
                            title="Mağazaya Aktar"
                            className="flex h-7 items-center gap-1 rounded-lg px-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium hidden lg:inline">Aktar</span>
                          </button>
                        )}
                        {canDelete && <button
                          onClick={() => handleDelete(doc.id)}
                          title="Sil"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modaller */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onDone={() => { setUploadOpen(false); loadDocs(); }}
        />
      )}
      {transferOpen && selectedDocs.length > 0 && (
        <TransferModal
          docs={selectedDocs}
          onClose={() => setTransferOpen(false)}
          onDone={() => { setTransferOpen(false); setSelected(new Set()); loadDocs(); }}
        />
      )}
    </div>
  );
}

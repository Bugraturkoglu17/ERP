"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight, Check, ChevronRight, Loader2, Search, Store, X, AlertCircle, Info,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { getStores } from "@/services/stores";

// ── Sabitler ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTS = [
  { value: "project_file",     label: "Proje Dosyaları"  },
  { value: "visual_inventory", label: "Görsel Envanter"  },
  { value: "field_report",     label: "Servis Formları"  },
  { value: "other",            label: "Diğer Dosyalar"   },
];

function getExtension(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "";
}

function isDwg(name: string) {
  return getExtension(name) === "DWG";
}

// ── Types ────────────────────────────────────────────────────────────────────

type ArchiveDoc = {
  id: string;
  original_name: string;
  file_size_bytes: number | null;
  doc_type: string;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  project_no?: string;
};

// ── Bileşen ──────────────────────────────────────────────────────────────────

export default function TransferModal({
  docs,
  onClose,
  onDone,
}: {
  docs: ArchiveDoc[];
  onClose: () => void;
  onDone: () => void;
}) {
  const allDwg = docs.every((d) => isDwg(d.original_name));

  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [projSearch, setProjSearch] = useState("");
  const [projSearchDebounced, setProjSearchDebounced] = useState("");
  const [selected,   setSelected]   = useState<Project | null>(null);
  const [category,   setCategory]   = useState<string>(allDwg ? "project_file" : "");
  const [busy,       setBusy]       = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  // Mağaza listesini yükle
  useEffect(() => {
    getStores().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setProjSearchDebounced(projSearch), 200);
    return () => clearTimeout(t);
  }, [projSearch]);

  const filteredProjects = projects.filter((p) => {
    const q = projSearchDebounced.toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.project_no ?? "").toLowerCase().includes(q)
    );
  }).slice(0, 50);

  const canNext = step === 1
    ? true
    : step === 2
    ? !!selected
    : !!category;

  const handleTransfer = async () => {
    if (!selected || !category) return;
    setBusy(true);
    setErr(null);
    let failed = 0;
    for (const doc of docs) {
      try {
        const res = await fetch(buildApiUrl(`/documents/archive/${doc.id}/transfer`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          },
          body: JSON.stringify({ project_id: selected.id, doc_type: category }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "Taşıma başarısız.");
        }
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (failed > 0) {
      setErr(`${failed} dosya taşınamadı. Diğerleri başarıyla taşındı.`);
    } else {
      onDone();
    }
  };

  const stepLabel = ["Dosyalar", "Mağaza Seç", "Kategori"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Dosyaları Mağaza Kartına Taşı</h2>
            <p className="text-xs text-slate-400 mt-0.5">{docs.length} dosya seçildi</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step bar */}
        <div className="flex items-center gap-1 px-5 pt-4">
          {stepLabel.map((label, idx) => {
            const n = idx + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-1 flex-1">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done   ? "bg-blue-600 text-white"
                  : active ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-400"
                }`}>
                  {done ? <Check className="h-3 w-3" /> : n}
                </div>
                <span className={`text-xs ${active ? "text-slate-800 font-semibold" : "text-slate-400"}`}>{label}</span>
                {idx < stepLabel.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-200 shrink-0 ml-auto" />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5 min-h-[200px]">

          {/* Step 1 — Seçilen dosyalar */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 mb-3">Taşınacak dosyalar:</p>
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {docs.map((d) => {
                  const ext = getExtension(d.original_name);
                  return (
                    <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        ext === "DWG" ? "bg-orange-50 text-orange-600"
                        : ext === "PDF" ? "bg-red-50 text-red-600"
                        : ["JPG","JPEG","PNG"].includes(ext) ? "bg-green-50 text-green-600"
                        : "bg-slate-100 text-slate-500"
                      }`}>{ext || "?"}</span>
                      <span className="flex-1 text-xs text-slate-700 truncate">{d.original_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Mağaza seç */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                <input
                  type="text"
                  autoFocus
                  value={projSearch}
                  onChange={(e) => setProjSearch(e.target.value)}
                  placeholder="Mağaza adı veya kodu ile ara..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredProjects.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">Sonuç bulunamadı</p>
                )}
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selected?.id === p.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Store className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                      {p.project_no && <p className="text-[11px] text-slate-400 font-mono">{p.project_no}</p>}
                    </div>
                    {selected?.id === p.id && (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Hedef kategori */}
          {step === 3 && (
            <div className="space-y-3">
              {allDwg && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">DWG dosyaları otomatik olarak <strong>Proje Dosyaları</strong> kategorisine aktarılır.</p>
                </div>
              )}
              <p className="text-xs font-semibold text-slate-600">Hedef kategori:</p>
              <div className="space-y-1.5">
                {CATEGORY_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { if (!allDwg) setCategory(opt.value); }}
                    disabled={allDwg && opt.value !== "project_file"}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      category === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                      category === opt.value ? "border-blue-600" : "border-slate-300"
                    }`}>
                      {category === opt.value && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{opt.label}</span>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <p className="text-[11px] text-slate-500">Hedef mağaza:</p>
                  <p className="text-xs font-semibold text-slate-800">{selected.name}</p>
                  {selected.project_no && <p className="text-[11px] font-mono text-slate-400">{selected.project_no}</p>}
                </div>
              )}

              {err && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{err}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <button onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            {step === 1 ? "İptal" : "Geri"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              İleri <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleTransfer}
              disabled={!category || busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Taşı
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

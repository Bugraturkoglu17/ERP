"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { getStores, type Store } from "@/services/stores";
import { buildStoreIndex, findBestStoreMatch, type StoreMatch } from "@/lib/storeMatch";
import TransferModal, { type ArchiveDoc } from "./TransferModal";

function getExtension(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "";
}

type RowStatus = "pending" | "assigned" | "left";

/**
 * Toplu yükleme sonrası gösterilen eşleştirme ekranı. Her dosya için mağaza
 * adı/koduyla otomatik bir öneri hesaplanır (tamamen istemci tarafında,
 * bkz. lib/storeMatch.ts); kullanıcı her satırda "Mağazaya Ata" veya
 * "Arşivde Bırak" seçer. Hiçbir dosya mağazaya atanmak ZORUNDA değildir —
 * "Arşivde Bırak" sadece bu ekrandaki satırı kapatır, dosya zaten yüklendiği
 * an Genel Arşiv'de görüntülenebilir/indirilebilir durumdadır.
 */
export default function UploadMatchReview({
  docs,
  onClose,
  onChanged,
}: {
  docs: ArchiveDoc[];
  onClose: () => void;
  /** Bir dosya mağazaya atandığında çağrılır — üst listenin (Genel Arşiv tablosu) tazelenmesi içindir. */
  onChanged: () => void;
}) {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [transferTarget, setTransferTarget] = useState<{ doc: ArchiveDoc; store?: Store } | null>(null);

  useEffect(() => {
    let active = true;
    getStores({})
      .then((items) => { if (active) setStores(items); })
      .catch(() => { if (active) setStores([]); });
    return () => { active = false; };
  }, []);

  const index = useMemo(() => (stores ? buildStoreIndex(stores) : null), [stores]);

  const matches = useMemo(() => {
    const m: Record<string, StoreMatch> = {};
    if (!index) return m;
    for (const d of docs) m[d.id] = findBestStoreMatch(d.original_name, index);
    return m;
  }, [docs, index]);

  const pendingCount = docs.filter((d) => (rowStatus[d.id] ?? "pending") === "pending").length;

  const handleAssignClick = (doc: ArchiveDoc) => {
    const match = matches[doc.id];
    setTransferTarget({ doc, store: match?.tier !== "none" ? (match?.store ?? undefined) : undefined });
  };

  const handleTransferDone = () => {
    if (transferTarget) setRowStatus((s) => ({ ...s, [transferTarget.doc.id]: "assigned" }));
    setTransferTarget(null);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="upload-review-title">
      <div className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="upload-review-title" className="text-sm font-bold text-slate-900">Yüklenen Dosyalar — Mağaza Eşleştirme</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {docs.length} dosya yüklendi{pendingCount > 0 ? ` · ${pendingCount} dosya için karar bekleniyor` : " · tüm dosyalar için karar verildi"}
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {!stores ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Mağazalar yükleniyor…
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const status = rowStatus[doc.id] ?? "pending";
                const match = matches[doc.id];
                const ext = getExtension(doc.original_name);
                return (
                  <div key={doc.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        ext === "DWG" ? "bg-orange-50 text-orange-600"
                        : ext === "PDF" ? "bg-red-50 text-red-600"
                        : "bg-slate-100 text-slate-500"
                      }`}>{ext || "?"}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">{doc.original_name}</span>

                      {status === "assigned" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Mağazaya Atandı
                        </span>
                      )}
                      {status === "left" && (
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Arşivde Bırakıldı
                        </span>
                      )}
                      {status === "pending" && match?.tier === "high" && (
                        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Yüksek eşleşme
                        </span>
                      )}
                      {status === "pending" && match?.tier === "medium" && (
                        <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Olası eşleşme
                        </span>
                      )}
                      {status === "pending" && match?.tier === "none" && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Eşleşme yok
                        </span>
                      )}
                    </div>

                    {status === "pending" && match?.store && (
                      <p className="mt-1 pl-[26px] text-[11px] text-slate-500">
                        Önerilen mağaza: <span className="font-semibold text-slate-700">{match.store.name}</span>
                        {match.store.project_no && <span className="ml-1 font-mono text-slate-400">({match.store.project_no})</span>}
                      </p>
                    )}

                    {status === "pending" && (
                      <div className="mt-2 flex gap-2 pl-[26px]">
                        <button
                          onClick={() => handleAssignClick(doc)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                        >
                          Mağazaya Ata
                        </button>
                        <button
                          onClick={() => setRowStatus((s) => ({ ...s, [doc.id]: "left" }))}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Arşivde Bırak
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <button onClick={onClose} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Kapat
          </button>
        </div>
      </div>

      {transferTarget && (
        <TransferModal
          docs={[transferTarget.doc]}
          initialStore={transferTarget.store}
          onClose={() => setTransferTarget(null)}
          onDone={handleTransferDone}
        />
      )}
    </div>
  );
}

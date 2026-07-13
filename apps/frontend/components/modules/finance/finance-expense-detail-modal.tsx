import { X, Package, Paperclip } from "lucide-react";
import { apiGet } from "@/lib/api";

interface FinanceExpenseDetailModalProps {
  selectedExpense: any;
  setSelectedExpense: (expense: any | null) => void;
  CATEGORY_LABELS: Record<string, string>;
  projects: any[];
  loadingStockMovement: boolean;
  stockMovementDetails: any;
}

export function FinanceExpenseDetailModal({
  selectedExpense,
  setSelectedExpense,
  CATEGORY_LABELS,
  projects,
  loadingStockMovement,
  stockMovementDetails
}: FinanceExpenseDetailModalProps) {
  if (!selectedExpense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Masraf / Gider Detayı</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Harcama kaydı ayrıntılı bilgileri</p>
          </div>
          <button 
            onClick={() => setSelectedExpense(null)} 
            className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">AÇIKLAMA</span>
              <span className="text-sm font-bold text-slate-800">{selectedExpense.description}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">HARCAMA GRUBU</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 mt-1 inline-block">
                  {CATEGORY_LABELS[selectedExpense.category] || selectedExpense.category}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TUTAR</span>
                <span className="text-sm font-bold text-rose-600 font-mono">
                  ₺{Number(selectedExpense.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TARİH</span>
                <span className="text-xs font-bold text-slate-700">
                  {new Date(selectedExpense.expense_date).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PROJE</span>
                <span className="text-xs font-bold text-slate-700 truncate block">
                  {projects.find(p => p.id === selectedExpense.project_id)?.name || "Bilinmeyen Proje"}
                </span>
              </div>
            </div>
          </div>

          {selectedExpense.stock_movement_id && (
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                <Package className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">İlişkili Stok Hareketi</span>
                  <p className="text-[9px] font-mono text-slate-400">ID: {selectedExpense.stock_movement_id.slice(0, 8)}</p>
                </div>
              </div>

              {loadingStockMovement ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 ml-2">Yükleniyor...</span>
                </div>
              ) : stockMovementDetails ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">MALZEME / ÜRÜN</span>
                    <span className="text-xs font-bold text-slate-850 block">{stockMovementDetails.material_name}</span>
                    {stockMovementDetails.material_sku && (
                      <span className="text-[9px] font-mono text-slate-400">SKU: {stockMovementDetails.material_sku}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">MİKTAR</span>
                      <span className="text-xs font-bold text-slate-700">
                        {stockMovementDetails.quantity} {stockMovementDetails.material_unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">BİRİM MALİYET</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        ₺{Number(stockMovementDetails.unit_cost || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">ÇIKIŞ DEPOSU</span>
                      <span className="text-xs font-bold text-slate-700 truncate block">
                        {stockMovementDetails.from_warehouse_name || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">İŞLEM TÜRÜ</span>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5 mt-0.5 inline-block uppercase tracking-wider text-[10px]">
                        {stockMovementDetails.transaction_type}
                      </span>
                    </div>
                  </div>

                  {stockMovementDetails.reference_no && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">İRSALİYE / FİŞ NO</span>
                      <span className="text-xs font-bold text-slate-700">{stockMovementDetails.reference_no}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-slate-400 italic text-xs">
                  Stok hareket ayrıntıları yüklenemedi.
                </div>
              )}
            </div>
          )}

          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">EK BELGE / FİŞ</span>
            {selectedExpense.documents && selectedExpense.documents.length > 0 ? (
              <div className="space-y-2">
                {selectedExpense.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={doc.original_name}>{doc.original_name}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await apiGet<{ url?: string }>(`/documents/${doc.id}/download`);
                          const downloadUrl = typeof res?.url === "string" ? res.url : "";
                          if (!downloadUrl) throw new Error();
                          window.open(downloadUrl, "_blank");
                        } catch (err) {
                          alert("Belge indirme bağlantısı alınamadı.");
                        }
                      }}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors animate-fade-in"
                    >
                      İndir
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 italic text-xs">
                Bu gider kaydına eklenmiş herhangi bir fiş veya fatura bulunmamaktadır.
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedExpense(null)}
            className="corp-btn-secondary w-full py-2.5"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

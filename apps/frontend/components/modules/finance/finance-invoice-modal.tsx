import { Plus, X } from "lucide-react";

interface FinanceInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  projects: any[];
  invoiceForm: any;
  setInvoiceForm: (form: any) => void;
  handleInvoiceSubmit: (e: React.FormEvent) => void;
  invoiceSubtotal: number;
  invoiceTaxAmount: number;
  invoiceGrandTotal: number;
}

export function FinanceInvoiceModal({
  isOpen,
  onClose,
  customers,
  projects,
  invoiceForm,
  setInvoiceForm,
  handleInvoiceSubmit,
  invoiceSubtotal,
  invoiceTaxAmount,
  invoiceGrandTotal
}: FinanceInvoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dönem Hakediş İcmali Oluştur</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Müşteri ve projelere ait fatura kesim aracı</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Müşteri Firma</label>
              <select 
                className="corp-select"
                value={invoiceForm.customer_id}
                onChange={(e) => setInvoiceForm({...invoiceForm, customer_id: e.target.value})}
                required
              >
                <option value="">Seçiniz</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">İlgili Şantiye / Proje</label>
              <select 
                className="corp-select"
                value={invoiceForm.project_id}
                onChange={(e) => setInvoiceForm({...invoiceForm, project_id: e.target.value})}
              >
                <option value="">Bağımsız (Projesiz)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fatura / İcmal No</label>
              <input 
                type="text" 
                placeholder="Örn: SIS-2026-0001"
                className="corp-input"
                value={invoiceForm.invoice_no}
                onChange={(e) => setInvoiceForm({...invoiceForm, invoice_no: e.target.value})}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fatura Başlığı (Açıklama)</label>
              <input 
                type="text" 
                placeholder="Örn: X Zincir Market HVAC Kurulum Hakedişi"
                className="corp-input"
                value={invoiceForm.title}
                onChange={(e) => setInvoiceForm({...invoiceForm, title: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Düzenleme Tarihi</label>
              <input 
                type="date"
                className="corp-input font-semibold"
                value={invoiceForm.issue_date}
                onChange={(e) => setInvoiceForm({...invoiceForm, issue_date: e.target.value})}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Son Ödeme Vadesi</label>
              <input 
                type="date"
                className="corp-input font-semibold"
                value={invoiceForm.due_date}
                onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Items List Dynamic Grid */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fatura Kalemleri</span>
              <button
                type="button"
                onClick={() => setInvoiceForm({
                  ...invoiceForm,
                  items: [...invoiceForm.items, { description: "", quantity: 1, unit_price: 0 }]
                })}
                className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Kalem Ekle
              </button>
            </div>

            {invoiceForm.items.map((item: any, idx: number) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Malzeme/Hizmet Kalem Açıklaması"
                  className="corp-input flex-1"
                  value={item.description}
                  onChange={(e) => {
                    const newItems = [...invoiceForm.items];
                    newItems[idx].description = e.target.value;
                    setInvoiceForm({...invoiceForm, items: newItems});
                  }}
                  required
                />
                <input
                  type="number"
                  placeholder="Miktar"
                  className="corp-input w-20 text-center"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...invoiceForm.items];
                    newItems[idx].quantity = parseFloat(e.target.value) || 0;
                    setInvoiceForm({...invoiceForm, items: newItems});
                  }}
                  required
                />
                <input
                  type="number"
                  placeholder="Birim Fiyat"
                  className="corp-input w-32"
                  value={item.unit_price}
                  onChange={(e) => {
                    const newItems = [...invoiceForm.items];
                    newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                    setInvoiceForm({...invoiceForm, items: newItems});
                  }}
                  required
                />
                {invoiceForm.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = invoiceForm.items.filter((_: any, i: number) => i !== idx);
                      setInvoiceForm({...invoiceForm, items: newItems});
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Grand totals display panel */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 font-bold">
            <div className="flex justify-between">
              <span>Ara Toplam:</span>
              <span className="font-mono">₺{invoiceSubtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center mt-2.5">
              <div className="flex items-center gap-1.5">
                <span>KDV Oranı:</span>
                <input
                  type="number"
                  className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center outline-none focus:border-indigo-500"
                  value={invoiceForm.tax_rate}
                  onChange={(e) => setInvoiceForm({...invoiceForm, tax_rate: parseFloat(e.target.value) || 0})}
                />
                <span>%</span>
              </div>
              <span className="font-mono">₺{invoiceTaxAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between pt-2.5 mt-2.5 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>Genel Toplam:</span>
              <span className="font-mono text-base text-indigo-600">₺{invoiceGrandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button 
            type="submit"
            className="corp-btn-primary w-full py-3"
          >
            Hakediş İcmalini Kaydet
          </button>
        </form>
      </div>
    </div>
  );
}

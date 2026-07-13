import { X } from "lucide-react";

interface FinancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentForm: any;
  setPaymentForm: (form: any) => void;
  handlePaymentSubmit: (e: React.FormEvent) => void;
}

export function FinancePaymentModal({
  isOpen,
  onClose,
  paymentForm,
  setPaymentForm,
  handlePaymentSubmit
}: FinancePaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tahsilat / Ödeme Girişi</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Hakediş tahsilatı veya tedarikçi cari ödemesi</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-2">
            <button
              type="button"
              onClick={() => setPaymentForm({...paymentForm, direction: "incoming"})}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                paymentForm.direction === "incoming" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Müşteri Geliri (+)
            </button>
            <button
              type="button"
              onClick={() => setPaymentForm({...paymentForm, direction: "outgoing"})}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                paymentForm.direction === "outgoing" 
                  ? "bg-rose-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tedarikçi Gideri (-)
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">İşlem Miktarı (TL)</label>
            <input 
              type="number" 
              placeholder="0.00"
              className="corp-input font-mono font-bold"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ödeme Tipi</label>
              <select 
                className="corp-select"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                required
              >
                <option value="havale">Banka Havale</option>
                <option value="eft">EFT Transfer</option>
                <option value="kredi_karti">Kredi Kartı</option>
                <option value="cek">Ticari Çek</option>
                <option value="nakit">Nakit</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Dekont / Ref No</label>
              <input 
                type="text" 
                placeholder="Örn: REF-1823"
                className="corp-input font-mono"
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">İşlem Tarihi</label>
            <input 
              type="date" 
              className="corp-input font-semibold"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
              required
            />
          </div>

          <button 
            type="submit"
            className="corp-btn-primary w-full py-3"
          >
            Finansal Hareketi Tamamla
          </button>
        </form>
      </div>
    </div>
  );
}

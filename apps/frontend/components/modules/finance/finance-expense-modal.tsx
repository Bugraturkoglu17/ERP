import { X } from "lucide-react";

interface FinanceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
  expenseForm: any;
  setExpenseForm: (form: any) => void;
  handleExpenseSubmit: (e: React.FormEvent) => void;
}

export function FinanceExpenseModal({
  isOpen,
  onClose,
  projects,
  expenseForm,
  setExpenseForm,
  handleExpenseSubmit
}: FinanceExpenseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Masraf / Gider Girişi</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Şantiye malzeme, taşeron veya nakliye masrafları</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Masrafın Ait Olduğu Proje</label>
            <select 
              className="corp-select"
              value={expenseForm.project_id}
              onChange={(e) => setExpenseForm({...expenseForm, project_id: e.target.value})}
              required
            >
              <option value="">Seçiniz</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Harcama Grubu</label>
            <select 
              className="corp-select"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
              required
            >
              <option value="material">Malzeme Tedariği</option>
              <option value="labour">İşçilik & Taşeron Ücreti</option>
              <option value="transport">Nakliye & Lojistik</option>
              <option value="equipment">Ekipman Kiralama</option>
              <option value="miscellaneous">Diğer</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Harcama Açıklaması</label>
            <input 
              type="text" 
              placeholder="Örn: 200 mt Çelik Boru Nakliyesi"
              className="corp-input"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tutar (TL)</label>
              <input 
                type="number" 
                placeholder="0.00"
                className="corp-input font-mono"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tarih</label>
              <input 
                type="date" 
                className="corp-input font-semibold"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Belge / Fiş / Fatura Yükle (İsteğe Bağlı)</label>
            <input 
              type="file" 
              className="corp-input py-1.5 text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={(e) => setExpenseForm({...expenseForm, file: e.target.files?.[0] || null})}
            />
          </div>

          <button 
            type="submit"
            className="corp-btn-primary w-full py-3"
          >
            Gider Kaydını Tamamla
          </button>
        </form>
      </div>
    </div>
  );
}

import { Paperclip } from "lucide-react";

interface FinanceExpensesTabProps {
  expenses: any[];
  CATEGORY_LABELS: Record<string, string>;
  setSelectedExpense: (expense: any) => void;
}

export function FinanceExpensesTab({
  expenses,
  CATEGORY_LABELS,
  setSelectedExpense
}: FinanceExpensesTabProps) {
  return (
    <div className="corp-card">
      <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/55">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Şantiye Gider Fişleri</h3>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Toplam {expenses.length} harcama kaydı</span>
      </div>
      <div className="overflow-x-auto">
        <table className="corp-table">
          <thead>
            <tr>
              <th className="corp-th">Açıklama</th>
              <th className="corp-th">Harcama Grubu</th>
              <th className="corp-th">Tutar</th>
              <th className="corp-th">Harcama Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr 
                key={exp.id} 
                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                onClick={() => setSelectedExpense(exp)}
              >
                <td className="corp-td">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {exp.description}
                        {exp.documents && exp.documents.length > 0 && (
                          <span title="Belge Ekli">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {exp.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="corp-td">
                  <span className="corp-badge-secondary">
                    {CATEGORY_LABELS[exp.category] || exp.category}
                  </span>
                </td>
                <td className="corp-td font-bold text-rose-600">₺{Number(exp.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                <td className="corp-td text-xs text-slate-500">{new Date(exp.expense_date).toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={4} className="corp-td text-center text-slate-400 italic py-12">
                  Henüz hiçbir şantiye gider kaydı yapılmamış.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

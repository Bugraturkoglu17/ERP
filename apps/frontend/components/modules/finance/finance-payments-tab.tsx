interface FinancePaymentsTabProps {
  payments: any[];
}

export function FinancePaymentsTab({
  payments
}: FinancePaymentsTabProps) {
  return (
    <div className="corp-card">
      <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/55">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Tahsilatlar & Ödemeler (Nakit Akışı)</h3>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Toplam {payments.length} hareket</span>
      </div>
      <div className="overflow-x-auto">
        <table className="corp-table">
          <thead>
            <tr>
              <th className="corp-th">Referans No</th>
              <th className="corp-th">Hareket Yönü</th>
              <th className="corp-th">Miktar</th>
              <th className="corp-th">Ödeme Yöntemi</th>
              <th className="corp-th">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => (
              <tr key={pay.id} className="hover:bg-slate-50/50">
                <td className="corp-td font-mono text-xs">{pay.reference_no || `REF-${pay.id.slice(0, 8).toUpperCase()}`}</td>
                <td className="corp-td">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${pay.direction === "incoming" ? "text-emerald-600" : "text-rose-600"}`}>
                    {pay.direction === "incoming" ? "Müşteri Tahsilatı (+)" : "Tedarikçi Ödemesi (-)"}
                  </span>
                </td>
                <td className={`corp-td font-bold ${pay.direction === "incoming" ? "text-emerald-600" : "text-rose-600"}`}>
                  ₺{Number(pay.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </td>
                <td className="corp-td font-mono text-xs text-slate-500 uppercase">{pay.payment_method}</td>
                <td className="corp-td text-xs text-slate-500">{new Date(pay.payment_date).toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="corp-td text-center text-slate-400 italic py-12">
                  Nakit akış tablosunda işlem kaydı bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

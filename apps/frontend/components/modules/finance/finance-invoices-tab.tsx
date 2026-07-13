import { CheckCircle2 } from "lucide-react";

interface FinanceInvoicesTabProps {
  invoices: any[];
  STATUS_LABELS: Record<string, { label: string; color: string; bg: string }>;
  setPaymentForm: (form: any) => void;
  setIsPaymentModalOpen: (isOpen: boolean) => void;
}

export function FinanceInvoicesTab({
  invoices,
  STATUS_LABELS,
  setPaymentForm,
  setIsPaymentModalOpen
}: FinanceInvoicesTabProps) {
  return (
    <div className="corp-card">
      <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/55">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Hakediş Faturaları Listesi</h3>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Toplam {invoices.length} fatura</span>
      </div>
      <div className="overflow-x-auto">
        <table className="corp-table">
          <thead>
            <tr>
              <th className="corp-th">Fatura No</th>
              <th className="corp-th">Fatura Başlığı</th>
              <th className="corp-th">KDV Dahil Toplam</th>
              <th className="corp-th">Kesim Tarihi</th>
              <th className="corp-th">Durum</th>
              <th className="corp-th text-right">Tahsilat Ekle</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              let statusBadgeClass = "corp-badge-secondary";
              if (inv.status === "paid") statusBadgeClass = "corp-badge-success";
              else if (inv.status === "sent" || inv.status === "approved") statusBadgeClass = "corp-badge-info";
              else if (inv.status === "overdue" || inv.status === "cancelled") statusBadgeClass = "corp-badge-danger";
              
              const label = STATUS_LABELS[inv.status]?.label || "Taslak";
              
              return (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="corp-td font-mono text-xs">{inv.invoice_no}</td>
                  <td className="corp-td">{inv.title || "İcmal Hakedişi"}</td>
                  <td className="corp-td font-bold text-slate-900">₺{Number(inv.grand_total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  <td className="corp-td text-xs text-slate-500">{new Date(inv.issue_date).toLocaleDateString("tr-TR")}</td>
                  <td className="corp-td">
                    <span className={statusBadgeClass}>
                      {label}
                    </span>
                  </td>
                  <td className="corp-td text-right">
                    {inv.status !== "paid" ? (
                      <button
                        onClick={() => {
                          setPaymentForm((prev: any) => ({
                            ...prev,
                            invoice_id: inv.id,
                            amount: inv.grand_total.toString()
                          }));
                          setIsPaymentModalOpen(true);
                        }}
                        className="corp-btn-secondary px-3 py-1 text-[11px] h-auto rounded-lg"
                      >
                        Tahsil Et
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-bold inline-flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Kapandı
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="corp-td text-center text-slate-400 italic py-12">
                  Kayıtlı hakediş faturası bulunmamaktadır. Sağ üst köşeden ilk icmali oluşturun.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DataState } from "@/components/common/data-state";
import { FinanceInvoiceModal } from "@/components/modules/finance/finance-invoice-modal";
import { FinanceExpenseModal } from "@/components/modules/finance/finance-expense-modal";
import { FinancePaymentModal } from "@/components/modules/finance/finance-payment-modal";
import { FinanceExpenseDetailModal } from "@/components/modules/finance/finance-expense-detail-modal";
import { FinanceInvoicesTab } from "@/components/modules/finance/finance-invoices-tab";
import { FinanceExpensesTab } from "@/components/modules/finance/finance-expenses-tab";
import { FinancePaymentsTab } from "@/components/modules/finance/finance-payments-tab";
import { FinanceProfitabilityTab } from "@/components/modules/finance/finance-profitability-tab";
import {
  CircleDollarSign,
  Plus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Coins,
  AlertTriangle,
  X,
  Paperclip,
  Package,
  Percent,
  CheckCircle2,
} from "lucide-react";

export default function FinancePage() {
  const {
    invoices, expenses, payments, projects, customers,
    profitabilityData, loading, error,
    loadProfitability, createInvoice, createExpense, createPayment,
    totalRevenue, totalExpenses, totalPaid, unpaidInvoices,
    refetch,
  } = useFinanceData();

  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Tab State
  const [activeTab, setActiveTab] = useState<"invoices" | "expenses" | "payments" | "profitability">("invoices");

  // Create Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(() => ({
    customer_id: "",
    project_id: "",
    invoice_no: "",
    title: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    tax_rate: 20,
    items: [{ description: "", quantity: 1, unit_price: 0 }]
  }));

  // Create Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [stockMovementDetails, setStockMovementDetails] = useState<any | null>(null);
  const [loadingStockMovement, setLoadingStockMovement] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState(() => ({
    project_id: "",
    category: "material", // labour, material, transport, equipment, miscellaneous
    description: "",
    amount: "",
    quantity: "",
    expense_date: new Date().toISOString().split("T")[0],
    file: null as File | null
  }));

  // Create Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(() => ({
    invoice_id: "",
    direction: "incoming", // incoming / outgoing
    amount: "",
    payment_method: "havale", // havale / eft / nakit
    reference_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: ""
  }));

  useEffect(() => {
    if (selectedExpense && selectedExpense.stock_movement_id) {
      setLoadingStockMovement(true);
      setStockMovementDetails(null);
      apiGet(`/inventory/transactions/${selectedExpense.stock_movement_id}`)
        .then((data) => {
          setStockMovementDetails(data);
        })
        .catch((err) => {
          console.error("Failed to fetch stock movement details:", err);
          setStockMovementDetails(null);
        })
        .finally(() => {
          setLoadingStockMovement(false);
        });
    } else {
      setStockMovementDetails(null);
    }
  }, [selectedExpense]);


  // Invoice calculations
  const invoiceSubtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const invoiceTaxAmount = (invoiceSubtotal * invoiceForm.tax_rate) / 100;
  const invoiceGrandTotal = invoiceSubtotal + invoiceTaxAmount;

  async function handleInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceForm.customer_id) {
      alert("Lütfen bir müşteri seçiniz.");
      return;
    }

    try {
      const payload = {
        customer_id: invoiceForm.customer_id,
        project_id: invoiceForm.project_id || null,
        invoice_no: invoiceForm.invoice_no,
        title: invoiceForm.title,
        issue_date: new Date(invoiceForm.issue_date).toISOString(),
        due_date: invoiceForm.due_date ? new Date(invoiceForm.due_date).toISOString() : null,
        subtotal: invoiceSubtotal,
        tax_rate: invoiceForm.tax_rate,
        tax_amount: invoiceTaxAmount,
        grand_total: invoiceGrandTotal,
        status: "draft",
        items: invoiceForm.items.filter(item => item.description.trim() !== "")
      };

      await apiPost("/finance/invoices", payload);
      alert("Hakediş Faturası başarıyla oluşturuldu.");
      setIsInvoiceModalOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Fatura oluşturulamadı.");
    }
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        project_id: expenseForm.project_id,
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        quantity: expenseForm.quantity ? parseFloat(expenseForm.quantity) : null,
        expense_date: new Date(expenseForm.expense_date).toISOString()
      };

      const createdExpense: any = await apiPost("/finance/expenses", payload);

      if (expenseForm.file && createdExpense?.id) {
        try {
          const formData = new FormData();
          formData.append("project_id", createdExpense.project_id);
          formData.append("doc_type", "expense_receipt");
          formData.append("expense_id", createdExpense.id);
          formData.append("revision_note", "Masraf belgesi");
          formData.append("file", expenseForm.file);

          await apiPost("/documents/upload", formData, true);
        } catch (uploadErr) {
          console.error("Belge yükleme başarısız:", uploadErr);
          alert("Gider kaydedildi ancak belge yüklenirken hata oluştu.");
        }
      }

      alert("Harcama/Gider kaydı başarıyla girildi.");
      setIsExpenseModalOpen(false);
      setExpenseForm({
        project_id: "",
        category: "material",
        description: "",
        amount: "",
        quantity: "",
        expense_date: new Date().toISOString().split("T")[0],
        file: null
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Gider kaydı eklenemedi.");
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        invoice_id: paymentForm.invoice_id || null,
        direction: paymentForm.direction,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_no: paymentForm.reference_no || null,
        payment_date: new Date(paymentForm.payment_date).toISOString(),
        notes: paymentForm.notes || null
      };

      await apiPost("/finance/payments", payload);
      alert("Ödeme/Tahsilat kaydı başarıyla işlendi.");
      setIsPaymentModalOpen(false);
      setPaymentForm({
        invoice_id: "",
        direction: "incoming",
        amount: "",
        payment_method: "havale",
        reference_no: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: ""
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Ödeme işlenemedi.");
    }
  }

  // Derived metrics from hook
  const netEarnings = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? (netEarnings / totalRevenue) * 100 : 0;

  const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Taslak", color: "text-slate-700 border-slate-200", bg: "bg-slate-50" },
    sent: { label: "Gönderildi", color: "text-blue-700 border-blue-200", bg: "bg-blue-50" },
    approved: { label: "Onaylandı", color: "text-indigo-700 border-indigo-200", bg: "bg-indigo-50" },
    paid: { label: "Ödendi", color: "text-emerald-700 border-emerald-200", bg: "bg-emerald-50" },
    overdue: { label: "Gecikmiş", color: "text-rose-700 border-rose-200", bg: "bg-rose-50" },
    cancelled: { label: "İptal", color: "text-red-700 border-red-200", bg: "bg-red-50" }
  };

  const CATEGORY_LABELS: Record<string, string> = {
    labour: "İşçilik & Taşeron",
    material: "Malzeme Tedariği",
    transport: "Nakliye & Lojistik",
    equipment: "Ekipman Kiralama",
    miscellaneous: "Diğer Giderler"
  };

  return (
    <DataState
      loading={loading}
      error={error}
      isEmpty={invoices.length === 0 && expenses.length === 0 && payments.length === 0}
      emptyTitle="Finansal veri bulunamadı"
      emptyDescription="Henüz fatura, gider veya ödeme kaydı bulunmuyor."
    >
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header and Quick Stats */}
        <div className="corp-header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Finansal Akış & İcmal Yönetimi</h2>
              <p className="text-slate-300 mt-1.5 text-xs max-w-xl">
                Projelerinizin hakediş (icmal) süreçlerini, şantiye giderlerini ve nakit akışını anlık takip edin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setIsInvoiceModalOpen(true)}
                className="corp-btn-primary"
              >
                <Plus className="w-4 h-4" /> Yeni Hakediş (İcmal) Ekle
              </button>
              <button 
                onClick={() => setIsExpenseModalOpen(true)}
                className="corp-btn-secondary bg-slate-800 hover:bg-slate-700 text-white border-slate-700 active:bg-slate-900"
              >
                <Coins className="w-4 h-4 text-orange-400" /> Masraf Girişi Yap
              </button>
            </div>
          </div>
        </div>

        {/* Financial KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Hakediş Cirosu (Gelir)</p>
              <p className="text-xl font-bold text-slate-900 mt-1">₺{totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                <ArrowUpRight className="w-3 h-3" /> Fatura Edilmiş
              </span>
            </div>
          </div>

          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Şantiye Giderleri (Maliyet)</p>
              <p className="text-xl font-bold text-slate-900 mt-1">₺{totalExpenses.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 mt-0.5">
                <ArrowDownRight className="w-3 h-3" /> Malzeme & İşçilik
              </span>
            </div>
          </div>

          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Net Kâr</p>
              <p className={`text-xl font-bold mt-1 ${netEarnings >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                ₺{netEarnings.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold flex items-center mt-0.5">
                Tesisat Karlılığı
              </span>
            </div>
          </div>

          <div className="corp-card p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ortalama Brüt Marj</p>
              <p className="text-xl font-bold text-slate-900 mt-1">%{marginPct.toFixed(1)}</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-indigo-600 h-full" 
                  style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector & Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar for Finance tabs */}
          <div className="lg:col-span-1 space-y-4">
            <div className="corp-card p-4 space-y-1">
              <button
                onClick={() => setActiveTab("invoices")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 ${
                  activeTab === "invoices" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Receipt className="w-4 h-4" /> Hakedişler & Faturalar
              </button>
              <button
                onClick={() => setActiveTab("expenses")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 ${
                  activeTab === "expenses" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Coins className="w-4 h-4" /> Şantiye Giderleri
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 ${
                  activeTab === "payments" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CircleDollarSign className="w-4 h-4" /> Tahsilat & Ödeme Planı
              </button>
              <button
                onClick={() => setActiveTab("profitability")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-3 text-xs transition-colors duration-150 ${
                  activeTab === "profitability" 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Proje Karlılık (İcmal)
              </button>
            </div>

            {/* Quick Cash-Flow Warning */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/70 text-amber-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-black text-[10px] uppercase tracking-wider text-amber-800">Vade & Finansal Akış Uyarısı</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                Gelecek 30 gün içerisinde tahsil edilecek 2 onaylı hakediş icmali bulunmaktadır. Taşeron ödemeleri ile eşleştirme yapılması önerilir.
              </p>
            </div>
          </div>

          {/* Tab Workspaces */}
          <div className="lg:col-span-3">
            {activeTab === "invoices" && (
              <FinanceInvoicesTab
                invoices={invoices}
                STATUS_LABELS={STATUS_LABELS}
                setPaymentForm={setPaymentForm}
                setIsPaymentModalOpen={setIsPaymentModalOpen}
              />
            )}

            {activeTab === "expenses" && (
              <FinanceExpensesTab
                expenses={expenses}
                CATEGORY_LABELS={CATEGORY_LABELS}
                setSelectedExpense={setSelectedExpense}
              />
            )}

            {activeTab === "payments" && (
              <FinancePaymentsTab
                payments={payments}
              />
            )}

            {activeTab === "profitability" && (
              <FinanceProfitabilityTab
                projects={projects}
                loadProfitability={loadProfitability}
                profitabilityData={profitabilityData}
              />
            )}
          </div>
        </div>

        <FinanceInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          customers={customers}
          projects={projects}
          invoiceForm={invoiceForm}
          setInvoiceForm={setInvoiceForm}
          handleInvoiceSubmit={handleInvoiceSubmit}
          invoiceSubtotal={invoiceSubtotal}
          invoiceTaxAmount={invoiceTaxAmount}
          invoiceGrandTotal={invoiceGrandTotal}
        />

        <FinanceExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          projects={projects}
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          handleExpenseSubmit={handleExpenseSubmit}
        />

        <FinancePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          handlePaymentSubmit={handlePaymentSubmit}
        />

        <FinanceExpenseDetailModal
          selectedExpense={selectedExpense}
          setSelectedExpense={setSelectedExpense}
          CATEGORY_LABELS={CATEGORY_LABELS}
          projects={projects}
          loadingStockMovement={loadingStockMovement}
          stockMovementDetails={stockMovementDetails}
        />
      </div>
    </DataState>
  );
}

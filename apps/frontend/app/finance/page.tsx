"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { 
  CircleDollarSign, 
  Plus, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Receipt,
  FileSpreadsheet,
  Coins,
  Search,
  Filter,
  User,
  Percent,
  CheckCircle2,
  AlertTriangle,
  X
} from "lucide-react";

export default function FinancePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Profitability Dashboard State
  const [profitabilityData, setProfitabilityData] = useState<any>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"invoices" | "expenses" | "payments" | "profitability">("invoices");

  // Create Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: "",
    project_id: "",
    invoice_no: "",
    title: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    tax_rate: 20,
    items: [{ description: "", quantity: 1, unit_price: 0 }]
  });

  // Create Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    project_id: "",
    category: "material", // labour, material, transport, equipment, miscellaneous
    description: "",
    amount: "",
    quantity: "",
    expense_date: new Date().toISOString().split("T")[0]
  });

  // Create Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    direction: "incoming", // incoming / outgoing
    amount: "",
    payment_method: "havale", // havale / eft / nakit
    reference_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [invs, exps, pays, projs, custs] = await Promise.all([
          apiGet("/finance/invoices").catch(() => []),
          apiGet("/finance/expenses").catch(() => []),
          apiGet("/finance/payments").catch(() => []),
          apiGet("/projects").catch(() => []),
          apiGet("/projects/customers").catch(() => [])
        ]);

        setInvoices(Array.isArray(invs) ? invs : []);
        setExpenses(Array.isArray(exps) ? exps : []);
        setPayments(Array.isArray(pays) ? pays : []);
        setProjects(Array.isArray(projs) ? projs : []);
        setCustomers(Array.isArray(custs) ? custs : []);

        if (Array.isArray(projs) && projs.length > 0) {
          loadProfitability(projs[0].id);
        }
      } catch (err) {
        console.error("Finance data fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function loadProfitability(projId: string) {
    try {
      const data = await apiGet(`/finance/dashboard/profitability/${projId}`);
      setProfitabilityData(data);
    } catch (err) {
      console.error("Profitability load error:", err);
      setProfitabilityData(null);
    }
  }

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
      // Reload
      const invs = await apiGet("/finance/invoices");
      setInvoices(invs);
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

      await apiPost("/finance/expenses", payload);
      alert("Harcama/Gider kaydı başarıyla girildi.");
      setIsExpenseModalOpen(false);
      setExpenseForm({
        project_id: "",
        category: "material",
        description: "",
        amount: "",
        quantity: "",
        expense_date: new Date().toISOString().split("T")[0]
      });
      // Reload
      const exps = await apiGet("/finance/expenses");
      setExpenses(exps);
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
      // Reload
      const [invs, pays] = await Promise.all([
        apiGet("/finance/invoices"),
        apiGet("/finance/payments")
      ]);
      setInvoices(invs);
      setPayments(pays);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Ödeme işlenemedi.");
    }
  }

  // Summary Metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
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
    equipment: "Makine Kiralama",
    miscellaneous: "Diğer Giderler"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Finansal veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header and Quick Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Finansal Akış & İcmal Yönetimi</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-xl">
              Projelerinizin hakediş (icmal) süreçlerini, şantiye giderlerini ve nakit akışını anlık takip edin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
            >
              <Plus className="w-4 h-4" /> Yeni Hakediş (İcmal) Ekle
            </button>
            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 transition-all"
            >
              <Coins className="w-4 h-4 text-orange-400" /> Masraf Girişi Yap
            </button>
          </div>
        </div>
      </div>

      {/* Financial KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hakediş Cirosu (Gelir)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₺{totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="w-3 h-3" /> Fatura Edilmiş
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Şantiye Giderleri (Maliyet)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₺{totalExpenses.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
            <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5 mt-0.5">
              <ArrowDownRight className="w-3 h-3" /> Malzeme & İşçilik
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Net Kâr</p>
            <p className={`text-2xl font-black mt-1 ${netEarnings >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ₺{netEarnings.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium flex items-center mt-0.5">
              Tesisat Karlılığı
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ortalama Brüt Marj</p>
            <p className="text-2xl font-black text-slate-900 mt-1">%{marginPct.toFixed(1)}</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full" 
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
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-semibold flex items-center gap-3 text-sm ${
                activeTab === "invoices" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Receipt className="w-4 h-4" /> Hakedişler & Faturalar
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-semibold flex items-center gap-3 text-sm ${
                activeTab === "expenses" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Coins className="w-4 h-4" /> Şantiye Giderleri
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-semibold flex items-center gap-3 text-sm ${
                activeTab === "payments" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CircleDollarSign className="w-4 h-4" /> Tahsilat & Ödeme Planı
            </button>
            <button
              onClick={() => setActiveTab("profitability")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-semibold flex items-center gap-3 text-sm ${
                activeTab === "profitability" 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Proje Karlılık (İcmal)
            </button>
          </div>

          {/* Quick Cash-Flow Warning */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="font-bold text-xs uppercase tracking-wider text-amber-800">Vade & Finansal Akış Uyarısı</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Gelecek 30 gün içerisinde tahsil edilecek 2 onaylı hakediş icmali bulunmaktadır. Taşeron ödemeleri ile eşleştirme yapılması önerilir.
            </p>
          </div>
        </div>

        {/* Tab Workspaces */}
        <div className="lg:col-span-3">
          {activeTab === "invoices" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-md font-bold text-slate-800">Hakediş Faturaları Listesi</h3>
                <span className="text-xs text-slate-400 font-medium">Toplam {invoices.length} fatura listelendi</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fatura No</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fatura Başlığı</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">KDV Dahil Toplam</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kesim Tarihi</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tahsilat Ekle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => {
                      const stat = STATUS_LABELS[inv.status] || STATUS_LABELS.draft;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900">{inv.invoice_no}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{inv.title || "İcmal Hakedişi"}</td>
                          <td className="px-6 py-4 text-sm font-extrabold text-slate-950">₺{Number(inv.grand_total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{new Date(inv.issue_date).toLocaleDateString("tr-TR")}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stat.color} ${stat.bg}`}>
                              {stat.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {inv.status !== "paid" ? (
                              <button
                                onClick={() => {
                                  setPaymentForm({
                                    ...paymentForm,
                                    invoice_id: inv.id,
                                    amount: inv.grand_total.toString()
                                  });
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                              >
                                Tahsil Et
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Kapandı
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                          Kayıtlı hakediş faturası bulunmamaktadır. Sağ üst köşeden ilk icmali oluşturun.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-md font-bold text-slate-800">Şantiye Gider Fişleri</h3>
                <span className="text-xs text-slate-400 font-medium">Toplam {expenses.length} harcama kaydı</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Harcama Grubu</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tutar</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Harcama Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-sm">{exp.description}</p>
                          <p className="text-[10px] text-slate-400">Gider Kaydı: {exp.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider">
                            {CATEGORY_LABELS[exp.category] || exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-extrabold text-rose-600">₺{Number(exp.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(exp.expense_date).toLocaleDateString("tr-TR")}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          Henüz hiçbir şantiye gider kaydı yapılmamış.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-md font-bold text-slate-800">Tahsilatlar & Ödemeler (Nakit Akışı)</h3>
                <span className="text-xs text-slate-400 font-medium">Toplam {payments.length} hareket</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Referans No</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hareket Yönü</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Miktar</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ödeme Yöntemi</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 font-bold">{pay.reference_no || `REF-${pay.id.slice(0, 8).toUpperCase()}`}</td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${pay.direction === "incoming" ? "text-emerald-600" : "text-rose-600"}`}>
                            {pay.direction === "incoming" ? "Müşteri Tahsilatı (+)" : "Tedarikçi Ödemesi (-)"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-black ${pay.direction === "incoming" ? "text-emerald-600" : "text-rose-600"}`}>
                          ₺{Number(pay.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-semibold uppercase">{pay.payment_method}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(pay.payment_date).toLocaleDateString("tr-TR")}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          Nakit akış tablosunda işlem kaydı bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "profitability" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Select Project for Profitability */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                <h3 className="text-md font-bold text-slate-800">Proje Bazlı Karlılık Analizi</h3>
                <select
                  className="p-2 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => loadProfitability(e.target.value)}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Profitability Result */}
              {profitabilityData ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Kesilen Hakediş</p>
                      <p className="text-xl font-black text-slate-900 mt-1">₺{profitabilityData.revenue.toLocaleString("tr")}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Harcanan Gider</p>
                      <p className="text-xl font-black text-rose-600 mt-1">₺{profitabilityData.cost.toLocaleString("tr")}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Net Kâr Miktarı</p>
                      <p className={`text-xl font-black mt-1 ${profitabilityData.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ₺{profitabilityData.net_profit.toLocaleString("tr")}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Bar visualization */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-600 font-bold uppercase">
                      <span>Proje Maliyet & Kar Oranı</span>
                      <span className="text-blue-600">Karlılık: %{profitabilityData.margin_pct}%</span>
                    </div>
                    <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex font-mono text-[10px] text-white font-extrabold shadow-inner">
                      {profitabilityData.revenue > 0 ? (
                        <>
                          <div 
                            className="bg-rose-500 h-full flex items-center justify-center transition-all duration-300"
                            style={{ width: `${Math.max(5, (profitabilityData.cost / profitabilityData.revenue) * 100)}%` }}
                          >
                            MALİYET (%{((profitabilityData.cost / profitabilityData.revenue) * 100).toFixed(0)}%)
                          </div>
                          <div 
                            className="bg-emerald-500 h-full flex items-center justify-center transition-all duration-300 flex-1"
                          >
                            NET KÂR (%{profitabilityData.margin_pct.toFixed(0)}%)
                          </div>
                        </>
                      ) : (
                        <div className="w-full text-slate-400 flex items-center justify-center italic font-semibold">Bu projede henüz hakediş kaydı bulunmuyor.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic">
                  Karlılık verileri yüklenemedi.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">Dönem Hakediş İcmali Oluştur</h3>
                <p className="text-xs text-slate-500 mt-0.5">Müşteri ve projelere ait fatura kesim aracı</p>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Müşteri Firma</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">İlgili Şantiye / Proje</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fatura / İcmal No</label>
                  <input 
                    type="text" 
                    placeholder="Örn: SIS-2026-0001"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={invoiceForm.invoice_no}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoice_no: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fatura Başlığı (Açıklama)</label>
                  <input 
                    type="text" 
                    placeholder="Örn: X Zincir Market HVAC Kurulum Hakedişi"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={invoiceForm.title}
                    onChange={(e) => setInvoiceForm({...invoiceForm, title: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Düzenleme Tarihi</label>
                  <input 
                    type="date"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({...invoiceForm, issue_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Son Ödeme Vadesi</label>
                  <input 
                    type="date"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Items List Dynamic Grid */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Fatura Kalemleri</span>
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({
                      ...invoiceForm,
                      items: [...invoiceForm.items, { description: "", quantity: 1, unit_price: 0 }]
                    })}
                    className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Kalem Ekle
                  </button>
                </div>

                {invoiceForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <input
                      type="text"
                      placeholder="Malzeme/Hizmet Kalem Açıklaması"
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
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
                      className="w-20 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
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
                      className="w-32 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
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
                          const newItems = invoiceForm.items.filter((_, i) => i !== idx);
                          setInvoiceForm({...invoiceForm, items: newItems});
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Grand totals display panel */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex flex-col gap-2 text-sm text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span>Ara Toplam:</span>
                  <span className="font-mono font-bold">₺{invoiceSubtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span>KDV Oranı:</span>
                    <input
                      type="number"
                      className="w-14 p-1 border border-slate-200 rounded text-xs font-mono font-bold text-center"
                      value={invoiceForm.tax_rate}
                      onChange={(e) => setInvoiceForm({...invoiceForm, tax_rate: parseFloat(e.target.value) || 0})}
                    />
                    <span>%</span>
                  </div>
                  <span className="font-mono font-bold">₺{invoiceTaxAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-slate-900">
                  <span>Genel Toplam:</span>
                  <span className="font-mono text-lg text-blue-600">₺{invoiceGrandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Hakediş İcmalini Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Masraf / Gider Girişi</h3>
                <p className="text-xs text-slate-500 mt-0.5">Şantiye malzeme, taşeron veya nakliye masrafları</p>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Masrafın Ait Olduğu Proje</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Harcama Grubu</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Harcama Açıklaması</label>
                <input 
                  type="text" 
                  placeholder="Örn: 200 mt Çelik Boru Nakliyesi"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tutar (TL)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tarih</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Gider Kaydını Tamamla
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tahsilat / Ödeme Girişi</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hakediş tahsilatı veya tedarikçi cari ödemesi</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-2">
                <button
                  type="button"
                  onClick={() => setPaymentForm({...paymentForm, direction: "incoming"})}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    paymentForm.direction === "incoming" 
                      ? "bg-emerald-500 text-white shadow-sm" 
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
                      ? "bg-rose-500 text-white shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Tedarikçi Gideri (-)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">İşlem Miktarı (TL)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono font-bold"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ödeme Tipi</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dekont / Ref No</label>
                  <input 
                    type="text" 
                    placeholder="Örn: REF-1823"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                    value={paymentForm.reference_no}
                    onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">İşlem Tarihi</label>
                <input 
                  type="date" 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Finansal Hareketi Tamamla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

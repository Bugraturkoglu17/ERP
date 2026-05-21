"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Package, 
  Briefcase, 
  DollarSign,
  ArrowRight,
  AlertTriangle,
  CircleCheck,
  Clock3,
  Plus,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Truck,
  FileText,
  User,
  Calendar,
  Cloud,
  Users,
  Clock,
  HardHat,
  ArrowUpRight,
  Check,
  X,
  Bell,
  AlertCircle,
  ShoppingBag,
  Inbox,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Building2,
  Coins,
  Activity,
  MapPin,
  Warehouse as WarehouseIcon
} from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { getTokenPayloadFromStorage, getRoles } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  status: string;
  project_no?: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  scope_codes?: string;
  contract_value?: number;
  created_at?: string;
  updated_at?: string;
}

interface Material {
  id: string;
  name: string;
  sku?: string;
  unit_cost?: number;
  min_stock_level?: number;
}

interface Invoice {
  id: string;
  grand_total: number;
  status: string;
}

interface Expense {
  id: string;
  project_id: string;
  project_name?: string;
  category: string; // material, labour, transport, equipment, miscellaneous
  description: string;
  amount: number;
  quantity?: number;
  expense_date: string;
}

interface Warehouse {
  id: string;
  type: string; // main, site
  name: string;
  code?: string;
  location?: string;
  project_id?: string;
  is_active: boolean;
}

interface LowStockAlert {
  id: string;
  item_id: string;
  current_stock: number;
  min_level: number;
  created_at: string;
}

interface PurchaseRequest {
  id: string;
  project_id?: string;
  project_name?: string;
  material_id: string;
  material_name?: string;
  quantity: number;
  priority: string;
  notes?: string;
  status: string;
  requested_at: string;
  requested_by_name?: string;
}

interface POItem {
  material_id: string;
  material_name?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  po_no: string;
  supplier_id?: string;
  supplier_name?: string;
  project_id?: string;
  project_name?: string;
  warehouse_id?: string;
  status: string;
  order_date?: string;
  expected_date?: string;
  received_at?: string;
  total_amount?: number;
  notes?: string;
  created_at: string;
  items: POItem[];
}

interface FieldReportItem {
  id: string;
  activity_type: string;
  description: string;
  hours_spent?: number;
  workers_count?: number;
}

interface FieldReport {
  id: string;
  project_id: string;
  project_name?: string;
  author_id: string;
  author_name?: string;
  report_date: string;
  summary?: string;
  weather?: string;
  team_size?: number;
  hours_worked?: number;
  submitted: boolean;
  approved_by?: string;
  approved_at?: string;
  items: FieldReportItem[];
}

// ── Priority & Status Mappings ────────────────────────────────────────────────
const PRIORITY_LABELS: Record<string, string> = { 
  normal: "Normal", 
  urgent: "Acil", 
  critical: "Kritik" 
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "corp-badge-secondary",
  urgent: "corp-badge-warning",
  critical: "corp-badge-danger",
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Onay Bekliyor", 
  approved: "Onaylandı", 
  rejected: "Reddedildi",
  draft: "Taslak", 
  ordered: "Sipariş Verildi", 
  received: "Teslim Alındı", 
  cancelled: "İptal",
};

const STATUS_COLORS: Record<string, string> = {
  pending_approval: "corp-badge-warning", 
  approved: "corp-badge-success",
  rejected: "corp-badge-danger", 
  draft: "corp-badge-secondary",
  ordered: "corp-badge-info", 
  received: "corp-badge-success", 
  cancelled: "corp-badge-danger",
};

export function DashboardOverview() {
  // Roles & Auths
  const [roles, setRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // States for sub-module data
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Expandable field reports tracking state
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  // Active action tab for consolidated action center
  const [activeActionTab, setActiveActionTab] = useState<"reports" | "requests" | "stock">("reports");

  // Quick Action Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Automatically focus on the first tab with pending tasks
  useEffect(() => {
    const pendingReqCount = requests.filter(r => r.status === "pending_approval").length;
    const pendingRepCount = reports.filter(r => r.submitted && !r.approved_by).length;
    const lowStockCount = lowStock.length;

    if (pendingRepCount > 0) {
      setActiveActionTab("reports");
    } else if (pendingReqCount > 0) {
      setActiveActionTab("requests");
    } else if (lowStockCount > 0) {
      setActiveActionTab("stock");
    }
  }, [reports, requests, lowStock]);

  // Modal Control States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAlertForRequest, setSelectedAlertForRequest] = useState<LowStockAlert | null>(null);
  const [requestForm, setRequestForm] = useState({
    project_id: "",
    quantity: 10,
    priority: "normal",
    notes: ""
  });

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState<PurchaseOrder | null>(null);
  const [receiveNotes, setReceiveNotes] = useState("");

  // System States
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  // Date Formatting Helper
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Money Formatting Helper
  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return "—";
    return `₺${Number(val).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    const userRoles = getRoles(payload);
    setRoles(userRoles);
    setIsAdmin(userRoles.includes("admin") || userRoles.includes("platform_admin"));
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  async function loadDashboardData() {
    try {
      const [
        projectsRes,
        materialsRes,
        invoicesRes,
        alertsRes,
        requestsRes,
        ordersRes,
        reportsRes,
        expensesRes,
        warehousesRes
      ] = await Promise.allSettled([
        apiGet<Project[]>("/projects"),
        apiGet<Material[]>("/inventory/materials"),
        apiGet<Invoice[]>("/finance/invoices"),
        apiGet<LowStockAlert[]>("/inventory/alerts/low-stock"),
        apiGet<PurchaseRequest[]>("/procurement/requests"),
        apiGet<PurchaseOrder[]>("/procurement/orders"),
        apiGet<FieldReport[]>("/field-reports/"),
        apiGet<Expense[]>("/finance/expenses"),
        apiGet<Warehouse[]>("/inventory/warehouses"),
      ]);

      if (projectsRes.status === "fulfilled") setProjects(Array.isArray(projectsRes.value) ? projectsRes.value : []);
      if (materialsRes.status === "fulfilled") setMaterials(Array.isArray(materialsRes.value) ? materialsRes.value : []);
      if (invoicesRes.status === "fulfilled") setInvoices(Array.isArray(invoicesRes.value) ? invoicesRes.value : []);
      if (alertsRes.status === "fulfilled") setLowStock(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      if (requestsRes.status === "fulfilled") setRequests(Array.isArray(requestsRes.value) ? requestsRes.value : []);
      if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
      if (reportsRes.status === "fulfilled") setReports(Array.isArray(reportsRes.value) ? reportsRes.value : []);
      if (expensesRes.status === "fulfilled") setExpenses(Array.isArray(expensesRes.value) ? expensesRes.value : []);
      if (warehousesRes.status === "fulfilled") setWarehouses(Array.isArray(warehousesRes.value) ? warehousesRes.value : []);

    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Action Handlers
  async function handleQuickApproveReport(reportId: string) {
    setSubmittingAction(reportId);
    try {
      await apiPatch(`/field-reports/${reportId}/approve`);
      setNotification({ type: "success", message: "Saha günlük raporu başarıyla onaylandı." });
      await loadDashboardData();
    } catch (e: any) {
      setNotification({ type: "error", message: e.response?.data?.detail || "Rapor onaylanırken bir hata oluştu." });
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleReviewRequest(requestId: string, action: "approve" | "reject") {
    setSubmittingAction(requestId);
    try {
      await apiPatch(`/procurement/requests/${requestId}/review`, {
        action,
        review_note: "Dashboard üzerinden hızlı gözden geçirme"
      });
      setNotification({
        type: "success",
        message: `Malzeme talebi başarıyla ${action === "approve" ? "onaylandı" : "reddedildi"}.`
      });
      await loadDashboardData();
    } catch (e: any) {
      setNotification({ type: "error", message: e.response?.data?.detail || "İşlem gerçekleştirilemedi." });
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleOpenRequestModal(alert: LowStockAlert) {
    setSelectedAlertForRequest(alert);
    setRequestForm({
      project_id: projects[0]?.id || "",
      quantity: Math.max(alert.min_level * 2 - alert.current_stock, 10),
      priority: "urgent",
      notes: "Kritik stok seviyesi uyarısı üzerine otomatik oluşturulan tedarik talebi."
    });
    setShowRequestModal(true);
  }

  async function handleCreateRequest() {
    if (!selectedAlertForRequest) return;
    setSubmittingAction("create-request");
    try {
      await apiPost("/procurement/requests", {
        material_id: selectedAlertForRequest.item_id,
        project_id: requestForm.project_id || null,
        quantity: Number(requestForm.quantity),
        priority: requestForm.priority,
        notes: requestForm.notes || null,
      });
      setShowRequestModal(false);
      setSelectedAlertForRequest(null);
      setNotification({ type: "success", message: "Kritik malzeme tedarik talebi başarıyla oluşturuldu." });
      await loadDashboardData();
    } catch (e: any) {
      setNotification({ type: "error", message: e.response?.data?.detail || "Talep oluşturulamadı." });
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleOpenReceiveModal(po: PurchaseOrder) {
    setSelectedPOForReceive(po);
    setReceiveNotes("Dashboard üzerinden hızlı teslim alındı.");
    setShowReceiveModal(true);
  }

  async function handleQuickReceivePO() {
    if (!selectedPOForReceive) return;
    setSubmittingAction("receive-po");
    try {
      await apiPatch(`/procurement/orders/${selectedPOForReceive.id}/receive`, {
        notes: receiveNotes || null
      });
      setShowReceiveModal(false);
      setSelectedPOForReceive(null);
      setNotification({ type: "success", message: "Sipariş teslim alındı ve stoklar güncellendi." });
      await loadDashboardData();
    } catch (e: any) {
      setNotification({ type: "error", message: e.response?.data?.detail || "Teslim alma işlemi başarısız oldu." });
    } finally {
      setSubmittingAction(null);
    }
  }

  const toggleReportExpanded = (reportId: string) => {
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] flex-col gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Mekanik ERP Operasyon Panosu yükleniyor...</p>
      </div>
    );
  }

  // ── Calculated Real-Time Stats ──────────────────────────────────────────────
  const activeProjectsCount = projects.filter(p => p.status === "in_progress").length;
  
  // Pending actions counts
  const pendingRequests = requests.filter(r => r.status === "pending_approval");
  const pendingReports = reports.filter(r => r.submitted && !r.approved_by);
  const activePOs = orders.filter(o => o.status === "ordered");

  // Real-time financial calculations
  const totalRevenue = invoices
    .filter(inv => ["paid", "approved", "sent"].includes(inv.status))
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 24;

  // Group expenses by category
  const expenseSummary = {
    material: 0,
    labour: 0,
    transport: 0,
    equipment: 0,
    miscellaneous: 0
  };
  
  expenses.forEach(exp => {
    const cat = (exp.category || "miscellaneous").toLowerCase();
    const amount = Number(exp.amount) || 0;
    if (cat in expenseSummary) {
      expenseSummary[cat as keyof typeof expenseSummary] += amount;
    } else {
      expenseSummary.miscellaneous += amount;
    }
  });
  
  const totalExpValue = Object.values(expenseSummary).reduce((a, b) => a + b, 0);

  // Helper for scope codes
  const parseScopes = (scopeCodesStr: string | undefined) => {
    if (!scopeCodesStr) return ["other"];
    try {
      const normalized = scopeCodesStr.replace(/'/g, '"');
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed) ? parsed : ["other"];
    } catch (e) {
      return ["other"];
    }
  };

  const SCOPE_BADGES: Record<string, { label: string; class: string }> = {
    seismic: { label: "SİSMİK KORUMA", class: "bg-amber-50 text-amber-700 border-amber-200/50" },
    hvac: { label: "HVAC HAVALANDIRMA", class: "bg-blue-50 text-blue-700 border-blue-200/50" },
    fire: { label: "YANGIN SÖNDÜRME", class: "bg-rose-50 text-rose-700 border-rose-200/50" },
    mep: { label: "MEP KOORDİNASYON", class: "bg-indigo-50 text-indigo-700 border-indigo-200/50" },
    other: { label: "GENEL MEKANİK", class: "bg-slate-100 text-slate-700 border-slate-200" }
  };

  const EXPENSE_LABELS: Record<string, string> = {
    material: "Malzeme Tedarik",
    labour: "Şantiye İşçilik & Taşeron",
    transport: "Lojistik & Nakliye",
    equipment: "Makine & Ekipman Kira",
    miscellaneous: "Genel Giderler",
  };

  const EXPENSE_COLORS: Record<string, string> = {
    material: "bg-amber-600",
    labour: "bg-blue-600",
    transport: "bg-indigo-600",
    equipment: "bg-rose-600",
    miscellaneous: "bg-slate-500",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 animate-in fade-in duration-200">
      
      {/* ── NOTIFICATION TOAST ── */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-xl animate-in slide-in-from-bottom duration-300 ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── CORPORATE HEADER BANNER ── */}
      <div className="corp-header">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-[10px] font-black uppercase tracking-wider">
              <Bell className="w-3 h-3 text-amber-400 animate-pulse" />
              Operasyon Kontrol Merkezi
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2.5">Operasyon Panosu</h2>
            <p className="text-slate-300 mt-2 text-xs max-w-2xl">
              Proje ilerlemelerini, şantiye günlük raporlarını, kritik depo seviyelerini ve satın alma siparişlerini tek bir merkezden izleyin ve yönetin.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href="/projects" className="corp-btn-primary bg-indigo-600 hover:bg-indigo-700 text-[11px] py-2 px-3.5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Yeni Proje
            </a>
            <a href="/procurement" className="corp-btn-secondary text-[11px] py-2 px-3.5 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Tedarik Planı
            </a>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS SUMMARY GRID (4 COLUMNS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        
        {/* CARD 1: Projects */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-150">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Projeler & Şantiye</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{projects.length}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              <span className="text-blue-600 font-bold">{activeProjectsCount}</span> sahada devam ediyor
            </p>
          </div>
        </div>

        {/* CARD 2: Action Queue */}
        <div className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-150 ${
          (pendingRequests.length + pendingReports.length) > 0 ? "border-slate-200" : "border-slate-200"
        }`}>
          <div className={`p-3.5 rounded-xl shrink-0 border ${
            (pendingRequests.length + pendingReports.length) > 0 
              ? "bg-amber-50 text-amber-600 border-amber-100" 
              : "bg-indigo-50 text-indigo-600 border-indigo-100"
          }`}>
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Onay Sırası (Aksiyon)</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {pendingRequests.length + pendingReports.length}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              {pendingRequests.length > 0 || pendingReports.length > 0 ? (
                <span className="text-amber-600 font-bold">
                  {pendingRequests.length} talep / {pendingReports.length} rapor bekliyor
                </span>
              ) : (
                "Tüm onaylar tamamlandı"
              )}
            </p>
          </div>
        </div>

        {/* CARD 3: Stock & Inventory Alerts */}
        <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-150`}>
          <div className={`p-3.5 rounded-xl shrink-0 border ${
            lowStock.length > 0 
              ? "bg-rose-50 text-rose-600 border-rose-100" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Depo & Stok Alarmları</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{lowStock.length}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              {lowStock.length > 0 ? (
                <span className="text-rose-600 font-bold">{lowStock.length} ürün kritik sınırda!</span>
              ) : (
                <span className="text-emerald-600 font-bold">Stok seviyeleri ideal</span>
              )}
            </p>
          </div>
        </div>

        {/* CARD 4: Financial Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-150">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Finansal Sağlık & Kâr Marjı</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              %{marginPct}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              Net Kâr: <span className="text-emerald-600 font-extrabold">{formatCurrency(netProfit)}</span>
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/*  ROW 1: ACİL AKSİYON & ONAY MERKEZİ (8/12) + HIZLI MÜHENDİSLİK İŞLEMLERİ (4/12) */}
      {/*  Gerekçe: Şantiyede işin durmasını önleyecek eylemler ve kısayollar en üstte yer alır */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Acil Aksiyon & Onay Merkezi (8/12) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Acil Aksiyon & Onay Merkezi</h3>
            </div>
            
            {/* Tabs for Action Center */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => setActiveActionTab("reports")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 border select-none ${
                  activeActionTab === "reports"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Saha Raporları
                <span className={`inline-flex items-center justify-center rounded-full text-[9px] font-black px-1.5 py-0.2 shrink-0 ${
                  activeActionTab === "reports" ? "bg-white text-indigo-700" : "bg-slate-200 text-slate-700"
                }`}>
                  {pendingReports.length}
                </span>
              </button>
              <button
                onClick={() => setActiveActionTab("requests")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 border select-none ${
                  activeActionTab === "requests"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Malzeme Talepleri
                <span className={`inline-flex items-center justify-center rounded-full text-[9px] font-black px-1.5 py-0.2 shrink-0 ${
                  activeActionTab === "requests" ? "bg-white text-indigo-700" : "bg-slate-200 text-slate-700"
                }`}>
                  {pendingRequests.length}
                </span>
              </button>
              <button
                onClick={() => setActiveActionTab("stock")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 border select-none ${
                  activeActionTab === "stock"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Stok Alarmları
                <span className={`inline-flex items-center justify-center rounded-full text-[9px] font-black px-1.5 py-0.2 shrink-0 ${
                  activeActionTab === "stock" ? "bg-white text-indigo-700" : "bg-slate-200 text-slate-700"
                }`}>
                  {lowStock.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            {/* Tab content 1: Field Reports */}
            {activeActionTab === "reports" && (
              <div className="divide-y divide-slate-100 max-h-[22rem] overflow-y-auto pr-1">
                {pendingReports.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Saha Raporları Güncel</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Onay bekleyen günlük saha raporu bulunmuyor.</p>
                  </div>
                ) : (
                  pendingReports.map(report => {
                    const isExpanded = !!expandedReports[report.id];
                    return (
                      <div key={report.id} className="hover:bg-slate-50/30 transition-colors">
                        <div className="p-4 flex items-center justify-between gap-4">
                          <div 
                            className="min-w-0 space-y-1 cursor-pointer flex-1"
                            onClick={() => toggleReportExpanded(report.id)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-800">
                                {formatDate(report.report_date)}
                              </span>
                              {report.weather && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-sky-50 border border-sky-100 rounded text-[9px] font-bold text-sky-700">
                                  <Cloud className="w-2.5 h-2.5" /> {report.weather}
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.2 rounded flex items-center gap-0.5 select-none">
                                {isExpanded ? "Gizle" : "Detaylar"}
                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 truncate">
                              🏢 {report.project_name || "Bilinmeyen Proje"}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" /> {report.author_name || "Mühendis"}
                              </span>
                              {report.team_size && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" /> {report.team_size} kişi
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <button
                              onClick={() => handleQuickApproveReport(report.id)}
                              disabled={submittingAction === report.id}
                              className="corp-btn-primary bg-emerald-600 hover:bg-emerald-700 text-[10px] py-1.5 px-2.5 flex items-center gap-1 shrink-0 animate-in fade-in"
                            >
                              {submittingAction === report.id ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Onayla
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100 space-y-2">
                            {report.summary && (
                              <div className="text-[11px] text-slate-700 bg-white border border-slate-200/60 rounded-xl p-2.5">
                                <strong>Özet:</strong> {report.summary}
                              </div>
                            )}
                            <div className="space-y-1.5">
                              {(!report.items || report.items.length === 0) ? (
                                <p className="text-[10px] text-slate-400 italic">Faaliyet kaydı eklenmemiş.</p>
                              ) : (
                                report.items.map((item, iidx) => (
                                  <div key={item.id || iidx} className="bg-white border border-slate-200/60 rounded-xl p-2.5 flex items-start justify-between gap-3 text-[11px] shadow-sm">
                                    <div className="space-y-0.5">
                                      <span className="inline-flex px-1.5 py-0.2 bg-indigo-50 border border-indigo-100 rounded text-[9px] font-bold text-indigo-700 uppercase">
                                        {item.activity_type}
                                      </span>
                                      <p className="text-slate-700 font-semibold leading-relaxed mt-1">{item.description}</p>
                                    </div>
                                    <div className="text-right text-[10px] text-slate-400 font-bold shrink-0">
                                      {item.workers_count && <p className="text-slate-700">{item.workers_count} Usta</p>}
                                      {item.hours_spent && <p className="text-slate-500">{item.hours_spent}s</p>}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab content 2: Material Requests */}
            {activeActionTab === "requests" && (
              <div className="divide-y divide-slate-100 max-h-[22rem] overflow-y-auto pr-1">
                {pendingRequests.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Tüm Talepler Onaylı</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Onay sırasını bekleyen malzeme talebi bulunmuyor.</p>
                  </div>
                ) : (
                  pendingRequests.map(req => (
                    <div key={req.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-black text-slate-800 font-bold font-bold">
                            {req.material_name || req.material_id.slice(0, 8)}
                          </p>
                          <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-extrabold ${PRIORITY_COLORS[req.priority] || "corp-badge-secondary"}`}>
                            {PRIORITY_LABELS[req.priority] || req.priority}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500">
                          Proje: {req.project_name || "—"}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                          <span className="text-slate-800">Miktar: {req.quantity} adet</span>
                          <span>{formatDate(req.requested_at)}</span>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleReviewRequest(req.id, "approve")}
                            disabled={submittingAction === req.id}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg hover:shadow-sm"
                            title="Onayla"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReviewRequest(req.id, "reject")}
                            disabled={submittingAction === req.id}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg hover:shadow-sm"
                            title="Reddet"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab content 3: Low Stock Alerts */}
            {activeActionTab === "stock" && (
              <div className="divide-y divide-slate-100 max-h-[22rem] overflow-y-auto pr-1">
                {lowStock.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                      <CircleCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Depo Stokları Güvende</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Kritik seviyenin altına düşen malzeme bulunmuyor.</p>
                  </div>
                ) : (
                  lowStock.map(alert => {
                    const matchedMat = materials.find(m => m.id === alert.item_id);
                    return (
                      <div key={alert.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-black text-slate-800">
                            {matchedMat ? matchedMat.name : `Malzeme (${alert.item_id.slice(0, 8)})`}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded">
                              Mevcut: {alert.current_stock}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Min: {alert.min_level}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleOpenRequestModal(alert)}
                          className="corp-btn-secondary border-rose-200 text-rose-700 hover:bg-rose-50 text-[10px] py-1.5 px-2.5 font-bold"
                        >
                          Talebe Dönüştür
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hızlı Mühendislik İşlemleri (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-indigo-600" />
              Hızlı Mühendislik İşlemleri
            </h3>
            <p className="text-slate-500 text-[11px] mt-3 leading-relaxed font-semibold">
              Günlük tesisat montajı, malzeme çıkışları, şantiye raporlama ve gider takip sayfalarına tek tıkla geçiş yapın.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <a href="/inventory" className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all duration-100 group flex flex-col justify-between min-h-[5.5rem]">
              <Package className="w-4 h-4 text-amber-500 group-hover:scale-105 transition-transform" />
              <div className="mt-2 text-left">
                <span className="text-[10px] font-black uppercase text-slate-800 block">Stok Hareketi</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Giriş / Çıkış Gir</span>
              </div>
            </a>
            <a href="/field-reports" className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all duration-100 group flex flex-col justify-between min-h-[5.5rem]">
              <FileText className="w-4 h-4 text-indigo-500 group-hover:scale-105 transition-transform" />
              <div className="mt-2 text-left">
                <span className="text-[10px] font-black uppercase text-slate-800 block">Saha Raporu</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Faaliyet Kaydet</span>
              </div>
            </a>
            <a href="/procurement" className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all duration-100 group flex flex-col justify-between min-h-[5.5rem]">
              <Truck className="w-4 h-4 text-sky-500 group-hover:scale-105 transition-transform" />
              <div className="mt-2 text-left">
                <span className="text-[10px] font-black uppercase text-slate-800 block">Yeni Malzeme</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Tedarik Talebi Aç</span>
              </div>
            </a>
            <a href="/finance" className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all duration-100 group flex flex-col justify-between min-h-[5.5rem]">
              <DollarSign className="w-4 h-4 text-emerald-500 group-hover:scale-105 transition-transform" />
              <div className="mt-2 text-left">
                <span className="text-[10px] font-black uppercase text-slate-800 block">Finans Analiz</span>
                <span className="text-[9px] text-slate-400 font-semibold block">Ciro & Gider İzle</span>
              </div>
            </a>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/*  ROW 2: AKTİF PROJELER & TEKNİK İLERLEME (8/12) + ŞANTİYE MALİYET KIRILIMI (4/12) */}
      {/*  Gerekçe: Projelerin mekanik süreçleri ve bütçe kırılımları yan yana izlenir */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Aktif Projeler & Teknik İlerleme (8/12) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Aktif Projeler & Teknik İlerleme</h3>
            </div>
            <a href="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800">
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-2 font-black uppercase text-slate-400 tracking-wider">Proje Kodu & Adı</th>
                  <th className="py-3 px-2 font-black uppercase text-slate-400 tracking-wider">Mekanik Disiplinler</th>
                  <th className="py-3 px-2 font-black uppercase text-slate-400 tracking-wider">Zaman İlerlemesi</th>
                  <th className="py-3 px-2 font-black uppercase text-slate-400 tracking-wider text-right">Sözleşme Tutarı</th>
                  <th className="py-3 px-2 font-black uppercase text-slate-400 tracking-wider text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 font-bold italic">Kayıtlı proje bulunmamaktadır.</td>
                  </tr>
                ) : (
                  projects.slice(0, 4).map((p, idx) => {
                    const statusMap: Record<string, string> = {
                      inquiry: "Keşif Aşaması",
                      approved: "Onaylı Plan",
                      in_progress: "Sahada Devam",
                      invoice_pend: "Hakediş Bekliyor",
                      completed: "Tamamlandı",
                      cancelled: "İptal",
                    };
                    const statusColors: Record<string, string> = {
                      inquiry: "bg-purple-50 text-purple-700 border-purple-200",
                      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      in_progress: "bg-blue-50 text-blue-700 border-blue-200",
                      invoice_pend: "bg-amber-50 text-amber-700 border-amber-200",
                      completed: "bg-slate-100 text-slate-600 border-slate-200",
                      cancelled: "bg-rose-50 text-rose-700 border-rose-200",
                    };
                    
                    const scopeCodes = parseScopes(p.scope_codes);
                    
                    let progressPct = 0;
                    let progressText = "Tarih Belirtilmemiş";
                    let isOverdue = false;
                    if (p.start_date && p.due_date) {
                      const start = new Date(p.start_date).getTime();
                      const end = new Date(p.due_date).getTime();
                      const now = Date.now();
                      
                      if (now > start) {
                        if (now >= end) {
                          progressPct = 100;
                          progressText = "Süre Tamamlandı";
                          isOverdue = p.status !== "completed" && p.status !== "cancelled";
                        } else {
                          progressPct = Math.round(((now - start) / (end - start)) * 100);
                          progressText = `%${progressPct} Zaman Geçti`;
                        }
                      } else {
                        progressText = "Planlandı / Başlamadı";
                      }
                    }

                    return (
                      <tr key={p.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {p.project_no && (
                                <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-600 shrink-0">
                                  {p.project_no}
                                </span>
                              )}
                              <span className="font-bold text-slate-800 truncate max-w-[150px]">{p.name}</span>
                            </div>
                            {p.description && (
                              <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[200px]">{p.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="flex flex-wrap gap-1">
                            {scopeCodes.map((sc, sidx) => {
                              const badge = SCOPE_BADGES[sc] || SCOPE_BADGES.other;
                              return (
                                <span key={sidx} className={`inline-flex px-1.5 py-0.2 rounded border text-[8px] font-black tracking-wide ${badge.class}`}>
                                  {badge.label}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                              <span>{progressText}</span>
                              {isOverdue && (
                                <span className="text-rose-600 flex items-center gap-0.5 font-black">
                                  <AlertTriangle className="w-2.5 h-2.5 animate-pulse" /> GECİKTİ
                                </span>
                              )}
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isOverdue ? "bg-rose-500" : progressPct === 100 ? "bg-emerald-500" : "bg-indigo-600"
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-right font-bold text-slate-800">
                          {p.contract_value ? formatCurrency(p.contract_value) : "—"}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${statusColors[p.status] || "bg-slate-100 text-slate-600"}`}>
                            {statusMap[p.status] || p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gider Kırılımı & Masraf Analizi (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Şantiye Maliyet Kırılımı</h3>
            </div>
            <a href="/finance" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800">
              Detaylı Analiz <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              {Object.entries(expenseSummary).map(([category, value]) => {
                const percentage = totalExpValue > 0 ? Math.round((value / totalExpValue) * 100) : 0;
                const label = EXPENSE_LABELS[category] || category;
                const colorClass = EXPENSE_COLORS[category] || "bg-indigo-600";
                
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600">{label}</span>
                      <span className="text-slate-800">{formatCurrency(value)} (%{percentage})</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorClass} transition-all duration-300`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Toplam Şantiye Masrafı</span>
                <p className="text-lg font-black text-slate-900">{formatCurrency(totalExpValue)}</p>
              </div>
              
              <div className={`px-3 py-2 rounded-xl border flex items-center gap-2 ${
                marginPct >= 20 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : marginPct >= 10 
                    ? "bg-amber-50 border-amber-200 text-amber-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                <ShieldCheck className={`w-4 h-4 ${marginPct >= 20 ? "text-emerald-600" : marginPct >= 10 ? "text-amber-600" : "text-rose-600"}`} />
                <div className="text-[10px] font-extrabold">
                  <p className="uppercase tracking-wide">BÜTÇE STATÜSÜ</p>
                  <p className="font-semibold">{marginPct >= 20 ? "Güvenli ve Dengeli" : "Maliyet Denetimi Önerilir"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/*  ROW 3: DEPO KAPASİTELERİ (6/12) + SEVKİYAT AŞAMASINDAKİ SİPARİŞLER (PO) (6/12) */}
      {/*  Gerekçe: Stoklar, depolar ve malzeme sevkiyatları lojistik katmanında izlenir */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Lojistik & Aktif Depo Havuzu (6/12) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Depo Kapasiteleri & Lojistik Dağılım</h3>
            </div>
            <a href="/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800">
              Tüm Depolar <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[20rem] pr-1">
            {warehouses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold italic">Aktif depo havuzu boş.</div>
            ) : (
              warehouses.map(wh => (
                <div key={wh.id} className="bg-slate-50 border border-slate-200/60 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-colors">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 truncate block">{wh.name}</span>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[8px] font-black tracking-wide border ${
                        wh.type === "main" 
                          ? "bg-slate-100 text-slate-700 border-slate-300/60" 
                          : "bg-blue-50 text-blue-700 border-blue-200/50"
                      }`}>
                        {wh.type === "main" ? "MERKEZ" : "ŞANTİYE"}
                      </span>
                    </div>
                    {wh.code && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">KOD: {wh.code}</p>
                    )}
                    {wh.location && (
                      <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {wh.location}
                      </p>
                    )}
                    {wh.type === "site" && wh.project_id && (
                      <p className="text-[10px] text-indigo-600 bg-indigo-50/50 border border-indigo-100/60 rounded px-1.5 py-0.5 inline-block font-semibold">
                        🏢 Proje: {projects.find(p => p.id === wh.project_id)?.name || "İlişkili Proje"}
                      </p>
                    )}
                  </div>
                  
                  <a 
                    href="/inventory"
                    className="corp-btn-secondary py-1.5 px-3 hover:bg-slate-100 text-[10px] font-bold flex items-center gap-1 shrink-0"
                  >
                    Stoklar
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Son Satın Alma Siparişleri (PO) (6/12) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Sevkiyat Aşamasındaki Siparişler (PO)
              </h3>
            </div>
            {activePOs.length > 0 && (
              <span className="rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-black px-2.5 py-0.5">
                {activePOs.length} yolda
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[20rem] overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">Aktif PO Bulunmuyor</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Yolda veya bekleyen satın alma siparişi bulunmuyor.</p>
              </div>
            ) : (
              orders.slice(0, 5).map(po => (
                <div key={po.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800">{po.po_no}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${STATUS_COLORS[po.status] || "corp-badge-secondary"}`}>
                        {STATUS_LABELS[po.status] || po.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 truncate">
                      🏢 {po.supplier_name || "Bilinmeyen Tedarikçi"}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                      <span>{formatCurrency(po.total_amount)}</span>
                      {po.expected_date && <span>Teslim: {formatDate(po.expected_date)}</span>}
                    </div>
                  </div>
                  
                  {isAdmin && po.status === "ordered" && (
                    <button
                      onClick={() => handleOpenReceiveModal(po)}
                      className="corp-btn-primary text-[10px] py-1.5 px-2.5 flex items-center gap-1 shrink-0"
                    >
                      Teslim Al
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/*  MODALS                                                                   */}
      {/* ========================================================================= */}
      {showRequestModal && selectedAlertForRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowRequestModal(false); setSelectedAlertForRequest(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Kritik Stok Tedarik Talebi</h3>
              </div>
              <button onClick={() => { setShowRequestModal(false); setSelectedAlertForRequest(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <p><strong>Malzeme:</strong> {materials.find(m => m.id === selectedAlertForRequest.item_id)?.name || "Bilinmiyor"}</p>
              <p><strong>Mevcut Durum:</strong> {selectedAlertForRequest.current_stock} adet (Minimum limit: {selectedAlertForRequest.min_level})</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İlgili Proje *</label>
                <select className="corp-select mt-1" value={requestForm.project_id} onChange={e => setRequestForm({...requestForm, project_id: e.target.value})}>
                  <option value="">Seçin...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Talep Miktarı (Adet) *</label>
                  <input type="number" min={1} className="corp-input mt-1" value={requestForm.quantity} onChange={e => setRequestForm({...requestForm, quantity: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Öncelik</label>
                  <select className="corp-select mt-1" value={requestForm.priority} onChange={e => setRequestForm({...requestForm, priority: e.target.value})}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Acil</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Açıklama / Şantiye Gerekçesi</label>
                <textarea className="corp-input mt-1 h-20 resize-none" placeholder="Tedarik ihtiyacının gerekçesi..." value={requestForm.notes} onChange={e => setRequestForm({...requestForm, notes: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowRequestModal(false); setSelectedAlertForRequest(null); }} className="flex-1 corp-btn-secondary">İptal</button>
              <button onClick={handleCreateRequest} disabled={submittingAction === "create-request"} className="flex-1 corp-btn-primary">
                {submittingAction === "create-request" ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <><Check className="h-4 w-4 inline mr-1" /> Talebi Gönder</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*  MODAL 2: HIZLI PO TESLİM ALMA MODAL                                      */}
      {/* ========================================================================= */}
      {showReceiveModal && selectedPOForReceive && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowReceiveModal(false); setSelectedPOForReceive(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Siparişi Teslim Al</h3>
              </div>
              <button onClick={() => { setShowReceiveModal(false); setSelectedPOForReceive(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
              <p><strong>Sipariş No:</strong> {selectedPOForReceive.po_no}</p>
              <p><strong>Tedarikçi:</strong> {selectedPOForReceive.supplier_name || "—"}</p>
              <p><strong>Proje:</strong> {selectedPOForReceive.project_name || "—"}</p>
              <p><strong>Toplam Hacim:</strong> {formatCurrency(selectedPOForReceive.total_amount)}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed font-semibold">
              ⚠️ Bu işlem siparişe bağlı tüm malzemeleri hedef depoya yükleyecek ve stok seviyelerini artıracaktır.
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teslimat Notu</label>
              <textarea className="corp-input mt-1 h-16 resize-none" placeholder="İrsaliye no, eksik teslim vb..." value={receiveNotes} onChange={e => setReceiveNotes(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowReceiveModal(false); setSelectedPOForReceive(null); }} className="flex-1 corp-btn-secondary">İptal</button>
              <button onClick={handleQuickReceivePO} disabled={submittingAction === "receive-po"} className="flex-1 corp-btn-primary">
                {submittingAction === "receive-po" ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <><Check className="h-4 w-4 inline mr-1" /> Teslim Aldım</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

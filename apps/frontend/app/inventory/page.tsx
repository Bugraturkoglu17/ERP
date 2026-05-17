"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Package, Warehouse as WarehouseIcon, ArrowRightLeft, AlertTriangle, X, Plus, Edit2, Trash2 } from "lucide-react";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "warehouses" | "transfers">("materials");
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Warehouse State for Stock View
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  
  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    material_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    quantity: 1,
    reference_no: "",
    notes: "",
  });

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilters, setTxFilters] = useState({
    material_id: "",
    warehouse_id: "",
    transaction_type: "",
  });

  // Add Material Modal State
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [materialForm, setMaterialForm] = useState({
    sku: "",
    name: "",
    unit: "Adet",
    unit_cost: 0,
    min_stock_level: 0,
    warehouse_id: "",
    initial_quantity: 0,
  });

  // Add Warehouse Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    type: "site",
    location: "",
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mats, whs] = await Promise.all([
          apiGet("/inventory/materials"),
          apiGet("/inventory/warehouses"),
        ]);
        setMaterials(Array.isArray(mats) ? mats : []);
        setWarehouses(Array.isArray(whs) ? whs : []);
      } catch (err) {
        console.error("Inventory load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSelectWarehouse(wh: any) {
    setSelectedWarehouse(wh);
    try {
      const stock = await apiGet(`/inventory/warehouses/${wh.id}/stock`);
      setWarehouseStock(Array.isArray(stock) ? stock : []);
    } catch (err) {
      console.error("Stock fetch error:", err);
      setWarehouseStock([]);
    }
  }

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (txFilters.material_id) params.append("material_id", txFilters.material_id);
      if (txFilters.warehouse_id) params.append("warehouse_id", txFilters.warehouse_id);
      if (txFilters.transaction_type) params.append("transaction_type", txFilters.transaction_type);
      
      const data = await apiGet(`/inventory/transactions?${params.toString()}`);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Transactions fetch error:", err);
    } finally {
      setTxLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "transfers") {
      fetchTransactions();
    }
  }, [activeTab, txFilters]);

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost("/inventory/transfer", transferForm);
      alert("Transfer başarıyla gerçekleştirildi.");
      setIsTransferModalOpen(false);
      // Refresh data
      if (selectedWarehouse) handleSelectWarehouse(selectedWarehouse);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Transfer işlemi başarısız oldu.");
    }
  }

  function handleEditMaterial(m: any) {
    setEditingMaterial(m);
    setMaterialForm({
      sku: m.sku,
      name: m.name,
      unit: m.unit,
      unit_cost: m.unit_cost || 0,
      min_stock_level: m.min_stock_level || 0,
    });
    setIsMaterialModalOpen(true);
  }

  function handleEditWarehouse(wh: any) {
    setEditingWarehouse(wh);
    setWarehouseForm({
      name: wh.name,
      type: wh.type,
      location: wh.location || "",
    });
    setIsWarehouseModalOpen(true);
  }

  async function handleMaterialSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await apiPatch(`/inventory/materials/${editingMaterial.id}`, materialForm);
        alert("Malzeme başarıyla güncellendi.");
      } else {
        await apiPost("/inventory/materials", materialForm);
        alert("Malzeme başarıyla eklendi.");
      }
      setIsMaterialModalOpen(false);
      setEditingMaterial(null);
      setMaterialForm({ sku: "", name: "", unit: "Adet", unit_cost: 0, min_stock_level: 0, warehouse_id: "", initial_quantity: 0 });
      // Refresh materials
      const mats = await apiGet("/inventory/materials");
      setMaterials(Array.isArray(mats) ? mats : []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "İşlem başarısız oldu.");
    }
  }

  async function handleWarehouseSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await apiPatch(`/inventory/warehouses/${editingWarehouse.id}`, warehouseForm);
        alert("Depo başarıyla güncellendi.");
      } else {
        await apiPost("/inventory/warehouses", warehouseForm);
        alert("Depo başarıyla eklendi.");
      }
      setIsWarehouseModalOpen(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: "", type: "site", location: "" });
      // Refresh warehouses
      const whs = await apiGet("/inventory/warehouses");
      setWarehouses(Array.isArray(whs) ? whs : []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "İşlem başarısız oldu.");
    }
  }

  async function handleDeleteMaterial(id: string) {
    if (!confirm("Bu malzemeyi silmek istediğinize emin misiniz?")) return;
    try {
      await apiDelete(`/inventory/materials/${id}`);
      alert("Malzeme başarıyla silindi.");
      const mats = await apiGet("/inventory/materials");
      setMaterials(Array.isArray(mats) ? mats : []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Silme işlemi başarısız oldu.");
    }
  }

  async function handleDeleteWarehouse(id: string) {
    if (!confirm("Bu depoyu silmek istediğinize emin misiniz?")) return;
    try {
      await apiDelete(`/inventory/warehouses/${id}`);
      alert("Depo başarıyla silindi.");
      const whs = await apiGet("/inventory/warehouses");
      setWarehouses(Array.isArray(whs) ? whs : []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Silme işlemi başarısız oldu.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Envanter verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Header and Quick Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight font-sans">Depo & Envanter Yönetimi</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-xl font-medium">
              Sismik Mekanik bünyesindeki malzeme kataloğu, merkez ve şantiye depoları ile depolar arası stok transfer süreçlerini izleyin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeTab === "materials" && (
              <button 
                onClick={() => setIsMaterialModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" /> Yeni Malzeme Ekle
              </button>
            )}
            {activeTab === "warehouses" && (
              <button 
                onClick={() => setIsWarehouseModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all transform hover:-translate-y-0.5"
              >
                <WarehouseIcon className="w-4 h-4" /> Yeni Depo Ekle
              </button>
            )}
            {activeTab === "transfers" && (
              <button 
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all transform hover:-translate-y-0.5"
              >
                <ArrowRightLeft className="w-4 h-4" /> Yeni Transfer Oluştur
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-fit border border-slate-200/60 shadow-inner">
        {[
          { id: "materials", label: "Malzeme Kataloğu", icon: Package },
          { id: "warehouses", label: "Depolar & Stok Durumu", icon: WarehouseIcon },
          { id: "transfers", label: "Stok Transfer Geçmişi", icon: ArrowRightLeft },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id 
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/40" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "materials" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-800">Malzeme Kataloğu</h3>
              <span className="text-xs text-slate-400 font-medium">Toplam {materials.length} malzeme listelendi</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Malzeme Adı</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Birim</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Birim Maliyet</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kritik Seviye</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {materials.map((m) => (
               <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                 <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900">{m.sku}</td>
                 <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{m.name}</td>
                 <td className="px-6 py-4 text-sm text-slate-600">{m.unit}</td>
                 <td className="px-6 py-4 text-sm font-extrabold text-slate-900">₺{Number(m.unit_cost || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                 <td className="px-6 py-4">
                   <span className={`text-xs font-bold ${m.min_stock_level > 0 ? "text-amber-600" : "text-slate-400"}`}>
                     {m.min_stock_level} {m.unit}
                   </span>
                 </td>
                 <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => handleEditMaterial(m)}
                       className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-100 bg-white shadow-sm"
                       title="Düzenle"
                     >
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => handleDeleteMaterial(m.id)}
                       className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-100 bg-white shadow-sm"
                       title="Sil"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </td>
               </tr>
             ))}

               {materials.length === 0 && (
                 <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Kayıtlı malzeme bulunamadı.</td>
                 </tr>
               )}

             </tbody>
            </table>
          </div>
        </div>
      )}





      {activeTab === "warehouses" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Depo Listesi</h3>
            <div className="grid grid-cols-1 gap-3">
              {warehouses.map((wh) => (
                <div 
                  key={wh.id} 
                  onClick={() => handleSelectWarehouse(wh)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    selectedWarehouse?.id === wh.id ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500" : "bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <WarehouseIcon className={`w-5 h-5 ${selectedWarehouse?.id === wh.id ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="font-medium text-slate-900">{wh.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditWarehouse(wh);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWarehouse(wh.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${wh.type === 'main' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {wh.type === 'main' ? 'Merkez' : 'Şantiye'}
                        </span>
                      </div>
                    </div>

                  <p className="text-xs text-slate-500 mt-2">{wh.location || "Konum belirtilmemiş"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedWarehouse ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">{selectedWarehouse.name} - Stok Durumu</h3>
                  <button 
                    onClick={() => setIsTransferModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-blue-100 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Transfer Yap
                  </button>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Malzeme</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Miktar</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warehouseStock.map((item) => (
                      <tr key={item.material_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.sku}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{item.quantity} {item.unit}</td>
                        <td className="px-6 py-4 text-center">
                          {item.quantity <= item.min_stock_level ? (
                            <span className="flex items-center justify-center gap-1 text-red-600 text-xs font-bold">
                              <AlertTriangle className="w-3 h-3" /> Kritik
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs font-medium">Yeterli</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {warehouseStock.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Bu depoda stok bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300/80 text-slate-400 p-12 text-center animate-in fade-in duration-200">
                <WarehouseIcon className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Stok detaylarını görmek için soldan bir depo seçiniz.</p>
               </div>
             )}
           </div>
         </div>
       </div>
     )}


       {activeTab === "transfers" && (
         <div className="space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-900">Stok Hareketleri ve Transferler</h3>
             <button 
               onClick={() => setIsTransferModalOpen(true)}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
             >
               <Plus className="w-4 h-4" /> Yeni Transfer Oluştur
             </button>
           </div>

           {/* Filters */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border">
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Malzeme</label>
               <select 
                 className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
                 value={txFilters.material_id}
                 onChange={(e) => setTxFilters({...txFilters, material_id: e.target.value})}
               >
                 <option value="">Tümü</option>
                 {materials.map(m => <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Depo</label>
               <select 
                 className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
                 value={txFilters.warehouse_id}
                 onChange={(e) => setTxFilters({...txFilters, warehouse_id: e.target.value})}
               >
                 <option value="">Tümü</option>
                 {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">İşlem Tipi</label>
               <select 
                 className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
                 value={txFilters.transaction_type}
                 onChange={(e) => setTxFilters({...txFilters, transaction_type: e.target.value})}
               >
                 <option value="">Tümü</option>
                 <option value="TRANSFER">Transfer</option>
                 <option value="IN">Giriş (IN)</option>
                 <option value="OUT">Çıkış (OUT)</option>
                 <option value="RETURN">İade (RETURN)</option>
                 <option value="ADJUSTMENT">Düzeltme (ADJUSTMENT)</option>
               </select>
             </div>
           </div>

           <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Malzeme</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kaynak</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hedef</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Miktar</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tip</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Referans</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {txLoading ? (
                   <tr>
                     <td colSpan={7} className="px-6 py-10 text-center text-slate-400">Yükleniyor...</td>
                   </tr>
                 ) : transactions.map((tx) => {
                   const material = materials.find(m => m.id === tx.material_id);
                   const fromWh = warehouses.find(wh => wh.id === tx.from_warehouse_id);
                   const toWh = warehouses.find(wh => wh.id === tx.to_warehouse_id);
                   return (
                     <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm text-slate-600">
                         {new Date(tx.performed_at).toLocaleString("tr-TR")}
                       </td>
                       <td className="px-6 py-4">
                         <div className="font-medium text-slate-900">{material?.name || "Bilinmiyor"}</div>
                         <div className="text-xs text-slate-500 font-mono">{material?.sku || "-"}</div>
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-600">{fromWh?.name || "-"}</td>
                       <td className="px-6 py-4 text-sm text-slate-600">{toWh?.name || "-"}</td>
                       <td className="px-6 py-4 text-right font-bold text-slate-900">
                         {tx.quantity} {material?.unit || ""}
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                           tx.transaction_type === 'TRANSFER' ? 'bg-blue-100 text-blue-700' :
                           tx.transaction_type === 'IN' ? 'bg-green-100 text-green-700' :
                           tx.transaction_type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                         }`}>
                           {tx.transaction_type}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-sm font-mono text-slate-600">{tx.reference_no || "-"}</td>
                     </tr>
                   );
                 })}
                 {!txLoading && transactions.length === 0 && (
                   <tr>
                     <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">Henüz bir stok hareketi kaydedilmedi.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
         </div>
       )}


       {/* Transfer Modal */}
       {isTransferModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
             <div className="p-6 border-b flex items-center justify-between bg-slate-50">
               <h3 className="text-lg font-bold text-slate-900">Malzeme Transferi</h3>
               <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Malzeme</label>
                 <select 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={transferForm.material_id}
                   onChange={(e) => setTransferForm({...transferForm, material_id: e.target.value})}
                   required
                 >
                   <option value="">Seçiniz...</option>
                   {materials.map(m => <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>)}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">Kaynak Depo</label>
                   <select 
                     className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                     value={transferForm.from_warehouse_id}
                     onChange={(e) => setTransferForm({...transferForm, from_warehouse_id: e.target.value})}
                     required
                   >
                     <option value="">Seçiniz...</option>
                     {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">Hedef Depo</label>
                   <select 
                     className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                     value={transferForm.to_warehouse_id}
                     onChange={(e) => setTransferForm({...transferForm, to_warehouse_id: e.target.value})}
                     required
                   >
                     <option value="">Seçiniz...</option>
                     {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                   </select>
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Miktar</label>
                 <input 
                   type="number" 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={transferForm.quantity}
                   onChange={(e) => setTransferForm({...transferForm, quantity: parseInt(e.target.value)})}
                   required
                   min="1"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Referans / İrsaliye No</label>
                 <input 
                   type="text" 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={transferForm.reference_no}
                   onChange={(e) => setTransferForm({...transferForm, reference_no: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Notlar</label>
                 <textarea 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={transferForm.notes}
                   onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                 />
               </div>
               <button 
                 type="submit"
                 className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
               >
                 Transferi Tamamla
               </button>
             </form>
           </div>
         </div>
       )}

       {/* Add Material Modal */}
       {isMaterialModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
             <div className="p-6 border-b flex items-center justify-between bg-slate-50">
               <h3 className="text-lg font-bold text-slate-900">
                 {editingMaterial ? "Malzemeyi Düzenle" : "Yeni Malzeme Ekle"}
               </h3>
               <button onClick={() => {
                 setIsMaterialModalOpen(false);
                 setEditingMaterial(null);
               }} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleMaterialSubmit} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">SKU</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                     value={materialForm.sku}
                     onChange={(e) => setMaterialForm({...materialForm, sku: e.target.value})}
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">Birim</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                     value={materialForm.unit}
                     onChange={(e) => setMaterialForm({...materialForm, unit: e.target.value})}
                     required
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Malzeme Adı</label>
                 <input 
                   type="text" 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={materialForm.name}
                   onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                   required
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">Birim Maliyet (₺)</label>
                   <input 
                     type="number" 
                     step="0.01"
                     className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                     value={materialForm.unit_cost}
                     onChange={(e) => setMaterialForm({...materialForm, unit_cost: parseFloat(e.target.value)})}
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">Kritik Seviye</label>
                   <input 
                     type="number" 
                     className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                     value={materialForm.min_stock_level}
                     onChange={(e) => setMaterialForm({...materialForm, min_stock_level: parseInt(e.target.value)})}
                     required
                   />
                 </div>
               </div>
               
               {/* Initial Stock Section - Only for New Materials */}
               {!editingMaterial && (
                 <div className="pt-4 border-t mt-4 space-y-4">
                   <h4 className="text-sm font-bold text-slate-800">İlk Stok Girişi (Opsiyonel)</h4>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-slate-700">Depo</label>
                       <select 
                         className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                         value={materialForm.warehouse_id}
                         onChange={(e) => setMaterialForm({...materialForm, warehouse_id: e.target.value})}
                       >
                         <option value="">Seçiniz...</option>
                         {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                       </select>
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-slate-700">Miktar</label>
                       <input 
                         type="number" 
                         className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                         value={materialForm.initial_quantity}
                         onChange={(e) => setMaterialForm({...materialForm, initial_quantity: parseInt(e.target.value)})}
                         min="0"
                       />
                     </div>
                   </div>
                 </div>
               )}

               <button 
                 type="submit"
                 className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
               >
                 {editingMaterial ? "Değişiklikleri Kaydet" : "Malzemeyi Kaydet"}
               </button>
             </form>
           </div>
         </div>
       )}

       {/* Add Warehouse Modal */}
       {isWarehouseModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
             <div className="p-6 border-b flex items-center justify-between bg-slate-50">
               <h3 className="text-lg font-bold text-slate-900">
                 {editingWarehouse ? "Depoyu Düzenle" : "Yeni Depo Ekle"}
               </h3>
               <button onClick={() => {
                 setIsWarehouseModalOpen(false);
                 setEditingWarehouse(null);
               }} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleWarehouseSubmit} className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Depo Adı</label>
                 <input 
                   type="text" 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={warehouseForm.name}
                   onChange={(e) => setWarehouseForm({...warehouseForm, name: e.target.value})}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Depo Tipi</label>
                 <select 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={warehouseForm.type}
                   onChange={(e) => setWarehouseForm({...warehouseForm, type: e.target.value})}
                   required
                 >
                   <option value="site">Şantiye Deposu</option>
                   <option value="main">Merkez Depo</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Konum / Adres</label>
                 <textarea 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                   value={warehouseForm.location}
                   onChange={(e) => setWarehouseForm({...warehouseForm, location: e.target.value})}
                 />
               </div>
               <button 
                 type="submit"
                 className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
               >
                 {editingWarehouse ? "Değişiklikleri Kaydet" : "Depoyu Kaydet"}
               </button>
             </form>
           </div>
         </div>
       )}

    </div>
  );
}

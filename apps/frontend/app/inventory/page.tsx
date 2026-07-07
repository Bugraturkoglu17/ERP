"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import {
  Package,
  Warehouse as WarehouseIcon,
  ArrowRightLeft,
  Sliders,
  Activity,
  Calendar,
  AlertCircle,
  FolderDot
} from "lucide-react";
import { getTokenPayloadFromStorage, getRoles } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { DataState } from "@/components/common/data-state";
import { FilterBar } from "@/components/common/filter-bar";
import { SearchInput } from "@/components/common/search-input";
import { MaterialList } from "@/components/inventory/material-list";
import { WarehouseList } from "@/components/inventory/warehouse-list";
import { LowStockAlerts } from "@/components/inventory/low-stock-alerts";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "warehouses" | "transfers">("materials");
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & RBAC States
  const [roles, setRoles] = useState<string[]>([]);
  const [isSuper, setIsSuper] = useState(false); // platform_admin
  const [isAdmin, setIsAdmin] = useState(false); // platform_admin or admin

  // Search & Filter States
  const [materialSearch, setMaterialSearch] = useState("");
  const [warehouseSearch, setWarehouseSearch] = useState("");

  // Selected Warehouse State for Stock View
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState("");

  // Unified Stock Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    transaction_type: "TRANSFER" as "TRANSFER" | "IN" | "OUT" | "RETURN" | "ADJUSTMENT",
    material_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    quantity: 1,
    unit_cost: 0,
    reference_no: "",
    notes: "",
    related_project_id: "",
  });

  // Transactions Log State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilters, setTxFilters] = useState({
    material_id: "",
    warehouse_id: "",
    transaction_type: "",
  });

  // Add/Edit Material Modal State
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

  // Add/Edit Warehouse Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    type: "site" as "site" | "main",
    code: "",
    location: "",
    project_id: "",
  });

  // Load User Authentication and Roles
  useEffect(() => {
    try {
      const payload = getTokenPayloadFromStorage();
      const userRoles = getRoles(payload);
      setRoles(userRoles);
      
      const superUser = userRoles.includes("platform_admin");
      const adminUser = userRoles.includes("admin") || superUser;
      
      setIsSuper(superUser);
      setIsAdmin(adminUser);
    } catch (err) {
      console.error("Auth payload parsing error:", err);
    }
  }, []);

  // Fetch Core Data
  async function loadData() {
    setLoading(true);
    try {
      const [mats, whs, projs] = await Promise.all([
        apiGet("/inventory/materials").catch(() => []),
        apiGet("/inventory/warehouses").catch(() => []),
        apiGet("/projects").catch(() => []),
      ]);
      setMaterials(Array.isArray(mats) ? mats : []);
      setWarehouses(Array.isArray(whs) ? whs : []);
      setProjects(Array.isArray(projs) ? projs : []);
    } catch (err) {
      console.error("Inventory core data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Select Warehouse Handler
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

  // Fetch Transactions List
  const fetchTransactions = useCallback(async () => {
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
  }, [txFilters]);

  useEffect(() => {
    if (activeTab === "transfers") {
      fetchTransactions();
    }
  }, [activeTab, fetchTransactions]);

  // Handle Unified Stock Transaction Form Submit
  async function handleTxSubmit(e: React.FormEvent) {
    e.preventDefault();

    const type = txForm.transaction_type;
    const payload: any = {
      material_id: txForm.material_id,
      quantity: Number(txForm.quantity),
      reference_no: txForm.reference_no || null,
      notes: txForm.notes || null,
      unit_cost: txForm.unit_cost ? Number(txForm.unit_cost) : null,
      related_project_id: txForm.related_project_id || null,
    };

    if (type === "TRANSFER") {
      if (!txForm.from_warehouse_id || !txForm.to_warehouse_id) {
        alert("Transfer işlemi için kaynak ve hedef depolar seçilmelidir.");
        return;
      }
      if (txForm.from_warehouse_id === txForm.to_warehouse_id) {
        alert("Kaynak ve hedef depo aynı olamaz.");
        return;
      }
      payload.from_warehouse_id = txForm.from_warehouse_id;
      payload.to_warehouse_id = txForm.to_warehouse_id;
    } else if (type === "IN" || type === "RETURN") {
      if (!txForm.to_warehouse_id) {
        alert("Malzeme girişi/iadesi için hedef depo seçilmelidir.");
        return;
      }
      payload.transaction_type = type;
      payload.to_warehouse_id = txForm.to_warehouse_id;
    } else if (type === "OUT" || type === "ADJUSTMENT") {
      if (!txForm.from_warehouse_id) {
        alert("Malzeme çıkışı/düzeltmesi için kaynak depo seçilmelidir.");
        return;
      }
      payload.transaction_type = type;
      payload.from_warehouse_id = txForm.from_warehouse_id;
    }

    try {
      if (type === "TRANSFER") {
        await apiPost("/inventory/transfer", payload);
      } else {
        await apiPost("/inventory/transactions", payload);
      }
      alert("Stok hareketi başarıyla kaydedildi.");
      setIsTxModalOpen(false);
      
      setTxForm({
        transaction_type: "TRANSFER",
        material_id: "",
        from_warehouse_id: "",
        to_warehouse_id: "",
        quantity: 1,
        unit_cost: 0,
        reference_no: "",
        notes: "",
        related_project_id: "",
      });

      loadData();
      if (selectedWarehouse) {
        handleSelectWarehouse(selectedWarehouse);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Stok hareketi işlemi başarısız oldu.");
    }
  }

  // Material Catalogs Crud
  function handleEditMaterial(m: any) {
    if (!isSuper) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
    setEditingMaterial(m);
    setMaterialForm({
      sku: m.sku,
      name: m.name,
      unit: m.unit,
      unit_cost: m.unit_cost || 0,
      min_stock_level: m.min_stock_level || 0,
      warehouse_id: "",
      initial_quantity: 0,
    });
    setIsMaterialModalOpen(true);
  }

  async function handleMaterialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSuper) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
    try {
      const payload: any = {
        sku: materialForm.sku,
        name: materialForm.name,
        unit: materialForm.unit,
        unit_cost: Number(materialForm.unit_cost),
        min_stock_level: Number(materialForm.min_stock_level),
      };

      if (editingMaterial) {
        await apiPatch(`/inventory/materials/${editingMaterial.id}`, payload);
        alert("Malzeme başarıyla güncellendi.");
      } else {
        if (materialForm.warehouse_id && materialForm.initial_quantity > 0) {
          payload.warehouse_id = materialForm.warehouse_id;
          payload.initial_quantity = Number(materialForm.initial_quantity);
        }
        await apiPost("/inventory/materials", payload);
        alert("Malzeme başarıyla eklendi.");
      }
      setIsMaterialModalOpen(false);
      setEditingMaterial(null);
      setMaterialForm({ sku: "", name: "", unit: "Adet", unit_cost: 0, min_stock_level: 0, warehouse_id: "", initial_quantity: 0 });
      
      const mats = await apiGet("/inventory/materials");
      setMaterials(Array.isArray(mats) ? mats : []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Malzeme kaydı sırasında hata oluştu.");
    }
  }

  async function handleDeleteMaterial(id: string) {
    if (!isSuper) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
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

  // Warehouse CRUD
  function handleEditWarehouse(wh: any) {
    if (!isAdmin) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
    setEditingWarehouse(wh);
    setWarehouseForm({
      name: wh.name,
      type: wh.type as "site" | "main",
      code: wh.code || "",
      location: wh.location || "",
      project_id: wh.project_id || "",
    });
    setIsWarehouseModalOpen(true);
  }

  async function handleWarehouseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }

    const isSite = warehouseForm.type === "site";
    
    if (isSite && !warehouseForm.project_id) {
      alert("Şantiye depoları için ilişkili bir proje seçmek zorunludur.");
      return;
    }

    const payload: any = {
      name: warehouseForm.name,
      type: warehouseForm.type,
      code: warehouseForm.code || null,
      location: warehouseForm.location || null,
      project_id: isSite ? warehouseForm.project_id : null,
    };

    try {
      if (editingWarehouse) {
        await apiPatch(`/inventory/warehouses/${editingWarehouse.id}`, payload);
        alert("Depo başarıyla güncellendi.");
      } else {
        await apiPost("/inventory/warehouses", payload);
        alert("Depo başarıyla eklendi.");
      }
      setIsWarehouseModalOpen(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: "", type: "site", code: "", location: "", project_id: "" });
      
      const whs = await apiGet("/inventory/warehouses");
      setWarehouses(Array.isArray(whs) ? whs : []);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Depo kaydı sırasında hata oluştu.");
    }
  }

  async function handleDeleteWarehouse(id: string) {
    if (!isAdmin) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
    if (!confirm("Bu depoyu silmek istediğinize emin misiniz?")) return;
    try {
      await apiDelete(`/inventory/warehouses/${id}`);
      alert("Depo başarıyla silindi.");
      const whs = await apiGet("/inventory/warehouses");
      setWarehouses(Array.isArray(whs) ? whs : []);
      if (selectedWarehouse?.id === id) {
        setSelectedWarehouse(null);
        setWarehouseStock([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Silme işlemi başarısız oldu.");
    }
  }

  // Filter lists
  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    m.sku.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const filteredWarehouses = warehouses.filter(wh =>
    wh.name.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
    (wh.location && wh.location.toLowerCase().includes(warehouseSearch.toLowerCase()))
  );

  const filteredStock = warehouseStock.filter(stockItem =>
    stockItem.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    stockItem.sku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 bg-slate-50 min-h-screen rounded-2xl">
      {/* Corporate Page Header */}
      <PageHeader
        title="Golabs ERP Stok Portalı"
        description="Merkez depoları, dinamik şantiye envanterlerini ve stok hareketlerini gerçek zamanlı takip edin."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" /> Stok Hareketi Ekle
            </Button>

            {activeTab === "materials" && isSuper && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingMaterial(null);
                  setMaterialForm({ sku: "", name: "", unit: "Adet", unit_cost: 0, min_stock_level: 0, warehouse_id: "", initial_quantity: 0 });
                  setIsMaterialModalOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" /> Malzeme Tanımla
              </Button>
            )}

            {activeTab === "warehouses" && isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingWarehouse(null);
                  setWarehouseForm({ name: "", type: "site", code: "", location: "", project_id: "" });
                  setIsWarehouseModalOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <WarehouseIcon className="w-4 h-4" /> Depo Ekle
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
        <FilterBar
          options={[
            { value: "materials", label: "Malzeme Kataloğu" },
            { value: "warehouses", label: "Depolar & Stok Durumu" },
            { value: "transfers", label: "Stok Hareketi Geçmişi" },
          ]}
          selectedValue={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />

        {/* Global Statistics */}
        <div className="hidden lg:flex items-center gap-6 px-4 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Katalog: <strong className="text-slate-900 font-extrabold">{materials.length}</strong> Malzeme
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Toplam: <strong className="text-slate-900 font-extrabold">{warehouses.length}</strong> Depo
          </div>
        </div>
      </div>

      <DataState loading={loading} error={null} isEmpty={false}>
        {/* TAB 1: Materials Catalog */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                <SearchInput
                  value={materialSearch}
                  onChange={setMaterialSearch}
                  placeholder="SKU veya malzeme adı ara..."
                  className="w-full md:w-80"
                />
                {!isSuper && (
                  <Badge variant="warning" className="ml-auto flex items-center gap-2 p-2">
                    Malzeme ekleme, silme ve fiyat düzenleme yetkisi yalnızca Platform Yöneticisine aittir.
                  </Badge>
                )}
              </CardContent>
            </Card>

            <MaterialList
              materials={filteredMaterials}
              isSuper={isSuper}
              onEdit={handleEditMaterial}
              onDelete={handleDeleteMaterial}
            />
          </div>
        )}

        {/* TAB 2: Warehouses & Stocks */}
        {activeTab === "warehouses" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left: Warehouse List */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <WarehouseIcon className="w-4 h-4 text-indigo-500" /> Depolar
                    </h3>
                    <SearchInput
                      value={warehouseSearch}
                      onChange={setWarehouseSearch}
                      placeholder="Depo adı veya şehir ara..."
                    />
                  </CardContent>
                </Card>

                <WarehouseList
                  warehouses={filteredWarehouses}
                  selectedWarehouse={selectedWarehouse}
                  onSelectWarehouse={handleSelectWarehouse}
                  projects={projects}
                  isAdmin={isAdmin}
                  onEdit={handleEditWarehouse}
                  onDelete={handleDeleteWarehouse}
                />
              </div>

              {/* Right: Stocks in Selected Warehouse */}
              <div className="lg:col-span-2 space-y-4">
                {selectedWarehouse ? (
                  <>
                    <LowStockAlerts stockItems={warehouseStock} />

                    <Card>
                      <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-sm">{selectedWarehouse.name}</h3>
                          <p className="text-[11px] text-slate-500 font-medium mt-1">Bu deponun anlık malzeme stok seviyeleri</p>
                        </div>
                        
                        <SearchInput
                          value={stockSearch}
                          onChange={setStockSearch}
                          placeholder="Mevcut stoklarda ara..."
                          className="w-full sm:w-64"
                        />
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Malzeme Tanımı</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Mevcut Miktar</TableHead>
                            <TableHead className="text-center">Stok Durumu</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStock.map((item) => {
                            const isLow = item.quantity <= (item.min_stock_level || 0);
                            return (
                              <TableRow key={item.material_id}>
                                <TableCell className="font-bold text-slate-855 text-sm">{item.name}</TableCell>
                                <TableCell className="font-mono text-xs text-indigo-700 font-semibold">{item.sku}</TableCell>
                                <TableCell className="text-right font-black text-slate-900 text-sm">
                                  {item.quantity.toLocaleString("tr-TR")}{" "}
                                  <span className="text-slate-400 text-xs ml-1 font-bold">{item.unit}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={isLow ? "danger" : "success"}>
                                    {isLow ? "Kritik Limit" : "Güvenli Seviye"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          
                          {filteredStock.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-slate-400 italic py-12">
                                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                Bu depoda envanter kaydı veya aranan kriterlerde stok bulunmuyor.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Card>
                  </>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300/80 text-slate-455 p-12 text-center">
                    <WarehouseIcon className="w-10 h-10 mb-4 text-slate-300" />
                    <h4 className="font-bold text-slate-700 text-sm">Depo Seçimi Yapılmadı</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-2">
                      Stok detaylarını, kritik limit uyarılarını ve depo ayrıntılarını incelemek için sol panelden bir depo seçiniz.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Transactions Log */}
        {activeTab === "transfers" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" /> Detaylı Filtreleme Seçenekleri
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Malzeme Kataloğu</label>
                    <Select
                      options={[
                        { value: "", label: "Tümü" },
                        ...materials.map(m => ({ value: m.id, label: `${m.sku} - ${m.name}` }))
                      ]}
                      value={txFilters.material_id}
                      onChange={(e) => setTxFilters({ ...txFilters, material_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Depo Odaklı</label>
                    <Select
                      options={[
                        { value: "", label: "Tümü" },
                        ...warehouses.map(wh => ({ value: wh.id, label: wh.name }))
                      ]}
                      value={txFilters.warehouse_id}
                      onChange={(e) => setTxFilters({ ...txFilters, warehouse_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">İşlem Hareketi Tipi</label>
                    <Select
                      options={[
                        { value: "", label: "Tümü" },
                        { value: "TRANSFER", label: "Depolar Arası Transfer" },
                        { value: "IN", label: "Giriş (IN) - Satın Alma/Tedarik" },
                        { value: "OUT", label: "Çıkış (OUT) - Tüketim/Sarf" },
                        { value: "RETURN", label: "Şantiyeden İade (RETURN)" },
                        { value: "ADJUSTMENT", label: "Sayım Düzeltmesi (ADJUSTMENT)" }
                      ]}
                      value={txFilters.transaction_type}
                      onChange={(e) => setTxFilters({ ...txFilters, transaction_type: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih / Saat</TableHead>
                    <TableHead>Malzeme</TableHead>
                    <TableHead>İşlem Yönü (Rota)</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>İşlem Tipi</TableHead>
                    <TableHead className="text-right">Maliyet (Birim/Top)</TableHead>
                    <TableHead>Ref / İrsaliye</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-12">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Hareket geçmişi yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => {
                      const material = materials.find(m => m.id === tx.material_id);
                      const fromWh = warehouses.find(wh => wh.id === tx.from_warehouse_id);
                      const toWh = warehouses.find(wh => wh.id === tx.to_warehouse_id);
                      
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs font-bold text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(tx.performed_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-800 text-sm">{material?.name || "Bilinmeyen Malzeme"}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-semibold">{material?.sku || "-"}</div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{fromWh?.name || "Dış Kaynak"}</Badge>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <Badge variant="info">{toWh?.name || "Sarfiyat / İade"}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <strong className="text-slate-900 text-sm font-black">{tx.quantity}</strong>
                            <span className="text-slate-455 text-xs ml-1 font-bold">{material?.unit || ""}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.transaction_type === "TRANSFER" ? "info" :
                                tx.transaction_type === "IN" ? "success" :
                                tx.transaction_type === "OUT" ? "danger" :
                                tx.transaction_type === "RETURN" ? "warning" : "secondary"
                              }
                            >
                              {tx.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.unit_cost ? (
                              <div>
                                <div className="text-xs font-bold text-slate-900">
                                  ₺{Number(tx.unit_cost).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
                                  Top: ₺{Number(tx.total_cost || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-slate-600">
                            {tx.reference_no || "Girilmeyen"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  
                  {!txLoading && transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 italic py-12">
                        <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        Seçilen filtrelere göre kaydedilmiş stok hareketi geçmişi bulunmamaktadır.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </DataState>

      {/* MODAL 1: Unified Stock Transaction Wizard */}
      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="Yeni Stok Hareketi Sihirbazı">
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">İşlem Hareketi Tipi</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { id: "TRANSFER", label: "Depolar Arası Transfer" },
                { id: "IN", label: "Tedarik / Giriş" },
                { id: "OUT", label: "Sarfiyat / Çıkış" },
                { id: "RETURN", label: "Depoya İade" },
                { id: "ADJUSTMENT", label: "Sayım Düzeltmesi" }
              ].map(t => (
                <Button
                  key={t.id}
                  type="button"
                  variant={txForm.transaction_type === t.id ? "primary" : "outline"}
                  onClick={() => setTxForm({
                    ...txForm, 
                    transaction_type: t.id as any,
                    from_warehouse_id: t.id === "IN" || t.id === "RETURN" ? "" : txForm.from_warehouse_id,
                    to_warehouse_id: t.id === "OUT" || t.id === "ADJUSTMENT" ? "" : txForm.to_warehouse_id,
                  })}
                  className="w-full text-[11px] py-2 px-1"
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Harekete Konu Malzeme</label>
            <Select
              options={[
                { value: "", label: "Malzeme seçiniz..." },
                ...materials.map(m => ({ value: m.id, label: `[${m.sku}] ${m.name} - Birim: ${m.unit}` }))
              ]}
              value={txForm.material_id}
              onChange={(e) => setTxForm({ ...txForm, material_id: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(txForm.transaction_type === "TRANSFER" || txForm.transaction_type === "OUT" || txForm.transaction_type === "ADJUSTMENT") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kaynak Depo</label>
                <Select
                  options={[
                    { value: "", label: "Seçiniz..." },
                    ...warehouses.map(wh => ({ value: wh.id, label: wh.name }))
                  ]}
                  value={txForm.from_warehouse_id}
                  onChange={(e) => setTxForm({ ...txForm, from_warehouse_id: e.target.value })}
                  required
                />
              </div>
            )}

            {(txForm.transaction_type === "TRANSFER" || txForm.transaction_type === "IN" || txForm.transaction_type === "RETURN") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Hedef Depo</label>
                <Select
                  options={[
                    { value: "", label: "Seçiniz..." },
                    ...warehouses.map(wh => ({ value: wh.id, label: wh.name }))
                  ]}
                  value={txForm.to_warehouse_id}
                  onChange={(e) => setTxForm({ ...txForm, to_warehouse_id: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="İşlem Miktarı"
              type="number"
              value={txForm.quantity}
              onChange={(e) => setTxForm({ ...txForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              required
              min="1"
            />
            <Input
              label="Birim Maliyet (₺ - Opsiyonel)"
              type="number"
              step="0.01"
              value={txForm.unit_cost}
              onChange={(e) => setTxForm({ ...txForm, unit_cost: Math.max(0, parseFloat(e.target.value) || 0) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="İrsaliye / Fiş Referans No"
              type="text"
              placeholder="İrs-90342 vb."
              value={txForm.reference_no}
              onChange={(e) => setTxForm({ ...txForm, reference_no: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">İlişkili Proje (Bütçe/Maliyet)</label>
              <Select
                options={[
                  { value: "", label: "Proje yok (Genel Gider)" },
                  ...projects.map(p => ({ value: p.id, label: p.name }))
                ]}
                value={txForm.related_project_id}
                onChange={(e) => setTxForm({ ...txForm, related_project_id: e.target.value })}
              />
            </div>
          </div>

          <Textarea
            label="Harekete Dair Açıklamalar"
            rows={2}
            placeholder="Lojistik aracı plakası, teslim alan personel detayları..."
            value={txForm.notes}
            onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
          />

          <Button type="submit" variant="primary" className="w-full py-3.5 uppercase tracking-wider mt-4">
            Hareketi Kaydet ve Stokları Güncelle
          </Button>
        </form>
      </Modal>

      {/* MODAL 2: Add / Edit Material */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setEditingMaterial(null);
        }}
        title={editingMaterial ? "Malzeme Tanımını Düzenle" : "Malzeme Kataloğuna Ekle"}
      >
        <form onSubmit={handleMaterialSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU / Katalog Kodu"
              type="text"
              placeholder="MLZ-839"
              value={materialForm.sku}
              onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })}
              required
            />
            <Input
              label="Takip Birimi"
              type="text"
              placeholder="Adet, Metre, Kg"
              value={materialForm.unit}
              onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
              required
            />
          </div>

          <Input
            label="Malzeme Tanımı (Adı)"
            type="text"
            placeholder="DN100 Deprem Kompansatörü"
            value={materialForm.name}
            onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Birim Maliyet (₺)"
              type="number"
              step="0.01"
              value={materialForm.unit_cost}
              onChange={(e) => setMaterialForm({ ...materialForm, unit_cost: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Min. Kritik Seviye"
              type="number"
              value={materialForm.min_stock_level}
              onChange={(e) => setMaterialForm({ ...materialForm, min_stock_level: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          
          {!editingMaterial && (
            <div className="pt-4 border-t mt-4 space-y-3">
              <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                Opsiyonel İlk Stok Girişi
              </h4>
              <p className="text-[9px] text-slate-400 leading-tight">Bu malzeme kaydedilirken ilk envanter miktarını doğrudan tanımlayabilirsiniz.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">Giriş Yapılacak Depo</label>
                  <Select
                    options={[
                      { value: "", label: "Seçilmedi" },
                      ...warehouses.map(wh => ({ value: wh.id, label: wh.name }))
                    ]}
                    value={materialForm.warehouse_id}
                    onChange={(e) => setMaterialForm({ ...materialForm, warehouse_id: e.target.value })}
                  />
                </div>
                <Input
                  label="Giriş Miktarı"
                  type="number"
                  value={materialForm.initial_quantity}
                  onChange={(e) => setMaterialForm({ ...materialForm, initial_quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                  min="0"
                />
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full py-3.5 uppercase tracking-wider mt-4">
            {editingMaterial ? "Kataloğu Güncelle" : "Malzemeyi Kaydet"}
          </Button>
        </form>
      </Modal>

      {/* MODAL 3: Add / Edit Warehouse */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => {
          setIsWarehouseModalOpen(false);
          setEditingWarehouse(null);
        }}
        title={editingWarehouse ? "Depo Kartını Düzenle" : "Yeni Depo Kaydet"}
      >
        <form onSubmit={handleWarehouseSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Depo Tipi</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {[
                { id: "site", label: "Şantiye Deposu" },
                { id: "main", label: "Merkez Depo" }
              ].map(t => (
                <Button
                  key={t.id}
                  type="button"
                  variant={warehouseForm.type === t.id ? "primary" : "outline"}
                  onClick={() => setWarehouseForm({
                    ...warehouseForm, 
                    type: t.id as any,
                    project_id: t.id === "main" ? "" : warehouseForm.project_id
                  })}
                  className="flex-1 text-xs py-2"
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Depo Adı"
              type="text"
              placeholder="Örn: Tuzla Merkez Depo"
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              required
            />
            <Input
              label="Depo Takip Kodu"
              type="text"
              placeholder="Örn: DEP-M1"
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
            />
          </div>

          {warehouseForm.type === "site" && (
            <div className="space-y-1.5 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
              <label className="text-[10px] font-black text-indigo-955 uppercase tracking-wider flex items-center gap-1">
                <FolderDot className="w-3.5 h-3.5 text-indigo-500" /> İlişkili Proje / Şantiye
              </label>
              <Select
                options={[
                  { value: "", label: "İlişkili proje seçiniz..." },
                  ...projects.map(p => ({ value: p.id, label: p.name }))
                ]}
                value={warehouseForm.project_id}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, project_id: e.target.value })}
                required={warehouseForm.type === "site"}
              />
            </div>
          )}

          <Textarea
            label="Fiziksel Konum / Adres"
            rows={2}
            placeholder="Mahalle, cadde veya şantiye alanı adresi..."
            value={warehouseForm.location}
            onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
          />

          <Button type="submit" variant="primary" className="w-full py-3.5 uppercase tracking-wider mt-4">
            {editingWarehouse ? "Depo Kartını Güncelle" : "Depoyu Kaydet"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

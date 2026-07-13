"use client";

import { useState, useEffect, useMemo } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { 
  Users, 
  Plus, 
  Shield, 
  Mail, 
  Phone, 
  BookOpen, 
  UserCheck, 
  UserX,
  X,
  Search,
  CheckCircle2,
  Trash2,
  Edit3,
  Fingerprint,
  Calendar,
  Layers,
  Info,
  Clock,
  Briefcase
} from "lucide-react";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "admin" | "engineer" | "warehouse" | "client" | "inactive">("all");
  const [currentUserId, setCurrentUserId] = useState("");

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "saha_muhendisi",
    discipline: "seismic", // seismic, hvac, fire, mep, none
    discipline_only: false
  });

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    email: "",
    full_name: "",
    phone: "",
    role: "saha_muhendisi",
    discipline: "seismic",
    discipline_only: false,
    is_active: true
  });

  // Selected User for Details Drawer
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [usersData, payload] = await Promise.all([
          apiGet<any[]>("/auth/users").catch(() => []),
          getTokenPayloadFromStorage()
        ]);
        setUsers(Array.isArray(usersData) ? usersData : []);
        if (payload && payload.sub) {
          setCurrentUserId(payload.sub);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function loadUsers() {
    try {
      const data = await apiGet<any[]>("/auth/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Users reload error:", err);
    }
  }

  // Dynamic Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.is_active && ((u.default_role || "").includes("admin") || (u.default_role || "").includes("yönetici"))).length;
    const engineers = users.filter(u => u.is_active && (u.default_role || "").includes("muhendisi")).length;
    const warehouse = users.filter(u => u.is_active && (u.default_role || "").includes("depo")).length;
    const inactive = users.filter(u => !u.is_active).length;
    return { total, admins, engineers, warehouse, inactive };
  }, [users]);

  // Create Submit Handler
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        email: createForm.email,
        password: createForm.password,
        full_name: createForm.full_name,
        phone: createForm.phone || null,
        roles: [createForm.role],
        discipline: createForm.discipline !== "none" ? createForm.discipline : null,
        discipline_only: createForm.discipline_only
      };

      await apiPost("/auth/users", payload);
      alert("Kullanıcı başarıyla oluşturuldu.");
      setIsCreateModalOpen(false);
      setCreateForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "saha_muhendisi",
        discipline: "seismic",
        discipline_only: false
      });
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kullanıcı oluşturulamadı.");
    }
  }

  // Edit Button click handler
  const openEditModal = (user: any) => {
    setEditForm({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.default_role || "saha_muhendisi",
      discipline: user.discipline || "none",
      discipline_only: user.discipline_only || false,
      is_active: user.is_active
    });
    setIsEditModalOpen(true);
  };

  // Edit Submit Handler
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        roles: [editForm.role],
        discipline: editForm.discipline !== "none" ? editForm.discipline : null,
        discipline_only: editForm.discipline_only,
        is_active: editForm.is_active
      };

      await apiPatch(`/auth/users/${editForm.id}`, payload);
      alert("Kullanıcı bilgileri başarıyla güncellendi.");
      setIsEditModalOpen(false);
      await loadUsers();
      
      if (selectedUserForDrawer && selectedUserForDrawer.id === editForm.id) {
        setSelectedUserForDrawer({ 
          ...selectedUserForDrawer, 
          ...payload, 
          default_role: editForm.role 
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kullanıcı güncellenemedi.");
    }
  }

  // Active / Passive status toggle
  async function handleToggleActive(userId: string, currentStatus: boolean, email: string) {
    if (userId === currentUserId && currentStatus) {
      alert("Kendi yöneticisi hesabınızı pasifleştiremezsiniz.");
      return;
    }
    try {
      await apiPatch(`/auth/users/${userId}`, { is_active: !currentStatus });
      alert("Kullanıcı durumu güncellendi.");
      await loadUsers();
      if (selectedUserForDrawer && selectedUserForDrawer.id === userId) {
        setSelectedUserForDrawer({ ...selectedUserForDrawer, is_active: !currentStatus });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Durum güncellenemedi.");
    }
  }

  // Delete User handler
  async function handleDeleteUser(userId: string, userName: string, email: string) {
    if (userId === currentUserId) {
      alert("Kendi yöneticisi hesabınızı silemezsiniz.");
      return;
    }
    if (!confirm(`"${userName}" isimli personeli sistemden kaldırmak (pasife almak) istediğinize emin misiniz?`)) return;
    try {
      await apiDelete(`/auth/users/${userId}`);
      alert("Personel hesabı sistemden kaldırıldı.");
      await loadUsers();
      if (selectedUserForDrawer && selectedUserForDrawer.id === userId) {
        setSelectedUserForDrawer(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kullanıcı silinemedi.");
    }
  }

  const getRoleInfo = (roleKey: string) => {
    const key = (roleKey || "").toLowerCase();
    if (key.includes("admin") || key.includes("yönetici")) {
      return { label: "Sistem Yöneticisi", color: "text-rose-700 border-rose-200", bg: "bg-rose-50/50" };
    }
    if (key.includes("depo") || key.includes("stok")) {
      return { label: "Depo Sorumlusu", color: "text-amber-700 border-amber-200", bg: "bg-amber-50/50" };
    }
    if (key.includes("musteri") || key.includes("müşteri") || key.includes("client")) {
      return { label: "Müşteri Temsilcisi", color: "text-emerald-700 border-emerald-200", bg: "bg-emerald-50/50" };
    }
    return { label: "Saha Mühendisi", color: "text-blue-700 border-blue-200", bg: "bg-blue-50/50" };
  };

  const DISCIPLINE_LABELS: Record<string, string> = {
    seismic: "Sismik Koruma",
    hvac: "Havalandırma (HVAC)",
    fire: "Yangın Tesisatı",
    mep: "MEP Koordinasyonu"
  };

  // Directory real-time filter logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.includes(searchQuery));
      
    if (!matchesSearch) return false;
    
    const roleKey = (user.default_role || "").toLowerCase();
    if (activeTabFilter === "admin") {
      return roleKey.includes("admin") || roleKey.includes("yönetici");
    }
    if (activeTabFilter === "engineer") {
      return roleKey.includes("muhendisi");
    }
    if (activeTabFilter === "warehouse") {
      return roleKey.includes("depo");
    }
    if (activeTabFilter === "client") {
      return roleKey.includes("musteri") || roleKey.includes("müşteri") || roleKey.includes("client");
    }
    if (activeTabFilter === "inactive") {
      return !user.is_active;
    }
    
    return true; // "all"
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] flex-col gap-3 animate-pulse">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold text-sm">Yetki ve Personel listesi yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto relative">
      
      {/* Header and Quick Actions */}
      <div className="corp-header">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              Rol ve Yetki (RBAC) Yönetimi <span className="rounded-md bg-white/10 border border-white/20 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white uppercase">Personel</span>
            </h2>
            <p className="text-slate-300 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ERP ekosistemindeki kullanıcıların rollerini, uzmanlık disiplinlerini (Sismik, HVAC, Yangın) ve sistem erişim durumlarını merkezi olarak denetleyin ve güncelleyin.
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="corp-btn-primary self-start md:self-center"
          >
            <Plus className="w-4 h-4" /> Yeni Personel Ekle
          </button>
        </div>
      </div>

      {/* Dynamic Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="corp-card p-4">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Toplam Personel</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{stats.total}</span>
            <span className="text-xs text-slate-400 font-semibold">Kayıtlı</span>
          </div>
        </div>
        <div className="corp-card p-4">
          <p className="text-xs font-extrabold text-rose-500 uppercase tracking-wider">Yöneticiler</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600">{stats.admins}</span>
            <span className="text-xs text-rose-400 font-semibold">Aktif</span>
          </div>
        </div>
        <div className="corp-card p-4">
          <p className="text-xs font-extrabold text-blue-550 uppercase tracking-wider">Mühendisler</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600">{stats.engineers}</span>
            <span className="text-xs text-blue-400 font-semibold">Aktif</span>
          </div>
        </div>
        <div className="corp-card p-4">
          <p className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Depo Sorumluları</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{stats.warehouse}</span>
            <span className="text-xs text-amber-400/85 font-semibold">Aktif</span>
          </div>
        </div>
        <div className="corp-card p-4 col-span-2 md:col-span-1">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pasif Hesaplar</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-500">{stats.inactive}</span>
            <span className="text-xs text-slate-400 font-semibold">Askıda</span>
          </div>
        </div>
      </div>

      {/* Main Directory Workspace */}
      <div className="corp-card">
        
        {/* Navigation Tabs and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Filtering Tabs */}
          <div className="flex overflow-x-auto gap-1 pb-1 lg:pb-0 scrollbar-none">
            <button 
              onClick={() => setActiveTabFilter("all")}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${activeTabFilter === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Tüm Personeller
            </button>
            <button 
              onClick={() => setActiveTabFilter("admin")}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${activeTabFilter === "admin" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Yöneticiler
            </button>
            <button 
              onClick={() => setActiveTabFilter("engineer")}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${activeTabFilter === "engineer" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Mühendisler
            </button>
            <button 
              onClick={() => setActiveTabFilter("warehouse")}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${activeTabFilter === "warehouse" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Depo Sorumluları
            </button>
            <button 
              onClick={() => setActiveTabFilter("client")}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${activeTabFilter === "client" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Müşteri Temsilcileri
            </button>
            <button 
              onClick={() => setActiveTabFilter("inactive")}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${activeTabFilter === "inactive" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Pasifler
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md w-full self-stretch lg:self-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ad, e-posta veya telefon ara..." 
              className="corp-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Directory Grid View */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm font-semibold border-t border-slate-100 bg-slate-50/10">
            Arama kriterlerine veya filtreye uygun personel bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6 bg-slate-50/10">
            {filteredUsers.map((user) => {
              const roleInfo = getRoleInfo(user.default_role);
              const isSelf = user.id === currentUserId;
              return (
                <div 
                  key={user.id} 
                  className={`corp-card p-5 relative flex flex-col justify-between gap-4 border ${user.is_active ? "border-slate-200" : "border-slate-300 bg-slate-100/50"}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => setSelectedUserForDrawer(user)}
                        className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                        title="Detayları görüntülemek için tıklayın"
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm border border-slate-200">
                          {user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                            {user.full_name}
                            {isSelf && <span className="rounded-full bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 text-[9px] font-bold">Ben</span>}
                          </h4>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider mt-1 ${roleInfo.color} ${roleInfo.bg}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all bg-white"
                          title="Bilgileri Düzenle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active, user.email)}
                          disabled={isSelf}
                          className={`p-2 rounded-lg border transition-all ${
                            user.is_active 
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 disabled:opacity-50" 
                              : "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                          }`}
                          title={user.is_active ? "Hesabı askıya al (dondur)" : "Hesabı aktifleştir"}
                        >
                          {user.is_active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.full_name, user.email)}
                          disabled={isSelf}
                          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-755 hover:bg-rose-50 hover:border-rose-200 transition-all bg-white disabled:opacity-40"
                          title="Personeli Kalıcı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-650 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span>Disiplin Kısıtı: {user.discipline_only ? "Sadece Uzmanlık Alanı" : "Genel Yetki"}</span>
                      </div>
                    </div>
                  </div>

                  {user.discipline ? (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider">Uzmanlık Alanı</span>
                      <span className="text-xs font-bold text-slate-700">{DISCIPLINE_LABELS[user.discipline] || user.discipline}</span>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200 flex items-center justify-between text-slate-400 text-[10px] font-semibold">
                      <span>Herhangi bir uzmanlık disiplini atanmamış.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE USER MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">Sisteme Personel Ekle</h3>
                <p className="text-xs text-slate-500 mt-0.5">FastAPI RBAC & yetkilendirmeli yeni hesap</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Ad Soyad *</label>
                <input 
                  type="text" 
                  placeholder="Ahmet Yılmaz"
                  className="corp-input"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({...createForm, full_name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">E-posta *</label>
                  <input 
                    type="email" 
                    placeholder="ahmet@firma.com"
                    className="corp-input"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Şifre *</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="corp-input"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Telefon</label>
                  <input 
                    type="text" 
                    placeholder="0555..."
                    className="corp-input font-mono"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Varsayılan Rol *</label>
                  <select 
                    className="corp-select"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                    required
                  >
                    <option value="saha_muhendisi">Saha Mühendisi</option>
                    <option value="depo_sorumlusu">Depo Sorumlusu</option>
                    <option value="musteri_kullanici">Müşteri Temsilcisi</option>
                    <option value="admin">Yönetici (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Uzmanlık / Disiplin Kısıtı</label>
                <select 
                  className="corp-select"
                  value={createForm.discipline}
                  onChange={(e) => setCreateForm({...createForm, discipline: e.target.value})}
                  required
                >
                  <option value="none">Genel / Tüm Disiplinler</option>
                  <option value="seismic">Sismik Koruma & Askılama</option>
                  <option value="hvac">HVAC Havalandırma</option>
                  <option value="fire">Yangın Söndürme Tesisatı</option>
                  <option value="mep">MEP Koordinasyonu</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input 
                  type="checkbox" 
                  id="discipline_only"
                  className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                  checked={createForm.discipline_only}
                  onChange={(e) => setCreateForm({...createForm, discipline_only: e.target.checked})}
                />
                <label htmlFor="discipline_only" className="text-xs font-bold text-slate-650 select-none cursor-pointer">
                  Sadece kendi disiplinindeki döküman / çizimleri görsün
                </label>
              </div>

              <button 
                type="submit"
                className="w-full mt-2 corp-btn-primary"
              >
                Personeli Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">Personel Bilgilerini Düzenle</h3>
                <p className="text-xs text-slate-550 mt-0.5">{editForm.email}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Ad Soyad *</label>
                <input 
                  type="text" 
                  className="corp-input"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Telefon</label>
                  <input 
                    type="text" 
                    className="corp-input font-mono"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Default Yetki Rolü *</label>
                  <select 
                    className="corp-select"
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    required
                  >
                    <option value="saha_muhendisi">Saha Mühendisi</option>
                    <option value="depo_sorumlusu">Depo Sorumlusu</option>
                    <option value="musteri_kullanici">Müşteri Temsilcisi</option>
                    <option value="admin">Yönetici (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Uzmanlık / Disiplin Kısıtı</label>
                <select 
                  className="corp-select"
                  value={editForm.discipline}
                  onChange={(e) => setEditForm({...editForm, discipline: e.target.value})}
                  required
                >
                  <option value="none">Genel / Tüm Disiplinler</option>
                  <option value="seismic">Sismik Koruma & Askılama</option>
                  <option value="hvac">HVAC Havalandırma</option>
                  <option value="fire">Yangın Söndürme Tesisatı</option>
                  <option value="mep">MEP Koordinasyonu</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input 
                  type="checkbox" 
                  id="edit_discipline_only"
                  className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                  checked={editForm.discipline_only}
                  onChange={(e) => setEditForm({...editForm, discipline_only: e.target.checked})}
                />
                <label htmlFor="edit_discipline_only" className="text-xs font-bold text-slate-650 select-none cursor-pointer">
                  Sadece kendi disiplinindeki döküman / çizimleri görsün
                </label>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input 
                  type="checkbox" 
                  id="edit_is_active"
                  className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                  disabled={editForm.id === currentUserId}
                />
                <label htmlFor="edit_is_active" className="text-xs font-bold text-slate-650 select-none cursor-pointer">
                  Hesap aktif ve sisteme giriş yapabilir durumda olsun
                </label>
              </div>

              <button 
                type="submit"
                className="w-full mt-2 corp-btn-primary"
              >
                Değişiklikleri Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE USER DETAILS SIDE DRAWER ── */}
      {selectedUserForDrawer && (
        <div className="fixed inset-0 z-40 bg-black/30 flex justify-end" onClick={() => setSelectedUserForDrawer(null)}>
          <div 
            className="w-full max-w-md bg-white h-full shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-700 text-lg border border-slate-200">
                    {selectedUserForDrawer.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{selectedUserForDrawer.full_name}</h3>
                    <p className="text-xs text-slate-500">{selectedUserForDrawer.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUserForDrawer(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Roles Badge & Section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Atanmış Sistem Rolleri</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-bold border uppercase tracking-wider ${getRoleInfo(selectedUserForDrawer.default_role).color} ${getRoleInfo(selectedUserForDrawer.default_role).bg}`}>
                    {getRoleInfo(selectedUserForDrawer.default_role).label}
                  </span>
                </div>
              </div>

              {/* Core Information Grid */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">İletişim & Güvenlik Bilgileri</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-slate-700 text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">{selectedUserForDrawer.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>{selectedUserForDrawer.phone || "Telefon belirtilmemiş"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <Fingerprint className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex justify-between items-center w-full">
                      <span>MFA / İki Faktörlü</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-250/60 uppercase tracking-wide">Aktif (Zorunlu)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex justify-between items-center w-full">
                      <span>Hesap Durumu</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${selectedUserForDrawer.is_active ? "text-emerald-700 bg-emerald-50 border-emerald-250/60" : "text-rose-700 bg-rose-50 border-rose-250/60"}`}>
                        {selectedUserForDrawer.is_active ? "Aktif" : "Pasif / Dondurulmuş"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialties and Access Controls */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Uzmanlık & Belge Kısıtlaması</h4>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">Çalışma Disiplini</span>
                    <span className="font-extrabold text-slate-700">
                      {DISCIPLINE_LABELS[selectedUserForDrawer.discipline] || "Genel (Tümü)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-bold text-slate-500 shrink-0">Disiplin Filtresi</span>
                    <p className="text-slate-650 text-right leading-relaxed font-semibold">
                      {selectedUserForDrawer.discipline_only 
                        ? "Sadece kendi atandığı uzmanlık alanındaki döküman, proje ve çizimleri görebilir." 
                        : "Sistem genelindeki tüm disiplin belgelerine ve projelere tam erişime sahiptir."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Projects List */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kullanıcının Atandığı Projeler</h4>
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-1.5">
                  <Briefcase className="h-5 w-5 text-slate-400 shrink-0" />
                  <span>Bu kullanıcıya atanmış aktif proje bulunmamaktadır.</span>
                  <p className="text-[10px] text-slate-400 font-medium">Projeler sayfasından yeni atamalar yapabilirsiniz.</p>
                </div>
              </div>
            </div>

            {/* Quick Actions at Bottom of Drawer */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  openEditModal(selectedUserForDrawer);
                }}
                className="flex-1 corp-btn-secondary py-3"
              >
                <Edit3 className="h-3.5 w-3.5 shrink-0" /> Profili Düzenle
              </button>
              <button 
                onClick={() => handleDeleteUser(selectedUserForDrawer.id, selectedUserForDrawer.full_name, selectedUserForDrawer.email)}
                disabled={selectedUserForDrawer.id === currentUserId}
                className="corp-btn-danger px-4 py-3 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5 text-white shrink-0" /> Sil (Arşivle)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

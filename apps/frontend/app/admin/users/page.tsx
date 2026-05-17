"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
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
  Trash2
} from "lucide-react";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const data = await apiGet("/auth/users");
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Users fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

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
      // Reload list
      const data = await apiGet("/auth/users");
      setUsers(data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kullanıcı oluşturulamadı.");
    }
  }

  async function handleToggleActive(userId: string, currentStatus: boolean) {
    try {
      await apiPatch(`/auth/users/${userId}`, { is_active: !currentStatus });
      alert("Kullanıcı durumu güncellendi.");
      const data = await apiGet("/auth/users");
      setUsers(data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Durum güncellenemedi.");
    }
  }

  const getRoleInfo = (roleKey: string) => {
    const key = (roleKey || "").toLowerCase();
    if (key.includes("admin") || key.includes("yönetici")) {
      return { label: "Sistem Yöneticisi", color: "text-rose-700 border-rose-200", bg: "bg-rose-50" };
    }
    if (key.includes("depo") || key.includes("stok")) {
      return { label: "Depo Sorumlusu", color: "text-amber-700 border-amber-200", bg: "bg-amber-50" };
    }
    if (key.includes("musteri") || key.includes("müşteri") || key.includes("client")) {
      return { label: "Müşteri Temsilcisi", color: "text-emerald-700 border-emerald-200", bg: "bg-emerald-50" };
    }
    return { label: "Saha Mühendisi", color: "text-blue-700 border-blue-200", bg: "bg-blue-50" };
  };

  const DISCIPLINE_LABELS: Record<string, string> = {
    seismic: "Sismik Koruma",
    hvac: "Havalandırma (HVAC)",
    fire: "Yangın Tesisatı",
    mep: "MEP Koordinasyonu"
  };

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Kullanıcı veritabanı yükleniyor...</p>
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
            <h2 className="text-3xl font-extrabold tracking-tight">Rol ve Yetki (RBAC) Yönetimi</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-xl">
              Disiplin bazlı (Sismik, HVAC, Yangın) veya hiyerarşik organizasyon yetkilerini merkezi olarak denetleyin.
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Yeni Personel Ekle
          </button>
        </div>
      </div>

      {/* Users directory workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Personel veya e-posta ara..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">Toplam {filteredUsers.length} aktif kullanıcı listelendi</span>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {filteredUsers.map((user) => {
            const roleInfo = getRoleInfo(user.default_role);
            return (
              <div key={user.id} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 relative flex flex-col justify-between gap-4 group">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{user.full_name}</h4>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider mt-1 ${roleInfo.color} ${roleInfo.bg}`}>
                          {roleInfo.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                        user.is_active 
                          ? "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100" 
                          : "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100"
                      }`}
                      title={user.is_active ? "Hesabı dondur" : "Hesabı aktifleştir"}
                    >
                      {user.is_active ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>Disiplin Kısıtı: {user.discipline_only ? "Sadece Atanan Alan" : "Genel Erişim"}</span>
                    </div>
                  </div>
                </div>

                {user.discipline && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Uzmanlık Alanı</span>
                    <span className="text-xs font-bold text-slate-700">{DISCIPLINE_LABELS[user.discipline] || user.discipline}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sisteme Personel Ekle</h3>
                <p className="text-xs text-slate-500 mt-0.5">FastAPI RBAC & Discipline tabanlı yeni hesap</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ad Soyad</label>
                <input 
                  type="text" 
                  placeholder="Ahmet Yılmaz"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({...createForm, full_name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">E-posta</label>
                  <input 
                    type="email" 
                    placeholder="ahmet@sismik.com"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Giriş Şifresi</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Telefon</label>
                  <input 
                    type="text" 
                    placeholder="0555..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Default Rol</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Uzmanlık / Disiplin Kısıtı</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
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

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="discipline_only"
                  className="rounded border-slate-300 focus:ring-blue-500 h-4 w-4 text-blue-600"
                  checked={createForm.discipline_only}
                  onChange={(e) => setCreateForm({...createForm, discipline_only: e.target.checked})}
                />
                <label htmlFor="discipline_only" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Sadece kendi disiplinindeki döküman / çizimleri görsün
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Personeli Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

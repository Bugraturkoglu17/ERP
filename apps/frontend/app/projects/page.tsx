"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { 
  FolderTree, 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Calendar,
  Layers,
  ChevronRight,
  UserPlus,
  Users,
  CheckCircle,
  Clock,
  Briefcase,
  TrendingUp,
  MapPin,
  Building2,
  Bookmark,
  Sparkles,
  X,
  FileCheck
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  inquiry: { label: "Keşif / Keşif Aşaması", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-100" },
  approved: { label: "Onaylandı / Başlayacak", color: "text-green-700", bg: "bg-green-50", border: "border-green-100" },
  in_progress: { label: "Sahada / Devam Ediyor", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
  invoice_pend: { label: "Hakediş Bekliyor", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
  completed: { label: "Tamamlandı / Teslim", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-100" },
  cancelled: { label: "İptal Edildi", color: "text-red-700", bg: "bg-red-50", border: "border-red-100" },
};

const SCOPE_TAGS: Record<string, { label: string; color: string; bg: string }> = {
  seismic: { label: "Sismik Koruma & Askılama", color: "text-amber-700 border-amber-200", bg: "bg-amber-50" },
  hvac: { label: "Mekanik Havalandırma (HVAC)", color: "text-blue-700 border-blue-200", bg: "bg-blue-50" },
  fire: { label: "Sulu/Gazlı Söndürme Sistemleri", color: "text-rose-700 border-rose-200", bg: "bg-rose-50" },
  mep: { label: "MEP Koordinasyon Çizimleri", color: "text-indigo-700 border-indigo-200", bg: "bg-indigo-50" },
  other: { label: "Diğer", color: "text-slate-700 border-slate-300", bg: "bg-slate-100" }
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "gantt">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Selection & Details panel state
  const [activeProject, setActiveProject] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Create Project Cascade State
  const [customers, setCustomers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Forms state
  const [projectForm, setProjectForm] = useState({
    customer_id: "",
    region_id: "",
    branch_id: "",
    name: "",
    project_no: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    scope_codes: [] as string[],
    contract_value: "",
    status: "inquiry"
  });

  const [assignmentForm, setAssignmentForm] = useState({
    user_id: "",
    role_at_project: "Mühendis",
    is_lead: false
  });
  const [otherScopeLabel, setOtherScopeLabel] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [projs, custs, usrs] = await Promise.all([
          apiGet("/projects").catch(() => []),
          apiGet("/projects/customers").catch(() => []),
          apiGet("/auth/users").catch(() => [])
        ]);

        setProjects(Array.isArray(projs) ? projs : []);
        setCustomers(Array.isArray(custs) ? custs : []);
        setUsersList(Array.isArray(usrs) ? usrs : []);

        if (Array.isArray(projs) && projs.length > 0) {
          handleSelectProject(projs[0]);
        }
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  async function handleSelectProject(proj: any) {
    setActiveProject(proj);
    try {
      const assigns = await apiGet(`/projects/${proj.id}/assignments`);
      setAssignments(Array.isArray(assigns) ? assigns : []);
    } catch (err) {
      console.error("Assignments load error:", err);
      setAssignments([]);
    }
  }

  // Cascade Load Regions
  async function handleCustomerChange(custId: string) {
    setProjectForm(prev => ({ ...prev, customer_id: custId, region_id: "", branch_id: "" }));
    setRegions([]);
    setBranches([]);
    if (!custId) return;
    try {
      const data = await apiGet(`/projects/regions/${custId}`);
      setRegions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Regions fetch error:", err);
    }
  }

  // Cascade Load Branches
  async function handleRegionChange(regId: string) {
    setProjectForm(prev => ({ ...prev, region_id: regId, branch_id: "" }));
    setBranches([]);
    if (!regId) return;
    try {
      const data = await apiGet(`/projects/branches/${regId}`);
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Branches fetch error:", err);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectForm.customer_id || !projectForm.region_id || !projectForm.branch_id) {
      alert("Lütfen Müşteri, Bölge ve Şube hiyerarşisini eksiksiz doldurun.");
      return;
    }

    try {
      const normalizedScopeCodes = projectForm.scope_codes.includes("other")
        ? [...projectForm.scope_codes.filter((c) => c !== "other"), ...(otherScopeLabel.trim() ? [`other:${otherScopeLabel.trim()}`] : ["other"])]
        : projectForm.scope_codes;

      const payload = {
        customer_id: projectForm.customer_id,
        region_id: projectForm.region_id,
        branch_id: projectForm.branch_id,
        name: projectForm.name,
        project_no: projectForm.project_no || null,
        description: projectForm.description || null,
        start_date: new Date(projectForm.start_date).toISOString(),
        due_date: new Date(projectForm.due_date).toISOString(),
        scope_codes: normalizedScopeCodes,
        contract_value: projectForm.contract_value ? parseFloat(projectForm.contract_value) : null,
        status: projectForm.status
      };

      const newProj = await apiPost("/projects", payload);
      alert("Yeni proje ve şantiye başarıyla kaydedildi.");
      setIsCreateModalOpen(false);
      // Reload
      const projs = await apiGet("/projects");
      setProjects(projs);
      if (projs.length > 0) {
        handleSelectProject(newProj);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Proje oluşturulamadı.");
    }
  }

  async function handleAssignUser(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !assignmentForm.user_id) return;

    try {
      const payload = {
        user_id: assignmentForm.user_id,
        role_at_project: assignmentForm.role_at_project,
        is_lead: assignmentForm.is_lead
      };

      await apiPost(`/projects/${activeProject.id}/assignments`, payload);
      alert("Personel ataması başarıyla yapıldı.");
      setIsAssignModalOpen(false);
      setAssignmentForm({ user_id: "", role_at_project: "Mühendis", is_lead: false });
      handleSelectProject(activeProject);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Atama gerçekleştirilemedi.");
    }
  }

  function openEditModal() {
    if (!activeProject) return;
    const currentOther = Array.isArray(activeProject.scope_codes)
      ? activeProject.scope_codes.find((c: string) => String(c).startsWith("other:"))
      : "";
    setOtherScopeLabel(currentOther ? String(currentOther).replace("other:", "") : "");
    setProjectForm({
      customer_id: activeProject.customer_id || "",
      region_id: activeProject.region_id || "",
      branch_id: activeProject.branch_id || "",
      name: activeProject.name || "",
      project_no: activeProject.project_no || "",
      description: activeProject.description || "",
      start_date: activeProject.start_date ? new Date(activeProject.start_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      due_date: activeProject.due_date ? new Date(activeProject.due_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      scope_codes: Array.isArray(activeProject.scope_codes)
        ? activeProject.scope_codes.map((c: string) => (String(c).startsWith("other:") ? "other" : c))
        : [],
      contract_value: activeProject.contract_value ? String(activeProject.contract_value) : "",
      status: activeProject.status || "inquiry",
    });
    setIsEditModalOpen(true);
  }

  async function handleUpdateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject) return;
    try {
      const normalizedScopeCodes = projectForm.scope_codes.includes("other")
        ? [...projectForm.scope_codes.filter((c) => c !== "other"), ...(otherScopeLabel.trim() ? [`other:${otherScopeLabel.trim()}`] : ["other"])]
        : projectForm.scope_codes;

      const payload = {
        customer_id: projectForm.customer_id || null,
        region_id: projectForm.region_id || null,
        branch_id: projectForm.branch_id || null,
        name: projectForm.name,
        project_no: projectForm.project_no || null,
        description: projectForm.description || null,
        start_date: new Date(projectForm.start_date).toISOString(),
        due_date: new Date(projectForm.due_date).toISOString(),
        scope_codes: normalizedScopeCodes,
        contract_value: projectForm.contract_value ? parseFloat(projectForm.contract_value) : null,
        status: projectForm.status,
      };
      const updated = await apiPatch(`/projects/${activeProject.id}`, payload);
      const nextProjects = projects.map((p) => (p.id === activeProject.id ? { ...p, ...updated } : p));
      setProjects(nextProjects);
      setActiveProject({ ...activeProject, ...updated });
      setIsEditModalOpen(false);
      alert("Proje başarıyla güncellendi.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Proje güncellenemedi.");
    }
  }

  async function handleDeleteProject() {
    if (!activeProject) return;
    const ok = confirm(`"${activeProject.name}" projesini silmek istediğinize emin misiniz?`);
    if (!ok) return;
    try {
      await apiDelete(`/projects/${activeProject.id}`);
      const nextProjects = projects.filter((p) => p.id !== activeProject.id);
      setProjects(nextProjects);
      setActiveProject(nextProjects[0] || null);
      setAssignments([]);
      alert("Proje silindi.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Proje silinemedi.");
    }
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.project_no && p.project_no.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatusFilter === "all" || p.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Şantiyeler ve Projeler listeleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Proje & Şantiye Portföyü</h2>
            <p className="text-slate-300 mt-2 text-sm max-w-xl">
              Sismik Mekanik bünyesindeki sismik koruma, havalandırma (HVAC) ve yangın tesisatı şantiyelerini, ekiplerini ve hakediş durumlarını yönetin.
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Yeni Şantiye / Proje Ekle
          </button>
        </div>
      </div>

      {/* Toolbar Filters & View Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Proje adı veya koduna göre ara..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="inquiry">Keşif Aşamasındakiler</option>
            <option value="approved">Onaylananlar / Bekleyenler</option>
            <option value="in_progress">Sahada Devam Edenler</option>
            <option value="invoice_pend">Hakediş Bekleyenler</option>
            <option value="completed">Tamamlananlar</option>
            <option value="cancelled">İptal Edilenler</option>
          </select>
        </div>

        {/* View Mode Switches */}
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50">
          <button 
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Tablo Listesi
          </button>
          <button 
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban Takip
          </button>
          <button 
            onClick={() => setViewMode("gantt")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "gantt" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Gantt Çizelgesi
          </button>
        </div>
      </div>

      {/* Main Workspace split: Projects & Assignments details */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Project View Workspace */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="md:hidden divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const stat = STATUS_MAP[p.status] || STATUS_MAP.inquiry;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProject(p)}
                      className={`w-full px-4 py-4 text-left transition-all ${
                        activeProject?.id === p.id ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-slate-900 text-sm font-bold leading-5">{p.name}</p>
                          <span className="inline-flex mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {p.project_no || "SIS-PROJE"}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.scope_codes.map((code: string) => {
                          const tag = SCOPE_TAGS[code] || { label: code, color: "text-slate-700", bg: "bg-slate-50" };
                          return (
                            <span key={code} className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${tag.color} ${tag.bg}`}>
                              {tag.label}
                            </span>
                          );
                        })}
                        {p.scope_codes.length === 0 && <span className="text-xs text-slate-300 italic">Kapsam belirlenmemiş</span>}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stat.color} ${stat.bg} ${stat.border}`}>
                          {stat.label}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {p.contract_value ? `₺${p.contract_value.toLocaleString("tr")}` : "Teklif"}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <div className="px-6 py-16 text-center text-slate-400 italic">
                    Filtreye uygun kayıtlı proje bulunamadı.
                  </div>
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proje Kodu & Adı</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tasarım Kapsamı</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Süreç Durumu</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sözleşme Tutarı</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Detaylar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((p) => {
                      const stat = STATUS_MAP[p.status] || STATUS_MAP.inquiry;
                      return (
                        <tr 
                          key={p.id} 
                          onClick={() => handleSelectProject(p)}
                          className={`hover:bg-slate-50/50 transition-all cursor-pointer ${
                            activeProject?.id === p.id ? "bg-blue-50/30 font-semibold" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-slate-900 text-sm font-bold">{p.name}</p>
                              <span className="inline-flex mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {p.project_no || "SIS-PROJE"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {p.scope_codes.map((code: string) => {
                                const tag = SCOPE_TAGS[code] || { label: code, color: "text-slate-700", bg: "bg-slate-50" };
                                return (
                                  <span key={code} className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${tag.color} ${tag.bg}`}>
                                    {tag.label}
                                  </span>
                                );
                              })}
                              {p.scope_codes.length === 0 && <span className="text-xs text-slate-300 italic">Kapsam belirlenmemiş</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stat.color} ${stat.bg} ${stat.border}`}>
                              {stat.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-900">
                            {p.contract_value ? `₺${p.contract_value.toLocaleString("tr")}` : <span className="text-slate-300 italic">Teklif Aşamasında</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-400 inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic">
                          Filtreye uygun kayıtlı proje bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kanban Board View */}
          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["inquiry", "approved", "in_progress"].map(statusKey => {
                const columnProjects = filteredProjects.filter(p => p.status === statusKey);
                const statInfo = STATUS_MAP[statusKey] || STATUS_MAP.inquiry;
                return (
                  <div key={statusKey} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col gap-4 min-h-[450px]">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${statInfo.color} ${statInfo.bg}`}>
                        {statInfo.label.split(" / ")[0]}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{columnProjects.length} Proje</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {columnProjects.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => handleSelectProject(p)}
                          className={`bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 ${
                            activeProject?.id === p.id 
                              ? "border-blue-500 shadow-md shadow-blue-500/5 bg-blue-50/10 ring-1 ring-blue-500" 
                              : "border-slate-200/70 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-extrabold text-slate-400">{p.project_no}</span>
                            <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {p.scope_codes.map((code: string) => (
                              <span key={code} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                                {code}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
                            <span>Vade: {p.due_date ? new Date(p.due_date).toLocaleDateString("tr") : "Belirsiz"}</span>
                            <span>{p.contract_value ? `₺${(p.contract_value / 1000).toFixed(0)}k` : "Teklif"}</span>
                          </div>
                        </div>
                      ))}
                      {columnProjects.length === 0 && (
                        <div className="h-32 flex items-center justify-center text-slate-400 italic text-xs">Bu aşamada şantiye bulunmuyor.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gantt Timeline View */}
          {viewMode === "gantt" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Şantiye Zaman Çizelgesi</span>
                <span className="text-xs text-slate-400">Başlangıç ve teslim tarihleri baz alınmıştır</span>
              </div>

              <div className="space-y-4">
                {filteredProjects.map((p, idx) => {
                  const start = p.start_date ? new Date(p.start_date) : new Date();
                  const end = p.due_date ? new Date(p.due_date) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                  
                  // Compute timeline offset simulation
                  const offsetPct = Math.min(60, Math.max(5, (idx * 12) % 45));
                  const durationPct = Math.min(85 - offsetPct, Math.max(15, 30));

                  return (
                    <div key={p.id} className="grid grid-cols-4 gap-4 items-center border-b border-slate-50 pb-2">
                      <div className="col-span-1">
                        <span className="font-bold text-slate-900 text-xs block line-clamp-1">{p.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{p.project_no}</span>
                      </div>
                      <div className="col-span-3 relative h-6 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 shadow-inner">
                        <div 
                          className="absolute h-full rounded-md bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 flex items-center px-2 text-white font-mono text-[9px] font-extrabold shadow-sm transition-all duration-300"
                          style={{ left: `${offsetPct}%`, width: `${durationPct}%` }}
                        >
                          {start.toLocaleDateString("tr", { month: "short" })} - {end.toLocaleDateString("tr", { month: "short" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Selected Project Assignments Sidebar details */}
        <div className="xl:col-span-1">
          {activeProject ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Seçilen Şantiye</span>
                <h3 className="text-md font-extrabold text-slate-900 leading-tight">{activeProject.name}</h3>
                <span className="text-xs text-slate-500 font-medium">{activeProject.project_no}</span>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={openEditModal} className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-100">
                    Düzenle
                  </button>
                  <button onClick={handleDeleteProject} className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 hover:bg-rose-100">
                    Sil
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Açıklama</span>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                  {activeProject.description || <span className="text-slate-300 italic">Açıklama girilmemiş.</span>}
                </p>
              </div>

              {/* Scope codes list */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Uzmanlık Kapsamı</span>
                <div className="flex flex-col gap-1.5">
                  {activeProject.scope_codes.map((code: string) => {
                    const otherLabel = String(code).startsWith("other:") ? String(code).replace("other:", "Diğer: ") : null;
                    const tag = otherLabel
                      ? { label: otherLabel, color: "text-slate-700 border-slate-300", bg: "bg-slate-100" }
                      : (SCOPE_TAGS[code] || { label: code, color: "text-slate-700", bg: "bg-slate-50" });
                    return (
                      <span key={code} className={`px-2.5 py-1 text-xs font-semibold rounded-lg border uppercase tracking-wider block text-center ${tag.color} ${tag.bg}`}>
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Team list */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Saha Ekibi & Taşeronlar</span>
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Personel Ata
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {assignments.map((as: any) => {
                    const matchedUser = usersList.find(u => u.id === as.user_id);
                    return (
                      <div key={as.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0">
                            {matchedUser ? matchedUser.full_name.slice(0,2).toUpperCase() : "PE"}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block line-clamp-1">{matchedUser?.full_name || "Bilinmeyen Personel"}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{as.role_at_project}</span>
                          </div>
                        </div>
                        {as.is_lead && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 tracking-wider">
                            ŞEF
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {assignments.length === 0 && (
                    <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed">
                      Bu projeye henüz hiçbir saha personeli veya taşeron atanmamıştır.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 p-6 text-center italic shadow-sm">
              <FolderTree className="w-8 h-8 text-slate-400 opacity-60 mb-2" />
              <p className="text-xs font-bold text-slate-700">Şantiye Detayı Seçilmedi</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-1">Saha atamalarını ve kapsam kodlarını görmek için bir şantiyeye tıklayın.</p>
            </div>
          )}
        </div>

      </div>

      {/* Create Project Modal featuring Cascade dropdowns */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">Yeni Şantiye Projesi Kaydet</h3>
                <p className="text-xs text-slate-500 mt-0.5">Müşteri → Bölge → Şube cascade hiyerarşisi</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* Cascade Hiyerarşi Selects */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Müşteri Firma</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                    value={projectForm.customer_id}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Uygulama Bölgesi</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                    value={projectForm.region_id}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={!projectForm.customer_id}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Hedef Şube (Lokasyon)</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                    value={projectForm.branch_id}
                    onChange={(e) => setProjectForm({...projectForm, branch_id: e.target.value})}
                    disabled={!projectForm.region_id}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project core parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proje Adı</label>
                  <input 
                    type="text" 
                    placeholder="Örn: X Mağazası Sismik Koruma Kurulumu"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proje Numarası / Kodu</label>
                  <input 
                    type="text" 
                    placeholder="Örn: SIS-2026-X01"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                    value={projectForm.project_no}
                    onChange={(e) => setProjectForm({...projectForm, project_no: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sözleşme Bütçesi (TL)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                    value={projectForm.contract_value}
                    onChange={(e) => setProjectForm({...projectForm, contract_value: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">İlk Başlangıç Aşaması</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
                    required
                  >
                    <option value="inquiry">Keşif / Teklif Aşamasında</option>
                    <option value="approved">Onaylandı / Başlayacak</option>
                    <option value="in_progress">Sahada Devam Ediyor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Başlangıç Tarihi</label>
                  <input 
                    type="date"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Teslim / Vade Tarihi</label>
                  <input 
                    type="date"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={projectForm.due_date}
                    onChange={(e) => setProjectForm({...projectForm, due_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Scope codes selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Uygulama Alanları (Kapsam)</span>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SCOPE_TAGS).map(([key, info]) => (
                    <div 
                      key={key} 
                      onClick={() => {
                        const active = projectForm.scope_codes.includes(key);
                        const newCodes = active 
                          ? projectForm.scope_codes.filter(c => c !== key) 
                          : [...projectForm.scope_codes, key];
                        setProjectForm({ ...projectForm, scope_codes: newCodes });
                      }}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-xs font-bold select-none ${
                        projectForm.scope_codes.includes(key) 
                          ? "border-blue-500 bg-blue-50 text-blue-700" 
                          : "border-slate-100 hover:border-slate-200 bg-slate-50/50 text-slate-600"
                      }`}
                    >
                      {info.label}
                    </div>
                  ))}
                </div>
                {projectForm.scope_codes.includes("other") && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Diğer Kapsam Adı</label>
                    <input
                      type="text"
                      placeholder="Örn: Elektrik Altyapı Entegrasyonu"
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      value={otherScopeLabel}
                      onChange={(e) => setOtherScopeLabel(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Detaylı Keşif / Şantiye Özeti</label>
                <textarea 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  rows={3}
                  placeholder="Şantiye detayları, askılama parametreleri, veya özel mühendislik gereksinimleri..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Yeni Şantiyeyi Kaydet & Başlat
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">Projeyi Düzenle</h3>
                <p className="text-xs text-slate-500 mt-0.5">Temel bilgiler, kapsam ve tarih güncellemesi</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProject} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proje Adı</label>
                  <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proje Numarası / Kodu</label>
                  <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono" value={projectForm.project_no} onChange={(e) => setProjectForm({ ...projectForm, project_no: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sözleşme Bütçesi (TL)</label>
                  <input type="number" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono" value={projectForm.contract_value} onChange={(e) => setProjectForm({ ...projectForm, contract_value: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Süreç Durumu</label>
                  <select className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })} required>
                    <option value="inquiry">Keşif / Teklif Aşamasında</option>
                    <option value="approved">Onaylandı / Başlayacak</option>
                    <option value="in_progress">Sahada Devam Ediyor</option>
                    <option value="invoice_pend">Hakediş Bekliyor</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Başlangıç Tarihi</label>
                  <input type="date" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Teslim / Vade Tarihi</label>
                  <input type="date" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" value={projectForm.due_date} onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Uygulama Alanları (Kapsam)</span>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SCOPE_TAGS).map(([key, info]) => (
                    <div key={key} onClick={() => {
                      const active = projectForm.scope_codes.includes(key);
                      const newCodes = active ? projectForm.scope_codes.filter((c) => c !== key) : [...projectForm.scope_codes, key];
                      setProjectForm({ ...projectForm, scope_codes: newCodes });
                    }} className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-xs font-bold select-none ${projectForm.scope_codes.includes(key) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 hover:border-slate-200 bg-slate-50/50 text-slate-600"}`}>
                      {info.label}
                    </div>
                  ))}
                </div>
                {projectForm.scope_codes.includes("other") && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Diğer Kapsam Adı</label>
                    <input
                      type="text"
                      placeholder="Örn: Endüstriyel Otomasyon"
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      value={otherScopeLabel}
                      onChange={(e) => setOtherScopeLabel(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Detaylı Keşif / Şantiye Özeti</label>
                <textarea className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" rows={3} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
              </div>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-md transition-all">
                Projeyi Güncelle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Şantiyeye Personel Ata</h3>
                <p className="text-xs text-slate-500 mt-0.5">Sorumlu mühendis, şef veya taşeron seçimi</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Atanacak Personel</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                  value={assignmentForm.user_id}
                  onChange={(e) => setAssignmentForm({...assignmentForm, user_id: e.target.value})}
                  required
                >
                  <option value="">Personel Seçiniz</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.default_role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Projedeki Görevi (Unvan)</label>
                <input 
                  type="text" 
                  placeholder="Örn: Sismik Askılama Şefi, Taşeron Usta"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  value={assignmentForm.role_at_project}
                  onChange={(e) => setAssignmentForm({...assignmentForm, role_at_project: e.target.value})}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_lead"
                  className="rounded border-slate-300 focus:ring-blue-500 h-4 w-4 text-blue-600"
                  checked={assignmentForm.is_lead}
                  onChange={(e) => setAssignmentForm({...assignmentForm, is_lead: e.target.checked})}
                />
                <label htmlFor="is_lead" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Bu şantiyenin baş sorumlusu (Şef) olarak ata
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all"
              >
                Atamayı Gerçekleştir
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

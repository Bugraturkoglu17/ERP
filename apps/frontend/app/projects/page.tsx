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
      const projs = await apiGet<any[]>("/projects");
      const nextProjects = Array.isArray(projs) ? projs : [];
      setProjects(nextProjects);
      if (nextProjects.length > 0) {
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
      const updated = await apiPatch<any>(`/projects/${activeProject.id}`, payload);
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
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold text-sm">Şantiyeler ve Projeler listeleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="corp-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Proje & Şantiye Portföyü</h2>
            <p className="text-slate-300 mt-1.5 text-xs max-w-xl">
              Sismik Mekanik bünyesindeki sismik koruma, havalandırma (HVAC) ve yangın tesisatı şantiyelerini, ekiplerini ve hakediş durumlarını yönetin.
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="corp-btn-primary"
          >
            <Plus className="w-4 h-4" /> Yeni Şantiye / Proje Ekle
          </button>
        </div>
      </div>

      {/* Toolbar Filters & View Selector */}
      <div className="corp-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Proje adı veya koduna göre ara..." 
              className="corp-input pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-56">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="corp-select"
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
            <div className="corp-card">
              <div className="md:hidden divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  let statusBadgeClass = "corp-badge-secondary";
                  if (p.status === "in_progress") statusBadgeClass = "corp-badge-success";
                  else if (p.status === "inquiry") statusBadgeClass = "corp-badge-warning";
                  else if (p.status === "approved" || p.status === "invoice_pend") statusBadgeClass = "corp-badge-info";
                  else if (p.status === "cancelled") statusBadgeClass = "corp-badge-danger";

                  const label = STATUS_MAP[p.status]?.label?.split(" / ")[0] || "Taslak";
                  
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProject(p)}
                      className={`w-full px-4 py-4 text-left transition-all ${
                        activeProject?.id === p.id ? "bg-blue-50/30 font-bold" : "hover:bg-slate-50/50"
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
                        <span className={statusBadgeClass}>
                          {label}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {p.contract_value ? `₺{p.contract_value.toLocaleString("tr")}` : "Teklif"}
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
                <table className="corp-table">
                  <thead>
                    <tr>
                      <th className="corp-th">Proje Kodu & Adı</th>
                      <th className="corp-th">Tasarım Kapsamı</th>
                      <th className="corp-th">Süreç Durumu</th>
                      <th className="corp-th">Sözleşme Tutarı</th>
                      <th className="corp-th text-right">Detaylar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => {
                      let statusBadgeClass = "corp-badge-secondary";
                      if (p.status === "in_progress") statusBadgeClass = "corp-badge-success";
                      else if (p.status === "inquiry") statusBadgeClass = "corp-badge-warning";
                      else if (p.status === "approved" || p.status === "invoice_pend") statusBadgeClass = "corp-badge-info";
                      else if (p.status === "cancelled") statusBadgeClass = "corp-badge-danger";

                      const label = STATUS_MAP[p.status]?.label?.split(" / ")[0] || "Taslak";
                      
                      return (
                        <tr 
                          key={p.id} 
                          onClick={() => handleSelectProject(p)}
                          className={`hover:bg-slate-50/50 cursor-pointer ${
                            activeProject?.id === p.id ? "bg-blue-50/30 font-semibold" : ""
                          }`}
                        >
                          <td className="corp-td">
                            <div>
                              <p className="text-slate-900 text-sm font-bold">{p.name}</p>
                              <span className="inline-flex mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {p.project_no || "SIS-PROJE"}
                              </span>
                            </div>
                          </td>
                          <td className="corp-td">
                            <div className="flex flex-wrap gap-1">
                              {p.scope_codes.map((code: string) => {
                                const tag = SCOPE_TAGS[code] || { label: code, color: "text-slate-700 border-slate-200", bg: "bg-slate-50" };
                                return (
                                  <span key={code} className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${tag.color} ${tag.bg}`}>
                                    {tag.label}
                                  </span>
                                );
                              })}
                              {p.scope_codes.length === 0 && <span className="text-xs text-slate-350 italic">Kapsam belirlenmemiş</span>}
                            </div>
                          </td>
                          <td className="corp-td">
                            <span className={statusBadgeClass}>
                              {label}
                            </span>
                          </td>
                          <td className="corp-td font-bold text-slate-900">
                            {p.contract_value ? `₺${p.contract_value.toLocaleString("tr")}` : <span className="text-slate-300 italic">Teklif Aşamasında</span>}
                          </td>
                          <td className="corp-td text-right">
                            <ChevronRight className="w-4 h-4 text-slate-400 inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={5} className="corp-td text-center text-slate-450 italic py-16">
                          Filtreye uygun kayıtlı proje bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["inquiry", "approved", "in_progress"].map(statusKey => {
                const columnProjects = filteredProjects.filter(p => p.status === statusKey);
                let statusBadgeClass = "corp-badge-secondary";
                if (statusKey === "in_progress") statusBadgeClass = "corp-badge-success";
                else if (statusKey === "inquiry") statusBadgeClass = "corp-badge-warning";
                else if (statusKey === "approved") statusBadgeClass = "corp-badge-info";

                const label = STATUS_MAP[statusKey]?.label?.split(" / ")[0] || "Taslak";
                
                return (
                  <div key={statusKey} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-4 min-h-[450px]">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className={statusBadgeClass}>
                        {label}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{columnProjects.length} Proje</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {columnProjects.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => handleSelectProject(p)}
                          className={`bg-white p-4 rounded-xl border cursor-pointer flex flex-col gap-2.5 transition-colors duration-150 ${
                            activeProject?.id === p.id 
                              ? "border-indigo-600 bg-indigo-50/10 ring-1 ring-indigo-600" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-extrabold text-slate-400">{p.project_no}</span>
                            <span className="font-bold text-slate-950 text-xs leading-normal">{p.name}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {p.scope_codes.map((code: string) => (
                              <span key={code} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50 uppercase tracking-wider">
                                {code}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-550 pt-2 border-t border-slate-100 font-bold">
                            <span className="text-slate-400 font-medium">Vade: {p.due_date ? new Date(p.due_date).toLocaleDateString("tr") : "Belirsiz"}</span>
                            <span className="text-slate-700">{p.contract_value ? `₺${(p.contract_value / 1000).toFixed(0)}k` : "Teklif"}</span>
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

          {viewMode === "gantt" && (
            <div className="corp-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Şantiye Zaman Çizelgesi
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Başlangıç ve teslim tarihleri baz alınmıştır</span>
              </div>

              <div className="space-y-4">
                {filteredProjects.map((p, idx) => {
                  const start = p.start_date ? new Date(p.start_date) : new Date();
                  const end = p.due_date ? new Date(p.due_date) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                  
                  // Compute timeline offset simulation
                  const offsetPct = Math.min(60, Math.max(5, (idx * 12) % 45));
                  const durationPct = Math.min(85 - offsetPct, Math.max(15, 30));

                  return (
                    <div key={p.id} className="grid grid-cols-4 gap-4 items-center border-b border-slate-100 pb-3">
                      <div className="col-span-1">
                        <span className="font-bold text-slate-900 text-xs block line-clamp-1">{p.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{p.project_no}</span>
                      </div>
                      <div className="col-span-3 relative h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                        <div 
                          className="absolute h-full rounded-md bg-indigo-600 flex items-center px-2 text-white font-mono text-[9px] font-bold shadow-sm"
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
            <div className="corp-card p-5 space-y-5">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Seçilen Şantiye</span>
                <h3 className="text-sm font-extrabold text-slate-950 leading-tight">{activeProject.name}</h3>
                <span className="text-xs text-slate-500 font-semibold">{activeProject.project_no}</span>
                <div className="flex items-center gap-2 pt-2">
                  <button onClick={openEditModal} className="corp-btn-secondary px-2.5 py-1 text-[11px] h-auto">
                    Düzenle
                  </button>
                  <button onClick={handleDeleteProject} className="corp-btn-danger px-2.5 py-1 text-[11px] h-auto">
                    Sil
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-xs text-slate-700">
                <span className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Açıklama</span>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-semibold text-xs text-slate-800">
                  {activeProject.description || <span className="text-slate-300 italic">Açıklama girilmemiş.</span>}
                </p>
              </div>

              {/* Scope codes list */}
              <div className="space-y-2">
                <span className="font-black text-slate-400 uppercase text-[9px] tracking-wider block">Uzmanlık Kapsamı</span>
                <div className="flex flex-col gap-1.5">
                  {activeProject.scope_codes.map((code: string) => {
                    const otherLabel = String(code).startsWith("other:") ? String(code).replace("other:", "Diğer: ") : null;
                    const tag = otherLabel
                      ? { label: otherLabel, color: "text-slate-700 border-slate-200", bg: "bg-slate-100" }
                      : (SCOPE_TAGS[code] || { label: code, color: "text-slate-700 border-slate-200", bg: "bg-slate-50" });
                    return (
                      <span key={code} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider block text-center ${tag.color} ${tag.bg}`}>
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Team list */}
              <div className="space-y-3 pt-3.5 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Saha Ekibi & Taşeronlar</span>
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Personel Ata
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {assignments.map((as: any) => {
                    const matchedUser = usersList.find(u => u.id === as.user_id);
                    return (
                      <div key={as.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0 border border-slate-300">
                            {matchedUser ? matchedUser.full_name.slice(0,2).toUpperCase() : "PE"}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block line-clamp-1">{matchedUser?.full_name || "Bilinmeyen Personel"}</span>
                            <span className="text-[10px] text-slate-450 font-bold">{as.role_at_project}</span>
                          </div>
                        </div>
                        {as.is_lead && (
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[9px] font-black uppercase tracking-wider">
                            ŞEF
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {assignments.length === 0 && (
                    <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      Bu projeye henüz hiçbir saha personeli veya taşeron atanmamıştır.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-250 text-slate-400 p-6 text-center italic shadow-sm">
              <FolderTree className="w-8 h-8 text-slate-350 mb-2" />
              <p className="text-xs font-bold text-slate-700 font-sans">Şantiye Detayı Seçilmedi</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-1.5 leading-normal">Saha atamalarını ve kapsam kodlarını görmek için bir şantiyeye tıklayın.</p>
            </div>
          )}
        </div>

      </div>

      {/* Create Project Modal featuring Cascade dropdowns */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Yeni Şantiye Projesi Kaydet</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Müşteri → Bölge → Şube cascade hiyerarşisi</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* Cascade Hiyerarşi Selects */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Müşteri Firma</label>
                  <select 
                    className="corp-select"
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Uygulama Bölgesi</label>
                  <select 
                    className="corp-select"
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hedef Şube (Lokasyon)</label>
                  <select 
                    className="corp-select"
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Proje Adı</label>
                  <input 
                    type="text" 
                    placeholder="Örn: X Mağazası Sismik Koruma Kurulumu"
                    className="corp-input"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Proje Numarası / Kodu</label>
                  <input 
                    type="text" 
                    placeholder="Örn: SIS-2026-X01"
                    className="corp-input font-mono"
                    value={projectForm.project_no}
                    onChange={(e) => setProjectForm({...projectForm, project_no: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sözleşme Bütçesi (TL)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="corp-input font-mono"
                    value={projectForm.contract_value}
                    onChange={(e) => setProjectForm({...projectForm, contract_value: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">İlk Başlangıç Aşaması</label>
                  <select 
                    className="corp-select"
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Başlangıç Tarihi</label>
                  <input 
                    type="date"
                    className="corp-input font-semibold"
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Teslim / Vade Tarihi</label>
                  <input 
                    type="date"
                    className="corp-input font-semibold"
                    value={projectForm.due_date}
                    onChange={(e) => setProjectForm({...projectForm, due_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Scope codes selector */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Uygulama Alanları (Kapsam)</span>
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
                      className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer text-xs font-bold select-none ${
                        projectForm.scope_codes.includes(key) 
                          ? "border-indigo-650 border-indigo-600 bg-indigo-50 text-indigo-800" 
                          : "border-slate-200 hover:border-slate-350 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {info.label}
                    </div>
                  ))}
                </div>
                {projectForm.scope_codes.includes("other") && (
                  <div className="pt-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Diğer Kapsam Adı</label>
                    <input
                      type="text"
                      placeholder="Örn: Elektrik Altyapı Entegrasyonu"
                      className="corp-input"
                      value={otherScopeLabel}
                      onChange={(e) => setOtherScopeLabel(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Detaylı Keşif / Şantiye Özeti</label>
                <textarea 
                  className="corp-input"
                  rows={3}
                  placeholder="Şantiye detayları, askılama parametreleri, veya özel mühendislik gereksinimleri..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="corp-btn-primary w-full py-3"
              >
                Yeni Şantiyeyi Kaydet & Başlat
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Projeyi Düzenle</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Temel bilgiler, kapsam ve tarih güncellemesi</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProject} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Proje Adı</label>
                  <input type="text" className="corp-input" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Proje Numarası / Kodu</label>
                  <input type="text" className="corp-input font-mono" value={projectForm.project_no} onChange={(e) => setProjectForm({ ...projectForm, project_no: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sözleşme Bütçesi (TL)</label>
                  <input type="number" className="corp-input font-mono" value={projectForm.contract_value} onChange={(e) => setProjectForm({ ...projectForm, contract_value: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Süreç Durumu</label>
                  <select className="corp-select" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })} required>
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Başlangıç Tarihi</label>
                  <input type="date" className="corp-input font-semibold" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Teslim / Vade Tarihi</label>
                  <input type="date" className="corp-input font-semibold" value={projectForm.due_date} onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Uygulama Alanları (Kapsam)</span>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SCOPE_TAGS).map(([key, info]) => (
                    <div key={key} onClick={() => {
                      const active = projectForm.scope_codes.includes(key);
                      const newCodes = active ? projectForm.scope_codes.filter((c) => c !== key) : [...projectForm.scope_codes, key];
                      setProjectForm({ ...projectForm, scope_codes: newCodes });
                    }} className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer text-xs font-bold select-none ${projectForm.scope_codes.includes(key) ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 hover:border-slate-350 bg-slate-50 text-slate-600"}`}>
                      {info.label}
                    </div>
                  ))}
                </div>
                {projectForm.scope_codes.includes("other") && (
                  <div className="pt-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Diğer Kapsam Adı</label>
                    <input
                      type="text"
                      placeholder="Örn: Endüstriyel Otomasyon"
                      className="corp-input"
                      value={otherScopeLabel}
                      onChange={(e) => setOtherScopeLabel(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Detaylı Keşif / Şantiye Özeti</label>
                <textarea className="corp-input" rows={3} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
              </div>
              <button type="submit" className="corp-btn-primary w-full py-3">
                Projeyi Güncelle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Şantiyeye Personel Ata</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Sorumlu mühendis, şef veya taşeron seçimi</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Atanacak Personel</label>
                <select 
                  className="corp-select"
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Projedeki Görevi (Unvan)</label>
                <input 
                  type="text" 
                  placeholder="Örn: Sismik Askılama Şefi, Taşeron Usta"
                  className="corp-input"
                  value={assignmentForm.role_at_project}
                  onChange={(e) => setAssignmentForm({...assignmentForm, role_at_project: e.target.value})}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_lead"
                  className="rounded border-slate-350 focus:ring-indigo-500 h-4 w-4 text-indigo-650 cursor-pointer"
                  checked={assignmentForm.is_lead}
                  onChange={(e) => setAssignmentForm({...assignmentForm, is_lead: e.target.checked})}
                />
                <label htmlFor="is_lead" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Bu şantiyenin baş sorumlusu (Şef) olarak ata
                </label>
              </div>

              <button 
                type="submit"
                className="corp-btn-primary w-full py-3"
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

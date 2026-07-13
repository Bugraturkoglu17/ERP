"use client";

import { useState, useEffect } from "react";
import { 
  Plus, X, Search, List, LayoutGrid, Calendar, 
  UserPlus, FolderTree 
} from "lucide-react";

import { useProjectsData } from "@/hooks/use-projects-data";
import { ProjectList } from "@/components/modules/projects/project-list";
import { ProjectFilters } from "@/components/modules/projects/project-filters";
import { ProjectSummaryCards } from "@/components/modules/projects/project-summary-cards";
import { DataState } from "@/components/common/data-state";

import { ProjectCreateModal } from "@/components/modules/projects/project-create-modal";
import { ProjectEditModal } from "@/components/modules/projects/project-edit-modal";
import { ProjectAssignModal } from "@/components/modules/projects/project-assign-modal";
import { ProjectDetailsSidebar } from "@/components/modules/projects/project-details-sidebar";


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

// Export for use in components
export { STATUS_MAP, SCOPE_TAGS };

export default function ProjectsPage() {
  const {
    projects, customers, regions, branches, usersList, loading, error,
    refetch, loadRegions, loadBranches, getAssignments,
    createProject, updateProject, deleteProject, assignUser
  } = useProjectsData();

  const [viewMode, setViewMode] = useState<"table" | "kanban" | "gantt">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Selection & Details panel state
  const [activeProject, setActiveProject] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Forms state
  const [projectForm, setProjectForm] = useState(() => ({
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
  }));

  const [assignmentForm, setAssignmentForm] = useState({
    user_id: "",
    role_at_project: "Mühendis",
    is_lead: false
  });
  const [otherScopeLabel, setOtherScopeLabel] = useState("");

  // Select first project when data loads
  useEffect(() => {
    if (projects.length > 0 && !activeProject) {
      handleSelectProject(projects[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  async function handleSelectProject(proj: any) {
    setActiveProject(proj);
    const assigns = await getAssignments(proj.id);
    setAssignments(assigns);
  }

  // Cascade Load Regions
  async function handleCustomerChange(custId: string) {
    setProjectForm(prev => ({ ...prev, customer_id: custId, region_id: "", branch_id: "" }));
    await loadRegions(custId);
  }

  // Cascade Load Branches
  async function handleRegionChange(regId: string) {
    setProjectForm(prev => ({ ...prev, region_id: regId, branch_id: "" }));
    await loadBranches(regId);
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

      const newProj = await createProject(payload);
      alert("Yeni proje ve şantiye başarıyla kaydedildi.");
      setIsCreateModalOpen(false);
      if (newProj) {
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

      await assignUser(activeProject.id, payload);
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
      const updated = await updateProject(activeProject.id, payload);
      setActiveProject({ ...activeProject, ...(updated || {}) });
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
      await deleteProject(activeProject.id);
      setActiveProject(null);
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

  return (
    <DataState
      loading={loading}
      error={error}
      isEmpty={filteredProjects.length === 0}
      emptyTitle="Proje bulunamadı"
      emptyDescription="Henüz kayıtlı proje yok veya arama kriterlerine uygun sonuç bulunmuyor."
    >
      <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="corp-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Proje & Şantiye Portföyü</h2>
            <p className="text-slate-300 mt-1.5 text-xs max-w-xl">
              Golabs bünyesindeki sismik koruma, havalandırma (HVAC) ve yangın tesisatı şantiyelerini, ekiplerini ve hakediş durumlarını yönetin.
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
            <ProjectList
              projects={filteredProjects}
              selectedId={activeProject?.id}
              onSelect={handleSelectProject}
              viewMode="table"
            />
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
          <ProjectDetailsSidebar
            activeProject={activeProject}
            assignments={assignments}
            usersList={usersList}
            openEditModal={openEditModal}
            handleDeleteProject={handleDeleteProject}
            setIsAssignModalOpen={setIsAssignModalOpen}
          />
        </div>

      </div>

      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        customers={customers}
        regions={regions}
        branches={branches}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        otherScopeLabel={otherScopeLabel}
        setOtherScopeLabel={setOtherScopeLabel}
        handleCustomerChange={handleCustomerChange}
        handleRegionChange={handleRegionChange}
        handleCreateProject={handleCreateProject}
      />

      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        otherScopeLabel={otherScopeLabel}
        setOtherScopeLabel={setOtherScopeLabel}
        handleUpdateProject={handleUpdateProject}
      />

      <ProjectAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        usersList={usersList}
        assignmentForm={assignmentForm}
        setAssignmentForm={setAssignmentForm}
        handleAssignUser={handleAssignUser}
      />
    </div>
    </DataState>
  );
}


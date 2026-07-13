import { FolderTree, UserPlus } from "lucide-react";
import { SCOPE_TAGS } from "@/app/(dashboard)/projects/page";

interface ProjectDetailsSidebarProps {
  activeProject: any | null;
  assignments: any[];
  usersList: any[];
  openEditModal: () => void;
  handleDeleteProject: () => void;
  setIsAssignModalOpen: (isOpen: boolean) => void;
}

export function ProjectDetailsSidebar({
  activeProject,
  assignments,
  usersList,
  openEditModal,
  handleDeleteProject,
  setIsAssignModalOpen
}: ProjectDetailsSidebarProps) {
  if (!activeProject) {
    return (
      <div className="h-[350px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-250 text-slate-400 p-6 text-center italic shadow-sm">
        <FolderTree className="w-8 h-8 text-slate-350 mb-2" />
        <p className="text-xs font-bold text-slate-700 font-sans">Şantiye Detayı Seçilmedi</p>
        <p className="text-[10px] text-slate-400 max-w-[200px] mt-1.5 leading-normal">Saha atamalarını ve kapsam kodlarını görmek için bir şantiyeye tıklayın.</p>
      </div>
    );
  }

  return (
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
  );
}

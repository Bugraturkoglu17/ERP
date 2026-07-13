import { X } from "lucide-react";
import { SCOPE_TAGS } from "@/app/(dashboard)/projects/page"; 

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectForm: any;
  setProjectForm: (form: any) => void;
  otherScopeLabel: string;
  setOtherScopeLabel: (label: string) => void;
  handleUpdateProject: (e: React.FormEvent) => void;
}

export function ProjectEditModal({
  isOpen,
  onClose,
  projectForm,
  setProjectForm,
  otherScopeLabel,
  setOtherScopeLabel,
  handleUpdateProject
}: ProjectEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Projeyi Düzenle</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Temel bilgiler, kapsam ve tarih güncellemesi</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
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
              {Object.entries(SCOPE_TAGS).map(([key, info]: [string, any]) => (
                <div key={key} onClick={() => {
                  const active = projectForm.scope_codes.includes(key);
                  const newCodes = active ? projectForm.scope_codes.filter((c: string) => c !== key) : [...projectForm.scope_codes, key];
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
  );
}

import { X } from "lucide-react";
import { SCOPE_TAGS } from "@/app/(dashboard)/projects/page"; // We will keep SCOPE_TAGS in page or move it. Better yet, we can pass it or define it in a shared constants file. For now import from page.

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  regions: any[];
  branches: any[];
  projectForm: any;
  setProjectForm: (form: any) => void;
  otherScopeLabel: string;
  setOtherScopeLabel: (label: string) => void;
  handleCustomerChange: (custId: string) => void;
  handleRegionChange: (regId: string) => void;
  handleCreateProject: (e: React.FormEvent) => void;
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  customers,
  regions,
  branches,
  projectForm,
  setProjectForm,
  otherScopeLabel,
  setOtherScopeLabel,
  handleCustomerChange,
  handleRegionChange,
  handleCreateProject
}: ProjectCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Yeni Şantiye Projesi Kaydet</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Müşteri → Bölge → Şube cascade hiyerarşisi</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
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
              {Object.entries(SCOPE_TAGS).map(([key, info]: [string, any]) => (
                <div 
                  key={key} 
                  onClick={() => {
                    const active = projectForm.scope_codes.includes(key);
                    const newCodes = active 
                      ? projectForm.scope_codes.filter((c: string) => c !== key) 
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
  );
}

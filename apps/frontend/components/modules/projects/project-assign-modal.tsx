import { X } from "lucide-react";

interface ProjectAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: any[];
  assignmentForm: any;
  setAssignmentForm: (form: any) => void;
  handleAssignUser: (e: React.FormEvent) => void;
}

export function ProjectAssignModal({
  isOpen,
  onClose,
  usersList,
  assignmentForm,
  setAssignmentForm,
  handleAssignUser
}: ProjectAssignModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Şantiyeye Personel Ata</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Sorumlu mühendis, şef veya taşeron seçimi</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
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
  );
}

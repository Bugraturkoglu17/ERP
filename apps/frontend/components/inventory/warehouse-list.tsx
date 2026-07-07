import React from "react";
import { Warehouse as WarehouseIcon, Edit2, Trash2, FolderDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Warehouse {
  id: string;
  name: string;
  type: "site" | "main";
  code?: string;
  location?: string;
  project_id?: string;
}

interface Project {
  id: string;
  name: string;
}

interface WarehouseListProps {
  warehouses: Warehouse[];
  selectedWarehouse: Warehouse | null;
  onSelectWarehouse: (warehouse: Warehouse) => void;
  projects: Project[];
  isAdmin: boolean;
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (id: string) => void;
}

export const WarehouseList: React.FC<WarehouseListProps> = ({
  warehouses,
  selectedWarehouse,
  onSelectWarehouse,
  projects,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  if (warehouses.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center text-slate-400 italic">
        Kayıtlı depo bulunamadı.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-1">
      {warehouses.map((wh) => {
        const isSelected = selectedWarehouse?.id === wh.id;
        const project = projects.find((p) => p.id === wh.project_id);
        return (
          <div
            key={wh.id}
            onClick={() => onSelectWarehouse(wh)}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
              isSelected
                ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <WarehouseIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 block leading-tight">
                    {wh.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Kod: {wh.code || "Belirtilmemiş"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(wh);
                      }}
                      className="p-1 h-7 w-7 border-none hover:bg-indigo-50"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(wh.id);
                      }}
                      className="p-1 h-7 w-7 border-none hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Badge variant={wh.type === "main" ? "warning" : "info"}>
                  {wh.type === "main" ? "Merkez" : "Şantiye"}
                </Badge>
              </div>
            </div>

            {/* Display project connection details if type is site */}
            {wh.type === "site" && wh.project_id && (
              <div className="mt-3 text-[10px] text-indigo-750 bg-indigo-50 px-2 py-1 rounded w-fit font-bold flex items-center gap-1.5 border border-indigo-100">
                <FolderDot className="w-3 h-3" />
                Proje: {project?.name || "Mekanik Projesi"}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-2 font-medium italic line-clamp-1">
              {wh.location || "Konum bilgisi belirtilmemiş"}
            </p>
          </div>
        );
      })}
    </div>
  );
};

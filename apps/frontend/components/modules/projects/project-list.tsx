"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderTree } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" | "secondary" }> = {
  inquiry:      { label: "Keşif Aşaması",     variant: "secondary" },
  approved:     { label: "Onaylandı",          variant: "success" },
  in_progress:  { label: "Devam Ediyor",       variant: "info" },
  invoice_pend: { label: "Hakediş Bekliyor",   variant: "warning" },
  completed:    { label: "Tamamlandı",         variant: "secondary" },
  cancelled:    { label: "İptal Edildi",       variant: "danger" },
};

const SCOPE_TAGS: Record<string, { label: string }> = {
  seismic: { label: "Sismik Koruma" },
  hvac:    { label: "HVAC" },
  fire:    { label: "Yangın Söndürme" },
  mep:     { label: "MEP" },
  bakim:   { label: "Bakım" },
  other:   { label: "Diğer" },
};

interface Project {
  id: string;
  name: string;
  project_no?: string;
  status: string;
  scope_codes?: string[];
  contract_value?: number | null;
  start_date?: string;
  due_date?: string;
}

interface ProjectListProps {
  projects: Project[];
  selectedId?: string | null;
  onSelect?: (project: Project) => void;
  viewMode?: "table" | "card";
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedId,
  onSelect,
  viewMode = "table",
}) => {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderTree className="w-10 h-10 text-slate-200" />}
        title="Proje Bulunamadı"
        description="Arama kriterlerine uygun proje kaydı bulunmamaktadır."
      />
    );
  }

  if (viewMode === "card") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const statusCfg = STATUS_MAP[proj.status] ?? { label: proj.status, variant: "secondary" as const };
          const isSelected = proj.id === selectedId;
          return (
            <Card
              key={proj.id}
              onClick={() => onSelect?.(proj)}
              className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                isSelected ? "border-indigo-500 ring-1 ring-indigo-400/40" : "border-slate-200"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-slate-900 leading-tight">{proj.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{proj.project_no ?? "—"}</p>
                  </div>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                {proj.scope_codes && proj.scope_codes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proj.scope_codes.map(code => (
                      <span key={code} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 font-semibold">
                        {SCOPE_TAGS[code]?.label ?? code}
                      </span>
                    ))}
                  </div>
                )}
                {proj.contract_value != null && (
                  <p className="text-xs font-extrabold text-slate-900">
                    ₺{Number(proj.contract_value).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Table view
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proje No</th>
            <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proje Adı</th>
            <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kapsam</th>
            <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sözleşme</th>
            <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map((proj) => {
            const statusCfg = STATUS_MAP[proj.status] ?? { label: proj.status, variant: "secondary" as const };
            const isSelected = proj.id === selectedId;
            return (
              <tr
                key={proj.id}
                onClick={() => onSelect?.(proj)}
                className={`cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? "bg-indigo-50/50" : ""}`}
              >
                <td className="px-5 py-4 font-mono text-xs text-indigo-700 font-bold">{proj.project_no ?? "—"}</td>
                <td className="px-5 py-4 font-bold text-slate-800">{proj.name}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(proj.scope_codes ?? []).map(code => (
                      <span key={code} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 font-semibold">
                        {SCOPE_TAGS[code]?.label ?? code}
                      </span>
                    ))}
                    {(proj.scope_codes ?? []).length === 0 && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-5 py-4 font-extrabold text-slate-900 text-xs">
                  {proj.contract_value != null
                    ? `₺${Number(proj.contract_value).toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`
                    : <span className="text-slate-400 font-normal">Belirtilmemiş</span>
                  }
                </td>
                <td className="px-5 py-4">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

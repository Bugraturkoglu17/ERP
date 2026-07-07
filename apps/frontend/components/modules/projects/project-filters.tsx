"use client";

import React from "react";
import { SearchInput } from "@/components/common/search-input";
import { SelectField } from "@/components/common/select-field";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "all",          label: "Tüm Durumlar" },
  { value: "inquiry",      label: "Keşif Aşaması" },
  { value: "approved",     label: "Onaylandı" },
  { value: "in_progress",  label: "Devam Ediyor" },
  { value: "invoice_pend", label: "Hakediş Bekliyor" },
  { value: "completed",    label: "Tamamlandı" },
  { value: "cancelled",    label: "İptal Edildi" },
];

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  viewMode: "table" | "card";
  onViewModeChange: (mode: "table" | "card") => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Proje adı veya no ara..."
        className="w-full sm:w-72"
      />
      <div className="w-full sm:w-52">
        <SelectField
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        />
      </div>
      <div className="ml-auto flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
        <Button
          variant={viewMode === "table" ? "primary" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("table")}
          className="p-2 h-8 w-8"
          title="Liste Görünümü"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === "card" ? "primary" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("card")}
          className="p-2 h-8 w-8"
          title="Kart Görünümü"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

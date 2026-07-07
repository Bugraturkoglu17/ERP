"use client";

import React from "react";
import { SearchInput } from "@/components/common/search-input";
import { FilterBar } from "@/components/common/filter-bar";

interface ProcessFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  tab?: string;
  onTabChange?: (val: string) => void;
  tabOptions?: { value: string; label: string }[];
  placeholder?: string;
}

export const ProcessFilters: React.FC<ProcessFiltersProps> = ({
  search,
  onSearchChange,
  tab,
  onTabChange,
  tabOptions,
  placeholder = "Mağaza ara...",
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {tabOptions && onTabChange && tab !== undefined && (
        <div className="flex gap-0.5 border border-slate-200 rounded-xl p-1 bg-slate-50">
          <FilterBar
            options={tabOptions}
            selectedValue={tab}
            onChange={onTabChange}
          />
        </div>
      )}
      <div className="sm:ml-auto">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={placeholder}
          className="w-full sm:w-60"
        />
      </div>
    </div>
  );
};

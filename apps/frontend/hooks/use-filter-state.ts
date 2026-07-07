import { useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export interface FilterStateOptions {
  initialFilters?: Record<string, string>;
  debounceMs?: number;
}

export function useFilterState(options: FilterStateOptions = {}) {
  const { initialFilters = {}, debounceMs = 300 } = options;

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  const debouncedSearch = useDebounce(search, debounceMs);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setFilters(initialFilters);
  }, [initialFilters]);

  const hasActiveFilters = search.trim() !== "" || Object.values(filters).some(v => v !== "");

  const filterRows = useCallback(<T = any>(
    rows: T[],
    searchAccessors?: ((row: T) => string)[],
    filterAccessors?: Record<string, (row: T) => string>
  ): T[] => {
    let result = rows;

    if (debouncedSearch.trim() && searchAccessors) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(row =>
        searchAccessors.some(accessor =>
          (accessor(row) || "").toLowerCase().includes(q)
        )
      );
    }

    if (filterAccessors) {
      Object.entries(filters).forEach(([key, value]) => {
        if (!value || value === "" || value === "all") return;
        const accessor = filterAccessors[key];
        if (!accessor) return;
        result = result.filter(row => accessor(row) === value);
      });
    }

    return result;
  }, [debouncedSearch, filters]);

  return {
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    filterRows,
  };
}

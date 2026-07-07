import { useState, useCallback } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { useDebounce } from "@/hooks/use-debounce";

export interface TableStateOptions {
  initialPageSize?: number;
  initialSortKey?: string;
  initialSortDir?: "asc" | "desc";
}

export function useTableState<T = any>(options: TableStateOptions = {}) {
  const { initialPageSize = 20, initialSortKey = "", initialSortDir = "asc" } = options;

  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const debouncedSearch = useDebounce(search, 300);

  const { page, setPage } = usePagination(1, pageSize);

  const toggleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
    setPage(1);
  }, [setPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const sortRows = useCallback((rows: T[], keyAccessor?: (row: T) => any) => {
    if (!sortKey) return rows;
    return [...rows].sort((a: any, b: any) => {
      const aVal = keyAccessor ? keyAccessor(a) : a[sortKey];
      const bVal = keyAccessor ? keyAccessor(b) : b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), "tr");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  const paginateRows = useCallback(<R = T>(rows: R[]): R[] => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, [setPage]);

  return {
    // Sort
    sortKey,
    sortDir,
    toggleSort,
    // Selection
    selected,
    toggleSelect,
    selectAll,
    clearSelection,
    // Search
    search,
    debouncedSearch,
    handleSearchChange,
    // Pagination
    page,
    pageSize,
    setPage,
    setPageSize,
    // Helpers
    sortRows,
    paginateRows,
  };
}

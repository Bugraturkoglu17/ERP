import { useState, useCallback } from "react";

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  offset: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
}

export function usePagination(initialPage = 1, initialPageSize = 10): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    setPageState((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageState((p) => Math.max(1, p - 1));
  }, []);

  const reset = useCallback(() => {
    setPageState(initialPage);
  }, [initialPage]);

  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    offset,
    setPage,
    nextPage,
    prevPage,
    reset,
  };
}

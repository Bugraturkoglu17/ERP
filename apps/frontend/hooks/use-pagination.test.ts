import { renderHook, act } from "@testing-library/react";
import { usePagination } from "./use-pagination";

describe("usePagination hook", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => usePagination({ initialPageSize: 10 }));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it("changes page correctly", () => {
    const { result } = renderHook(() => usePagination({ initialPageSize: 10 }));
    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.page).toBe(2);
  });

  it("changes pageSize and resets page to 1", () => {
    const { result } = renderHook(() => usePagination({ initialPageSize: 10 }));
    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setPageSize(20);
    });
    expect(result.current.pageSize).toBe(20);
    expect(result.current.page).toBe(1);
  });
});

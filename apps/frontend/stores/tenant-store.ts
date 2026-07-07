import { create } from "zustand";
import { TenantContext, fetchTenantContext, saveTenantContext } from "@/lib/tenant-context";

interface TenantState {
  context: TenantContext | null;
  isLoading: boolean;
  error: string | null;
  setContext: (context: TenantContext) => void;
  loadContext: (force?: boolean) => Promise<TenantContext | null>;
  clearContext: () => void;
}

const CACHE_KEY = "tenant_context_v1";

const getCachedContext = (): TenantContext | null => {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(CACHE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as TenantContext;
    } catch {
      window.sessionStorage.removeItem(CACHE_KEY);
    }
  }
  return null;
};

export const useTenantStore = create<TenantState>((set, get) => ({
  context: getCachedContext(),
  isLoading: false,
  error: null,
  setContext: (context) => {
    saveTenantContext(context);
    set({ context });
  },
  loadContext: async (force = false) => {
    if (!force && get().context) {
      return get().context;
    }
    set({ isLoading: true, error: null });
    try {
      const context = await fetchTenantContext(force);
      if (context) {
        set({ context, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return context;
    } catch (err: any) {
      set({ error: err.message || "Failed to load tenant context", isLoading: false });
      return null;
    }
  },
  clearContext: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(CACHE_KEY);
    }
    set({ context: null });
  },
}));

import { useEffect } from "react";
import { useTenantStore } from "@/stores/tenant-store";
import { TenantContext } from "@/lib/tenant-context";

interface UseTenantContextReturn {
  context: TenantContext | null;
  isLoading: boolean;
  error: string | null;
  setContext: (context: TenantContext) => void;
  loadContext: (force?: boolean) => Promise<TenantContext | null>;
  clearContext: () => void;
}

export function useTenantContext(autoLoad = true): UseTenantContextReturn {
  const { context, isLoading, error, setContext, loadContext, clearContext } = useTenantStore();

  useEffect(() => {
    if (autoLoad && !context && typeof window !== "undefined") {
      loadContext();
    }
  }, [autoLoad, context, loadContext]);

  return {
    context,
    isLoading,
    error,
    setContext,
    loadContext,
    clearContext,
  };
}

import { apiGet } from "@/lib/api";

export type TenantContext = {
  tenant_id: string;
  tenant_name: string;
  tenant_code: string;
  logo_url?: string | null;
  tax_no?: string | null;
  sector?: string | null;
  country?: string | null;
  theme_color?: string | null;
  domain?: string | null;
  subdomain?: string | null;
};

const CACHE_KEY = "tenant_context_v1";

export async function fetchTenantContext(force = false): Promise<TenantContext | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!force) {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as TenantContext;
      } catch {
        window.sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }

  try {
    const context = await apiGet<TenantContext>("/auth/tenant-context");
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(context));
    return context;
  } catch {
    return null;
  }
}

export function saveTenantContext(context: TenantContext) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(context));
}

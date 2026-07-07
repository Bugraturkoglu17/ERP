import { useState, useEffect, useCallback, useMemo } from "react";
import { apiGet, apiPost } from "@/lib/api";

export type WorkType = "bakim" | "tadilat" | "yeni-yapim";

export interface StoreProcessDataState {
  projects: any[];
  activeJobs: any[];
  serviceForms: any[];
  progressPayments: any[];
  invoices: any[];
  icmaller: any[];
  loading: boolean;
  error: string | null;
}

function periodStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function useStoreProcessData(workType: WorkType) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const period = periodStr(year, month);

  const [state, setState] = useState<StoreProcessDataState>({
    projects: [],
    activeJobs: [],
    serviceForms: [],
    progressPayments: [],
    invoices: [],
    icmaller: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      if (workType === "bakim") {
        const [ps, fs, pays, invs, icms] = await Promise.all([
          apiGet<any[]>("/projects?limit=5000").catch(() => [] as any[]),
          apiGet<any[]>(`/service-forms?year=${year}&month=${month}`).catch(() => [] as any[]),
          apiGet<any[]>("/progress-payments?payment_type=bakim").catch(() => [] as any[]),
          apiGet<any[]>("/invoice-records?invoice_type=bakım_faturası").catch(() => [] as any[]),
          apiGet<any[]>("/invoice-records?invoice_type=bakım_icmali").catch(() => [] as any[]),
        ]);
        setState(prev => ({
          ...prev,
          projects: (Array.isArray(ps) ? ps : []).filter((p: any) => p.scope_codes?.includes("bakim")),
          serviceForms: Array.isArray(fs) ? fs : [],
          progressPayments: Array.isArray(pays) ? pays : [],
          invoices: Array.isArray(invs) ? invs : [],
          icmaller: Array.isArray(icms) ? icms : [],
          loading: false,
        }));
      } else {
        const [jobs, ps] = await Promise.all([
          apiGet<any[]>("/process/active-jobs").catch(() => [] as any[]),
          apiGet<any[]>("/projects?limit=5000").catch(() => [] as any[]),
        ]);
        const wt = workType === "yeni-yapim" ? "yeni_yapim" : workType;
        const all = (Array.isArray(jobs) ? jobs : []).filter((j: any) => j.work_type === wt);
        // Deduplicate by process_id
        const seen = new Set<string>();
        const deduped = all.filter((j: any) => {
          if (seen.has(j.process_id)) return false;
          seen.add(j.process_id);
          return true;
        });
        setState(prev => ({
          ...prev,
          activeJobs: deduped,
          projects: Array.isArray(ps) ? ps : [],
          loading: false,
        }));
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || "Veriler yüklenemedi.",
      }));
    }
  }, [workType, year, month]);

  useEffect(() => { load(); }, [load]);

  const createProcess = useCallback(async (projectId: string, payload: any) => {
    const result = await apiPost(`/process/projects/${projectId}/process`, payload);
    await load();
    return result;
  }, [load]);

  const createBulkProcess = useCallback(async (projectId: string, payload: any) => {
    const result = await apiPost(`/process/projects/${projectId}/process/bulk`, payload);
    await load();
    return result;
  }, [load]);

  // Derived sets for bakım status tracking
  const { sfSet, paySet, invSet, icmSet } = useMemo(() => {
    const sfSet = new Set(
      state.serviceForms
        .filter((f: any) => f.year === year && f.month === month)
        .map((f: any) => f.project_id)
    );
    const paySet = new Set(
      state.progressPayments
        .filter((p: any) => p.period === period)
        .map((p: any) => p.project_id)
    );
    const invSet = new Set(
      state.invoices
        .filter((i: any) => i.period === period)
        .map((i: any) => i.project_id)
    );
    const icmSet = new Set(
      state.icmaller
        .filter((i: any) => i.period === period)
        .map((i: any) => i.project_id)
    );
    return { sfSet, paySet, invSet, icmSet };
  }, [state.serviceForms, state.progressPayments, state.invoices, state.icmaller, year, month, period]);

  return {
    ...state,
    refetch: load,
    createProcess,
    createBulkProcess,
    year,
    month,
    period,
    // bakım tracking sets
    sfSet,
    paySet,
    invSet,
    icmSet,
  };
}

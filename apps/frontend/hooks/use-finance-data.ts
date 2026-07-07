import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";

export interface FinanceDataState {
  invoices: any[];
  expenses: any[];
  payments: any[];
  projects: any[];
  customers: any[];
  profitabilityData: any | null;
  loading: boolean;
  error: string | null;
}

export function useFinanceData() {
  const [state, setState] = useState<FinanceDataState>({
    invoices: [],
    expenses: [],
    payments: [],
    projects: [],
    customers: [],
    profitabilityData: null,
    loading: true,
    error: null,
  });

  const loadProfitability = useCallback(async (projectId: string) => {
    try {
      const data = await apiGet(`/finance/dashboard/profitability/${projectId}`);
      setState(prev => ({ ...prev, profitabilityData: data }));
    } catch {
      setState(prev => ({ ...prev, profitabilityData: null }));
    }
  }, []);

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [invs, exps, pays, projs, custs] = await Promise.all([
        apiGet("/finance/invoices").catch(() => []),
        apiGet("/finance/expenses").catch(() => []),
        apiGet("/finance/payments").catch(() => []),
        apiGet("/projects").catch(() => []),
        apiGet("/projects/customers").catch(() => []),
      ]);

      const projList = Array.isArray(projs) ? projs : [];
      setState(prev => ({
        ...prev,
        invoices: Array.isArray(invs) ? invs : [],
        expenses: Array.isArray(exps) ? exps : [],
        payments: Array.isArray(pays) ? pays : [],
        projects: projList,
        customers: Array.isArray(custs) ? custs : [],
        loading: false,
      }));

      // auto-load profitability for the first project
      if (projList.length > 0) {
        loadProfitability(projList[0].id);
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || "Finans verileri yüklenemedi.",
      }));
    }
  }, [loadProfitability]);

  useEffect(() => { load(); }, [load]);

  const createInvoice = useCallback(async (payload: any) => {
    const result = await apiPost("/finance/invoices", payload);
    await load();
    return result;
  }, [load]);

  const createExpense = useCallback(async (formData: FormData) => {
    const result = await apiPost("/finance/expenses", formData);
    await load();
    return result;
  }, [load]);

  const createPayment = useCallback(async (payload: any) => {
    const result = await apiPost("/finance/payments", payload);
    await load();
    return result;
  }, [load]);

  // Derived stats
  const totalRevenue = state.invoices
    .filter(i => i.direction !== "outgoing")
    .reduce((s: number, i: any) => s + (Number(i.grand_total) || 0), 0);

  const totalExpenses = state.expenses
    .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

  const totalPaid = state.payments
    .filter(p => p.direction === "incoming")
    .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

  const unpaidInvoices = state.invoices.filter(
    (i: any) => i.status !== "paid" && i.direction !== "outgoing"
  ).length;

  return {
    ...state,
    refetch: load,
    loadProfitability,
    createInvoice,
    createExpense,
    createPayment,
    // derived
    totalRevenue,
    totalExpenses,
    totalPaid,
    unpaidInvoices,
  };
}

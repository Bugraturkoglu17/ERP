import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface ProjectsDataState {
  projects: any[];
  customers: any[];
  regions: any[];
  branches: any[];
  usersList: any[];
  loading: boolean;
  error: string | null;
}

export function useProjectsData() {
  const [state, setState] = useState<ProjectsDataState>({
    projects: [],
    customers: [],
    regions: [],
    branches: [],
    usersList: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [projs, custs, usrs] = await Promise.all([
        apiGet("/projects").catch(() => []),
        apiGet("/projects/customers").catch(() => []),
        apiGet("/auth/users").catch(() => []),
      ]);
      setState(prev => ({
        ...prev,
        projects: Array.isArray(projs) ? projs : [],
        customers: Array.isArray(custs) ? custs : [],
        usersList: Array.isArray(usrs) ? usrs : [],
        loading: false,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || "Proje verileri yüklenemedi.",
      }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRegions = useCallback(async (customerId: string) => {
    if (!customerId) {
      setState(prev => ({ ...prev, regions: [], branches: [] }));
      return;
    }
    try {
      const data = await apiGet(`/projects/regions/${customerId}`);
      setState(prev => ({ ...prev, regions: Array.isArray(data) ? data : [], branches: [] }));
    } catch {
      setState(prev => ({ ...prev, regions: [], branches: [] }));
    }
  }, []);

  const loadBranches = useCallback(async (regionId: string) => {
    if (!regionId) {
      setState(prev => ({ ...prev, branches: [] }));
      return;
    }
    try {
      const data = await apiGet(`/projects/branches/${regionId}`);
      setState(prev => ({ ...prev, branches: Array.isArray(data) ? data : [] }));
    } catch {
      setState(prev => ({ ...prev, branches: [] }));
    }
  }, []);

  const getAssignments = useCallback(async (projectId: string) => {
    try {
      const data = await apiGet(`/projects/${projectId}/assignments`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  const createProject = useCallback(async (payload: any) => {
    const newProj = await apiPost("/projects", payload);
    await load();
    return newProj;
  }, [load]);

  const updateProject = useCallback(async (id: string, payload: any) => {
    const updated = await apiPatch(`/projects/${id}`, payload);
    await load();
    return updated;
  }, [load]);

  const deleteProject = useCallback(async (id: string) => {
    await apiDelete(`/projects/${id}`);
    await load();
  }, [load]);

  const assignUser = useCallback(async (projectId: string, payload: any) => {
    const result = await apiPost(`/projects/${projectId}/assignments`, payload);
    return result;
  }, []);

  const removeAssignment = useCallback(async (projectId: string, assignmentId: string) => {
    await apiDelete(`/projects/${projectId}/assignments/${assignmentId}`);
  }, []);

  return {
    ...state,
    refetch: load,
    loadRegions,
    loadBranches,
    getAssignments,
    createProject,
    updateProject,
    deleteProject,
    assignUser,
    removeAssignment,
  };
}

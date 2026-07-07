import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet('/workflows');
      setWorkflows(data as any[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return { workflows, loading, error, mutate: fetchWorkflows };
}

export function useWorkflow(id: string | null) {
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiGet(`/workflows/${id}`);
      setWorkflow(data as any);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchWorkflow();
    }
  }, [id, fetchWorkflow]);

  return { workflow, loading, error, mutate: fetchWorkflow };
}

export function useWorkflowTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet('/workflow-templates');
      setTemplates(data as any[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, mutate: fetchTemplates };
}

export function useWorkflowRuns(workflowId?: string, statusFilter?: string) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (workflowId) params.set('definition_id', workflowId);
      if (statusFilter) params.set('status', statusFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data: any = await apiGet(`/workflow-runs${query}`);
      setRuns(data as any[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch runs');
    } finally {
      setLoading(false);
    }
  }, [workflowId, statusFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, loading, error, mutate: fetchRuns };
}

export function useWorkflowStats() {
  const [stats, setStats] = useState<{
    running: number;
    failed: number;
    stalled: number;
    completedToday: number;
    avgDurationMs: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data: any[] = await apiGet('/workflow-runs') as any[];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let running = 0, failed = 0, stalled = 0, completedToday = 0;
        const durations: number[] = [];

        for (const r of data) {
          if (r.status === 'running') running++;
          else if (r.status === 'failed') failed++;
          else if (r.status === 'stalled') stalled++;
          else if (r.status === 'completed' && r.ended_at && new Date(r.ended_at) >= today) {
            completedToday++;
          }
          if (r.status === 'completed' && r.started_at && r.ended_at) {
            durations.push(new Date(r.ended_at).getTime() - new Date(r.started_at).getTime());
          }
        }

        setStats({
          running,
          failed,
          stalled,
          completedToday,
          avgDurationMs: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
        });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return { stats, loading };
}

export function useWorkflowRun(runId: string | null) {
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const data = await apiGet(`/workflow-runs/${runId}`);
      setRun(data as any);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch run detail');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (runId) fetchRun();
  }, [runId, fetchRun]);

  const retryRun = useCallback(async () => {
    if (!runId) return null;
    try {
      const data = await apiPost(`/workflow-runs/${runId}/retry`, {});
      await fetchRun();
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Retry failed');
    }
  }, [runId, fetchRun]);

  return { run, loading, error, mutate: fetchRun, retryRun };
}

export function useWorkflowActions() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet('/workflow-actions');
      setActions(data as any[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflow actions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return { actions, loading, error, mutate: fetchActions };
}

export function useWorkflowTriggers() {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTriggers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet('/workflow-triggers');
      setTriggers(data as any[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflow triggers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]);

  return { triggers, loading, error, mutate: fetchTriggers };
}

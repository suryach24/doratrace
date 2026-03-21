import { useState, useCallback } from 'react';
import type { DoraMetrics } from '../types/dora';

export type MetricsStatus = 'idle' | 'loading' | 'success' | 'error';

interface MetricsState {
  data: DoraMetrics | null;
  status: MetricsStatus;
  error: string | null;
}

export function useMetrics() {
  const [state, setState] = useState<MetricsState>({
    data: null, status: 'idle', error: null,
  });

  const fetchMetrics = useCallback(async (repo: string, days: number) => {
    setState({ data: null, status: 'loading', error: null });
    try {
      const res = await fetch(
        `/api/metrics?repo=${encodeURIComponent(repo)}&days=${days}`
      );
      const json = await res.json();
      if (!res.ok) {
        setState({ data: null, status: 'error', error: json.error ?? 'Unknown error' });
        return;
      }
      setState({ data: json, status: 'success', error: null });
    } catch {
      setState({ data: null, status: 'error', error: 'Network error. Is the server running?' });
    }
  }, []);

  return { ...state, fetch: fetchMetrics };
}

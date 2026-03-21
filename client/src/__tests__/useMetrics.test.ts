import { renderHook, act } from '@testing-library/react';
import { useMetrics } from '../hooks/useMetrics';

const mockMetrics = {
  repo: 'owner/repo', days: 90, fetchedAt: new Date().toISOString(), cached: false,
  deployFrequency: { value: 4, unit: 'deploys/week', tier: 'high' as const, dataPoints: 4 },
  leadTime: { value: 12, unit: 'hours', tier: 'high' as const, dataPoints: 4 },
  mttr: { value: 45, unit: 'minutes', tier: 'elite' as const, dataPoints: 1 },
  changeFailureRate: { value: 5, unit: '%', tier: 'elite' as const, dataPoints: 4 },
  timeline: [],
};

describe('useMetrics', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useMetrics());
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to loading then success', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockMetrics,
    });
    const { result } = renderHook(() => useMetrics());
    act(() => { result.current.fetch('owner/repo', 90); });
    expect(result.current.status).toBe('loading');
    await act(async () => {});
    expect(result.current.status).toBe('success');
    expect(result.current.data?.repo).toBe('owner/repo');
  });

  it('transitions to error on API error response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Repository not found' }),
    });
    const { result } = renderHook(() => useMetrics());
    await act(async () => { await result.current.fetch('owner/missing', 90); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Repository not found');
  });

  it('transitions to error on network failure', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useMetrics());
    await act(async () => { await result.current.fetch('owner/repo', 90); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/Network error/);
  });
});

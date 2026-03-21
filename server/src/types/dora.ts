export type PerformanceTier = 'elite' | 'high' | 'medium' | 'low' | 'na';

export interface MetricResult {
  value: number;
  unit: string;
  tier: PerformanceTier;
  dataPoints: number;
}

export interface DeployEvent {
  date: string;       // YYYY-MM-DD
  count: number;
  hasIncident: boolean;
}

export interface DoraMetrics {
  repo: string;
  days: number;
  fetchedAt: string;  // ISO timestamp
  cached: boolean;
  deployFrequency: MetricResult;
  leadTime: MetricResult;
  mttr: MetricResult;
  changeFailureRate: MetricResult;
  timeline: DeployEvent[];
}

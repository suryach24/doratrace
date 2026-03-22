import { MetricResult, PerformanceTier, DeployEvent } from '../types/dora';
import { Release, PullRequest, Issue, Commit, BranchCommit } from './githubService';

type CommitFetcher = (prNumber: number) => Promise<Commit[]>;

function tierDeployFreq(perWeek: number): PerformanceTier {
  if (perWeek >= 7) return 'elite';
  if (perWeek >= 1) return 'high';
  if (perWeek >= 0.25) return 'medium';
  return 'low';
}

function tierLeadTime(hours: number): PerformanceTier {
  if (hours < 1) return 'elite';
  if (hours < 24) return 'high';
  if (hours < 168) return 'medium';
  return 'low';
}

function tierMTTR(minutes: number): PerformanceTier {
  if (minutes < 60) return 'elite';
  if (minutes <= 1440) return 'high';
  if (minutes < 10080) return 'medium';
  return 'low';
}

function tierFailRate(pct: number): PerformanceTier {
  if (pct <= 5) return 'elite';
  if (pct <= 10) return 'high';
  if (pct <= 15) return 'medium';
  return 'low';
}

// --- Deploy Frequency ---
// Priority: Releases → Merged PRs → Direct commits (most common for personal projects)
export function calcDeployFrequency(
  releases: Release[],
  prs: PullRequest[],
  commits: BranchCommit[],
  days: number
): MetricResult {
  if (releases.length > 0) {
    const perWeek = (releases.length / days) * 7;
    return {
      value: Math.round(perWeek * 10) / 10,
      unit: 'releases/week',
      tier: tierDeployFreq(perWeek),
      dataPoints: releases.length,
    };
  }

  if (prs.length > 0) {
    const perWeek = (prs.length / days) * 7;
    return {
      value: Math.round(perWeek * 10) / 10,
      unit: 'PRs/week',
      tier: tierDeployFreq(perWeek),
      dataPoints: prs.length,
    };
  }

  // Last resort: commits to default branch
  if (commits.length === 0) {
    return { value: 0, unit: 'commits/week', tier: 'low', dataPoints: 0 };
  }
  const perWeek = (commits.length / days) * 7;
  return {
    value: Math.round(perWeek * 10) / 10,
    unit: 'commits/week',
    tier: tierDeployFreq(perWeek),
    dataPoints: commits.length,
  };
}

// --- Lead Time ---
export async function calcLeadTime(
  prs: PullRequest[],
  fetchCommits: CommitFetcher
): Promise<MetricResult> {
  if (prs.length === 0) {
    return { value: 0, unit: 'hours', tier: 'na', dataPoints: 0 };
  }

  const leadTimes: number[] = [];

  for (let i = 0; i < prs.length; i += 5) {
    const batch = prs.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async pr => {
        const commits = await fetchCommits(pr.number);
        if (commits.length === 0) return null;
        const firstDate = commits.map(c => c.commit.author.date).sort()[0];
        const ms = new Date(pr.merged_at).getTime() - new Date(firstDate).getTime();
        return ms / (1000 * 60 * 60);
      })
    );
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value !== null) leadTimes.push(r.value as number);
    });
  }

  if (leadTimes.length === 0) {
    return { value: 0, unit: 'hours', tier: 'na', dataPoints: 0 };
  }

  const avg = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
  return {
    value: Math.round(avg * 10) / 10,
    unit: 'hours',
    tier: tierLeadTime(avg),
    dataPoints: leadTimes.length,
  };
}

// --- MTTR ---
// Includes: labeled issues (incident/bug/hotfix/outage) + issues with fix keywords in title
export function calcMTTR(incidents: Issue[]): MetricResult {
  const resolved = incidents.filter(i => i.closed_at !== null);
  if (resolved.length === 0) {
    return { value: 0, unit: 'minutes', tier: 'na', dataPoints: 0 };
  }
  const mins = resolved.map(i => {
    const ms = new Date(i.closed_at!).getTime() - new Date(i.created_at).getTime();
    return ms / (1000 * 60);
  });
  const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
  return {
    value: Math.round(avg),
    unit: 'minutes',
    tier: tierMTTR(avg),
    dataPoints: resolved.length,
  };
}

// --- Change Failure Rate ---
// Uses incidents (labeled issues + fix/revert PRs) as failures, merged PRs as total deployments
export function calcChangeFailureRate(
  incidents: Issue[],
  releases: Release[],
  prs: PullRequest[]
): MetricResult {
  // Total deployments = releases if available, else merged PRs
  const total = releases.length || prs.length;
  if (total === 0) {
    return { value: 0, unit: '%', tier: 'na', dataPoints: 0 };
  }
  const pct = (incidents.length / total) * 100;
  return {
    value: Math.round(pct * 10) / 10,
    unit: '%',
    tier: tierFailRate(pct),
    dataPoints: total,
  };
}

// --- Timeline ---
// Uses releases → PRs → commits as fallback for deployment events
export function buildTimeline(
  releases: Release[],
  prs: PullRequest[],
  commits: BranchCommit[],
  incidents: Issue[],
  days: number
): DeployEvent[] {
  const today = new Date();
  const map = new Map<string, { count: number; hasIncident: boolean }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().split('T')[0], { count: 0, hasIncident: false });
  }

  // Use releases → PRs → commits
  const deployEvents = releases.length > 0
    ? releases.map(r => r.published_at)
    : prs.length > 0
      ? prs.map(pr => pr.merged_at)
      : commits.map(c => c.date);

  deployEvents.forEach(dateStr => {
    const key = dateStr.split('T')[0];
    const entry = map.get(key);
    if (entry) entry.count++;
  });

  incidents.forEach(i => {
    const key = i.created_at.split('T')[0];
    const entry = map.get(key);
    if (entry) entry.hasIncident = true;
  });

  return Array.from(map.entries()).map(([date, data]) => ({ date, ...data }));
}

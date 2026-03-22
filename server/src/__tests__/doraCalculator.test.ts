import {
  calcDeployFrequency,
  calcLeadTime,
  calcMTTR,
  calcChangeFailureRate,
  buildTimeline,
} from '../services/doraCalculator';
import { Release, PullRequest, Issue, Commit } from '../services/githubService';

// --- Fixtures ---
const makeRelease = (daysAgo: number): Release => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { published_at: d.toISOString(), tag_name: `v1.${daysAgo}`, name: '' };
};

const makePR = (mergedDaysAgo: number): PullRequest => {
  const merged = new Date();
  merged.setDate(merged.getDate() - mergedDaysAgo);
  return {
    number: mergedDaysAgo,
    merged_at: merged.toISOString(),
    title: 'feat: something',
    head: { ref: 'feature/something' },
  };
};

const makeCommit = (daysAgo: number): Commit => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { commit: { author: { date: d.toISOString() } } };
};

const makeIssue = (createdDaysAgo: number, closedDaysAgo: number | null): Issue => {
  const created = new Date();
  created.setDate(created.getDate() - createdDaysAgo);
  const closed = closedDaysAgo !== null ? new Date() : null;
  if (closed) closed.setDate(closed.getDate() - closedDaysAgo!);
  return {
    number: createdDaysAgo,
    created_at: created.toISOString(),
    closed_at: closed ? closed.toISOString() : null,
    title: 'incident: something broke',
    labels: [{ name: 'incident' }],
  };
};

// --- Deploy Frequency ---
describe('calcDeployFrequency', () => {
  it('returns low tier with 0 dataPoints for empty releases and PRs', () => {
    const result = calcDeployFrequency([], [], 90);
    expect(result.tier).toBe('low');
    expect(result.dataPoints).toBe(0);
  });

  it('calculates elite for >1 deploy/day via releases', () => {
    const releases = Array.from({ length: 100 }, (_, i) => makeRelease(i));
    const result = calcDeployFrequency(releases, [], 90);
    expect(result.tier).toBe('elite');
    expect(result.value).toBeGreaterThan(7);
  });

  it('calculates correct releases/week', () => {
    const releases = Array.from({ length: 9 }, (_, i) => makeRelease(i * 10));
    const result = calcDeployFrequency(releases, [], 90);
    expect(result.unit).toBe('releases/week');
    expect(result.tier).toBe('medium');
  });

  it('falls back to PRs when no releases', () => {
    const prs = Array.from({ length: 9 }, (_, i) => makePR(i * 10));
    const result = calcDeployFrequency([], prs, 90);
    expect(result.unit).toBe('PRs/week');
    expect(result.tier).toBe('medium');
  });
});

// --- Lead Time ---
describe('calcLeadTime', () => {
  it('returns na tier for empty PRs', async () => {
    const result = await calcLeadTime([], async () => []);
    expect(result.tier).toBe('na');
    expect(result.dataPoints).toBe(0);
  });

  it('calculates lead time in hours', async () => {
    const pr = makePR(1);
    const fetchCommits = async () => [makeCommit(3)];
    const result = await calcLeadTime([pr], fetchCommits);
    expect(result.unit).toBe('hours');
    expect(result.value).toBeCloseTo(48, 0);
    expect(result.tier).toBe('medium'); // 48 hrs > 24 hrs threshold = medium
  });

  it('assigns elite tier for sub-1-hour lead time', async () => {
    const pr = makePR(0);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const fetchCommits = async () => [{ commit: { author: { date: thirtyMinsAgo } } }];
    const result = await calcLeadTime([pr], fetchCommits);
    expect(result.tier).toBe('elite');
  });
});

// --- MTTR ---
describe('calcMTTR', () => {
  it('returns na for no incidents', () => {
    const result = calcMTTR([]);
    expect(result.tier).toBe('na');
  });

  it('returns na for incidents with no closed_at', () => {
    const result = calcMTTR([makeIssue(2, null)]);
    expect(result.tier).toBe('na');
  });

  it('calculates MTTR in minutes', () => {
    const result = calcMTTR([makeIssue(2, 1)]);
    expect(result.unit).toBe('minutes');
    expect(result.value).toBeCloseTo(1440, -1);
    expect(result.tier).toBe('high');
  });
});

// --- Change Failure Rate ---
describe('calcChangeFailureRate', () => {
  it('returns na when no releases and no PRs', () => {
    const result = calcChangeFailureRate([], [], []);
    expect(result.tier).toBe('na');
  });

  it('calculates percentage based on releases', () => {
    const releases = Array.from({ length: 10 }, (_, i) => makeRelease(i));
    const incidents = [makeIssue(2, 1)];
    const result = calcChangeFailureRate(incidents, releases, []);
    expect(result.value).toBe(10);
    expect(result.unit).toBe('%');
    expect(result.tier).toBe('high');
  });

  it('falls back to PR count when no releases', () => {
    const prs = Array.from({ length: 20 }, (_, i) => makePR(i));
    const incidents = [makeIssue(2, 1), makeIssue(5, 4)];
    const result = calcChangeFailureRate(incidents, [], prs);
    expect(result.value).toBe(10);
  });
});

// --- Timeline ---
describe('buildTimeline', () => {
  it('returns one entry per day', () => {
    const result = buildTimeline([], [], [], 30);
    expect(result).toHaveLength(30);
  });

  it('counts releases on the correct day', () => {
    const releases = [makeRelease(0)];
    const result = buildTimeline(releases, [], [], 7);
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = result.find(e => e.date === today);
    expect(todayEntry?.count).toBe(1);
  });

  it('uses PR merges when no releases', () => {
    const prs = [makePR(0)];
    const result = buildTimeline([], prs, [], 7);
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = result.find(e => e.date === today);
    expect(todayEntry?.count).toBe(1);
  });

  it('marks incident days', () => {
    const incidents = [makeIssue(1, 0)];
    const result = buildTimeline([], [], incidents, 7);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const entry = result.find(e => e.date === yesterday);
    expect(entry?.hasIncident).toBe(true);
  });
});

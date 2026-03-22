const BASE_URL = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'doratrace/1.0',
  };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  return headers;
}

async function githubFetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const err: any = new Error(`GitHub API ${res.status}: ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function sinceISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export interface Release {
  published_at: string;
  tag_name: string;
  name: string;
}

export interface PullRequest {
  number: number;
  merged_at: string;
  title: string;
  head: { ref: string };
}

export interface Commit {
  commit: { author: { date: string } };
}

export interface Issue {
  number: number;
  created_at: string;
  closed_at: string | null;
  title: string;
  labels: { name: string }[];
  pull_request?: object;
}

export async function fetchReleases(repo: string, days: number): Promise<Release[]> {
  const since = sinceISO(days);
  const data: Release[] = await githubFetch(
    `${BASE_URL}/repos/${repo}/releases?per_page=100`
  );
  return data.filter(r => r.published_at >= since);
}

export async function fetchMergedPRs(repo: string, days: number): Promise<PullRequest[]> {
  const since = sinceISO(days);
  const data: any[] = await githubFetch(
    `${BASE_URL}/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`
  );
  const inWindow = data
    .filter(pr => pr.merged_at && pr.merged_at >= since)
    .slice(0, 50);

  // If no PRs in the selected window, fall back to all-time recent PRs for lead time calculation
  if (inWindow.length === 0) {
    return data
      .filter(pr => pr.merged_at)
      .slice(0, 20)
      .map(pr => ({
        number: pr.number,
        merged_at: pr.merged_at,
        title: pr.title,
        head: { ref: pr.head.ref },
      }));
  }

  return inWindow.map(pr => ({
    number: pr.number,
    merged_at: pr.merged_at,
    title: pr.title,
    head: { ref: pr.head.ref },
  }));
}

// Fetch ALL closed issues (no label filter) — used as MTTR fallback
export async function fetchAllClosedIssues(repo: string, days: number): Promise<Issue[]> {
  const since = sinceISO(days);
  const data: any[] = await githubFetch(
    `${BASE_URL}/repos/${repo}/issues?state=closed&since=${since}&per_page=100`
  );
  // Exclude pull requests from the issues endpoint
  return data
    .filter(item => !item.pull_request && item.closed_at)
    .map(item => ({
      number: item.number,
      created_at: item.created_at,
      closed_at: item.closed_at,
      title: item.title,
      labels: item.labels,
    }));
}

export interface BranchCommit {
  date: string; // ISO string
}

export async function fetchDefaultBranchCommits(repo: string, days: number): Promise<BranchCommit[]> {
  const since = sinceISO(days);
  const data: any[] = await githubFetch(
    `${BASE_URL}/repos/${repo}/commits?since=${since}&per_page=100`
  );
  return data.map(c => ({ date: c.commit.author.date }));
}

export async function fetchCommitsForPR(repo: string, prNumber: number): Promise<Commit[]> {
  return githubFetch(
    `${BASE_URL}/repos/${repo}/pulls/${prNumber}/commits?per_page=100`
  );
}

export async function fetchIncidentIssues(repo: string, days: number): Promise<Issue[]> {
  const since = sinceISO(days);
  const INCIDENT_LABELS = ['incident', 'hotfix', 'bug', 'outage'];
  const data: any[] = await githubFetch(
    `${BASE_URL}/repos/${repo}/issues?state=closed&since=${since}&per_page=100`
  );
  return data.filter(item => {
    if (item.pull_request) {
      // Catch revert PRs, hotfixes, rollbacks, and fix PRs
      return /revert|hotfix|rollback|fix:|bugfix|bug fix/i.test(item.title);
    }
    // Catch labeled issues
    const labelNames = item.labels.map((l: any) => l.name.toLowerCase());
    if (INCIDENT_LABELS.some(il => labelNames.includes(il))) return true;
    // Also catch issues with incident/bug keywords in title (for repos without consistent labels)
    return /\bbug\b|\bincident\b|\bfailure\b|\bbroken\b|\bcrash\b|\bregression\b/i.test(item.title);
  });
}

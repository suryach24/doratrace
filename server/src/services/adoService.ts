/**
 * Azure DevOps REST API service
 * Auth: Personal Access Token stored in ADO_TOKEN env var
 * API version: 7.1
 */

const ADO_TOKEN = process.env.ADO_TOKEN;
const API_VERSION = '7.1';

function getAdoHeaders(): Record<string, string> {
  if (!ADO_TOKEN) throw Object.assign(new Error('ADO_TOKEN not configured on server'), { status: 401 });
  const encoded = Buffer.from(`:${ADO_TOKEN}`).toString('base64');
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

async function adoFetch(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...opts, headers: getAdoHeaders() });
  if (!res.ok) {
    const err: any = new Error(`ADO API ${res.status}: ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function sinceDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  // ADO expects MM/DD/YYYY format for searchCriteria.fromDate
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// ---- Types ----

export interface AdoCommit {
  author: { date: string };
}

export interface AdoPullRequest {
  pullRequestId: number;
  title: string;
  closedDate: string;
  creationDate: string;
  status: string;
}

export interface AdoWorkItem {
  id: number;
  fields: {
    'System.CreatedDate': string;
    'Microsoft.VSTS.Common.ResolvedDate'?: string;
    'System.State': string;
    'System.Title': string;
  };
}

// ---- Fetch functions ----

export async function fetchAdoCommits(
  org: string,
  project: string,
  repo: string,
  days: number
): Promise<AdoCommit[]> {
  const from = sinceDate(days);
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/commits?searchCriteria.fromDate=${encodeURIComponent(from)}&$top=100&api-version=${API_VERSION}`;
  const data = await adoFetch(url);
  return (data.value ?? []).map((c: any) => ({ author: { date: c.author.date } }));
}

export async function fetchAdoPullRequests(
  org: string,
  project: string,
  repo: string,
  days: number
): Promise<AdoPullRequest[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/pullrequests?searchCriteria.status=completed&$top=100&api-version=${API_VERSION}`;
  const data = await adoFetch(url);
  const prs: AdoPullRequest[] = (data.value ?? []).map((pr: any) => ({
    pullRequestId: pr.pullRequestId,
    title: pr.title,
    closedDate: pr.closedDate,
    creationDate: pr.creationDate,
    status: pr.status,
  }));
  // Filter to window
  return prs.filter(pr => pr.closedDate && new Date(pr.closedDate) >= since);
}

export async function fetchAdoBugWorkItems(
  org: string,
  project: string,
  days: number
): Promise<AdoWorkItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  // WIQL query for closed bugs and incidents
  const wiqlUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=${API_VERSION}`;
  const query = {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' AND [System.WorkItemType] IN ('Bug', 'Issue') AND [System.State] IN ('Resolved', 'Closed', 'Done') AND [System.ChangedDate] >= '${sinceStr}' ORDER BY [System.ChangedDate] DESC`
  };

  const wiqlResult = await adoFetch(wiqlUrl, { method: 'POST', body: JSON.stringify(query) });
  const ids: number[] = (wiqlResult.workItems ?? []).slice(0, 50).map((w: any) => w.id);
  if (ids.length === 0) return [];

  // Batch fetch work item details
  const detailUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.Id,System.Title,System.CreatedDate,System.State,Microsoft.VSTS.Common.ResolvedDate&api-version=${API_VERSION}`;
  const details = await adoFetch(detailUrl);
  return (details.value ?? []).map((w: any) => ({
    id: w.id,
    fields: w.fields,
  }));
}

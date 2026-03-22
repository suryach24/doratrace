import { Router, Request, Response } from 'express';
import {
  fetchReleases,
  fetchMergedPRs,
  fetchCommitsForPR,
  fetchIncidentIssues,
  fetchDefaultBranchCommits,
} from '../services/githubService';
import {
  fetchAdoCommits,
  fetchAdoPullRequests,
  fetchAdoBugWorkItems,
} from '../services/adoService';
import {
  calcDeployFrequency,
  calcLeadTime,
  calcMTTR,
  calcChangeFailureRate,
  buildTimeline,
} from '../services/doraCalculator';
import { cache } from '../services/cache';
import { parseRepoUrl } from '../services/urlParser';
import { DoraMetrics } from '../types/dora';

const router = Router();
const VALID_DAYS = [30, 60, 90];

router.get('/metrics', async (req: Request, res: Response) => {
  const { repo, days: daysStr } = req.query;

  if (!repo || typeof repo !== 'string' || repo.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide a full repository URL.' });
  }

  const parsed = parseRepoUrl(repo.trim());
  if (!parsed) {
    return res.status(400).json({
      error: 'Unrecognised URL format. Use https://github.com/owner/repo or https://dev.azure.com/org/project/_git/repo',
    });
  }

  const days = daysStr !== undefined ? parseInt(daysStr as string) : 90;
  if (!VALID_DAYS.includes(days)) {
    return res.status(400).json({ error: 'days must be 30, 60, or 90' });
  }

  const cacheKey = `${parsed.displayName}:${parsed.provider}:${days}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    let deployFrequency, leadTime, mttr, changeFailureRate, timeline;

    if (parsed.provider === 'github') {
      const { owner, repo: repoName } = parsed;
      const ghRepo = `${owner}/${repoName}`;

      const [releases, prs, incidents, branchCommits] = await Promise.all([
        fetchReleases(ghRepo, days),
        fetchMergedPRs(ghRepo, days),
        fetchIncidentIssues(ghRepo, days),
        fetchDefaultBranchCommits(ghRepo, days),
      ]);

      deployFrequency = calcDeployFrequency(releases, prs, branchCommits, days);
      leadTime = await calcLeadTime(prs, prNum => fetchCommitsForPR(ghRepo, prNum));
      mttr = calcMTTR(incidents);
      changeFailureRate = calcChangeFailureRate(incidents, releases, prs);
      timeline = buildTimeline(releases, prs, branchCommits, incidents, days);

    } else {
      // Azure DevOps
      const { org, project, repoName } = parsed;

      const [adoCommits, adoPRs, adoBugs] = await Promise.all([
        fetchAdoCommits(org!, project!, repoName!, days),
        fetchAdoPullRequests(org!, project!, repoName!, days),
        fetchAdoBugWorkItems(org!, project!, days),
      ]);

      // Map ADO types to the shared calculator format
      const branchCommits = adoCommits.map(c => ({ date: c.author.date }));
      const prs = adoPRs.map(pr => ({
        number: pr.pullRequestId,
        merged_at: pr.closedDate,
        title: pr.title,
        head: { ref: '' },
      }));
      const incidents = adoBugs.map(wi => ({
        number: wi.id,
        created_at: wi.fields['System.CreatedDate'],
        closed_at: wi.fields['Microsoft.VSTS.Common.ResolvedDate'] ?? null,
        title: wi.fields['System.Title'],
        labels: [],
      }));

      deployFrequency = calcDeployFrequency([], prs, branchCommits, days);
      leadTime = await calcLeadTime(prs, async () => []); // ADO lead time from PR creation→close
      mttr = calcMTTR(incidents);
      changeFailureRate = calcChangeFailureRate(incidents, [], prs);
      timeline = buildTimeline([], prs, branchCommits, incidents, days);
    }

    const result: DoraMetrics = {
      repo: parsed.displayName,
      days,
      fetchedAt: new Date().toISOString(),
      cached: false,
      deployFrequency,
      leadTime,
      mttr,
      changeFailureRate,
      timeline,
    };

    cache.set(cacheKey, result);
    return res.json(result);

  } catch (err: any) {
    if (err.status === 401) {
      return res.status(401).json({ error: 'Azure DevOps token not configured or invalid. Set ADO_TOKEN on the server.' });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: 'Repository not found. Check the URL and ensure it is accessible.' });
    }
    if (err.status === 403 || err.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
    }
    console.error('metrics route error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch metrics. ' + err.message });
  }
});

export default router;

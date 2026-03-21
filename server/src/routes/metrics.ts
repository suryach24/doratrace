import { Router, Request, Response } from 'express';
import {
  fetchReleases,
  fetchMergedPRs,
  fetchCommitsForPR,
  fetchIncidentIssues,
} from '../services/githubService';
import {
  calcDeployFrequency,
  calcLeadTime,
  calcMTTR,
  calcChangeFailureRate,
  buildTimeline,
} from '../services/doraCalculator';
import { cache } from '../services/cache';
import { DoraMetrics } from '../types/dora';

const router = Router();

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const VALID_DAYS = [30, 60, 90];

router.get('/metrics', async (req: Request, res: Response) => {
  const { repo, days: daysStr } = req.query;

  if (!repo || typeof repo !== 'string' || !REPO_PATTERN.test(repo)) {
    return res.status(400).json({ error: 'Invalid repo format. Use owner/repo' });
  }

  const days = daysStr !== undefined ? parseInt(daysStr as string) : 90;
  if (!VALID_DAYS.includes(days)) {
    return res.status(400).json({ error: `days must be 30, 60, or 90` });
  }

  const cacheKey = `${repo}:${days}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const [releases, prs, incidents] = await Promise.all([
      fetchReleases(repo, days),
      fetchMergedPRs(repo, days),
      fetchIncidentIssues(repo, days),
    ]);

    const deployFrequency = calcDeployFrequency(releases, days);
    const leadTime = await calcLeadTime(prs, prNum => fetchCommitsForPR(repo, prNum));
    const mttr = calcMTTR(incidents);
    const changeFailureRate = calcChangeFailureRate(incidents, releases, prs);
    const timeline = buildTimeline(releases, incidents, days);

    const result: DoraMetrics = {
      repo,
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
    if (err.status === 404) {
      return res.status(404).json({ error: 'Repository not found or not public' });
    }
    if (err.status === 403 || err.status === 429) {
      return res.status(429).json({
        error: 'GitHub rate limit exceeded. Set GITHUB_TOKEN env var to increase the limit to 5000 req/hr.',
      });
    }
    console.error('metrics route error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch metrics from GitHub' });
  }
});

export default router;

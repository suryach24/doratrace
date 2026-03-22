import request from 'supertest';
import express from 'express';
import metricsRouter from '../routes/metrics';
import * as githubService from '../services/githubService';
import { cache } from '../services/cache';

jest.mock('../services/githubService');

const app = express();
app.use(express.json());
app.use('/api', metricsRouter);

const mockMetrics = jest.mocked(githubService);

describe('GET /api/metrics', () => {
  beforeEach(() => {
    cache.clear();
    jest.clearAllMocks();
    mockMetrics.fetchReleases.mockResolvedValue([]);
    mockMetrics.fetchMergedPRs.mockResolvedValue([]);
    mockMetrics.fetchIncidentIssues.mockResolvedValue([]);
    mockMetrics.fetchCommitsForPR.mockResolvedValue([]);
    mockMetrics.fetchDefaultBranchCommits.mockResolvedValue([]);
  });

  it('returns 400 for missing repo', async () => {
    const res = await request(app).get('/api/metrics?days=90');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid repo format/);
  });

  it('returns 400 for malformed repo', async () => {
    const res = await request(app).get('/api/metrics?repo=notarepo&days=90');
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid days value', async () => {
    const res = await request(app).get('/api/metrics?repo=owner/repo&days=45');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/days must be/);
  });

  it('returns 200 with valid repo and days', async () => {
    const res = await request(app).get('/api/metrics?repo=owner/repo&days=90');
    expect(res.status).toBe(200);
    expect(res.body.repo).toBe('owner/repo');
    expect(res.body.days).toBe(90);
    expect(res.body).toHaveProperty('deployFrequency');
    expect(res.body).toHaveProperty('leadTime');
    expect(res.body).toHaveProperty('mttr');
    expect(res.body).toHaveProperty('changeFailureRate');
    expect(res.body).toHaveProperty('timeline');
    expect(res.body.cached).toBe(false);
  });

  it('returns cached: true on second identical request', async () => {
    await request(app).get('/api/metrics?repo=owner/repo&days=90');
    const res = await request(app).get('/api/metrics?repo=owner/repo&days=90');
    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(mockMetrics.fetchReleases).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when GitHub returns 404', async () => {
    const err: any = new Error('Not found');
    err.status = 404;
    mockMetrics.fetchReleases.mockRejectedValue(err);
    const res = await request(app).get('/api/metrics?repo=owner/nonexistent&days=90');
    expect(res.status).toBe(404);
  });

  it('defaults days to 90 when omitted', async () => {
    const res = await request(app).get('/api/metrics?repo=owner/repo');
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(90);
  });
});

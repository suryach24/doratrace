# doratrace

> DORA metrics dashboard for any public GitHub repository.

Live at: [doratrace.surya-kukunuri.com](https://doratrace.surya-kukunuri.com)

## What it measures

The four DORA (DevOps Research and Assessment) metrics from the [2023 State of DevOps Report](https://dora.dev):

| Metric | What it tells you |
|--------|------------------|
| **Deployment Frequency** | How often you ship |
| **Lead Time for Changes** | How fast code gets to production |
| **MTTR** | How quickly you recover from incidents |
| **Change Failure Rate** | How often deployments cause problems |

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Node 18 + Express + TypeScript
- **Data source:** GitHub REST API v3 (public repos, no auth required)
- **Hosting:** Hostinger (Node.js app + subdomain)

## Running locally

```bash
# Clone
git clone https://github.com/suryach24/doratrace.git
cd doratrace

# Set up env
cp .env.example .env
# Edit .env — add your GITHUB_TOKEN for 5000 req/hr (vs 60 unauthenticated)
# Get a free token: github.com → Settings → Developer Settings → PATs → public_repo scope

# Install and run
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
npm run dev  # starts both server (port 3001) and client (port 5173)
```

## How to get your GitHub token

1. Go to github.com → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate new token → select `public_repo` scope only
3. Copy and add to your `.env` as `GITHUB_TOKEN=ghp_...`

## Architecture

Single Express app serving both API and React frontend:
- `GET /api/metrics?repo=owner/repo&days=90` — returns DORA metrics JSON
- All other routes — serve compiled React app
- In-memory cache (1-hour TTL) prevents redundant GitHub API calls

Built by [Surya Chandra Kukunuri](https://surya-kukunuri.com)

export type Provider = 'github' | 'ado';

export interface ParsedRepo {
  provider: Provider;
  displayName: string;
  // GitHub specific
  owner?: string;
  repo?: string;
  // ADO specific
  org?: string;
  project?: string;
  repoName?: string;
}

/**
 * Parses a full repository URL into its components.
 * Supports:
 *   GitHub:  https://github.com/owner/repo
 *   ADO:     https://dev.azure.com/org/project/_git/repo
 */
export function parseRepoUrl(input: string): ParsedRepo | null {
  const url = input.trim().replace(/\/$/, '');

  // GitHub: https://github.com/owner/repo  or  github.com/owner/repo
  const githubMatch = url.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i);
  if (githubMatch) {
    const owner = githubMatch[1];
    const repo = githubMatch[2].replace(/\.git$/, '');
    return { provider: 'github', owner, repo, displayName: `${owner}/${repo}` };
  }

  // ADO: https://dev.azure.com/org/project/_git/repo
  const adoMatch = url.match(/dev\.azure\.com\/([^\/\s]+)\/([^\/\s]+)\/_git\/([^\/\s#?]+)/i);
  if (adoMatch) {
    const org = adoMatch[1];
    const project = decodeURIComponent(adoMatch[2]);
    const repoName = adoMatch[3];
    return { provider: 'ado', org, project, repoName, displayName: `${project}/${repoName}` };
  }

  return null;
}

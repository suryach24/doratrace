import { useState } from 'react';
import './RepoInput.css';

const DAY_OPTIONS = [30, 60, 90] as const;
type DayOption = typeof DAY_OPTIONS[number];

type Provider = 'github' | 'ado' | null;

function detectProvider(url: string): Provider {
  if (/github\.com/i.test(url)) return 'github';
  if (/dev\.azure\.com/i.test(url)) return 'ado';
  return null;
}

function isValidUrl(url: string): boolean {
  return (
    /github\.com\/[^\/\s]+\/[^\/\s]+/i.test(url) ||
    /dev\.azure\.com\/[^\/\s]+\/[^\/\s]+\/_git\/[^\/\s]+/i.test(url)
  );
}

interface Props {
  onSubmit: (repo: string, days: number) => void;
  isLoading: boolean;
}

export function RepoInput({ onSubmit, isLoading }: Props) {
  const [url, setUrl] = useState('https://github.com/suryach24/portfolio');
  const [days, setDays] = useState<DayOption>(90);
  const [error, setError] = useState('');

  const provider = detectProvider(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(url.trim())) {
      setError(
        'Enter a full URL — e.g. https://github.com/owner/repo or https://dev.azure.com/org/project/_git/repo'
      );
      return;
    }
    setError('');
    onSubmit(url.trim(), days);
  };

  return (
    <div className="repo-input-section">
      <div className="repo-input-prompt">$ doratrace --url</div>
      <h1 className="repo-input-title">Analyse any repository</h1>
      <p className="repo-input-subtitle">
        Paste a full GitHub or Azure DevOps repo URL to calculate DORA metrics.
      </p>

      {provider && (
        <div className="provider-indicator">
          <span className={`provider-badge ${provider}`}>
            {provider === 'github' ? '⬡ GitHub' : '◈ Azure DevOps'}
          </span>
          <span className="provider-detected">detected</span>
        </div>
      )}

      <form className="repo-input-form" onSubmit={handleSubmit}>
        <div className="repo-input-field-wrap">
          <input
            className="repo-input-field"
            type="text"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={e => setUrl(e.target.value)}
            aria-label="Repository URL"
          />
        </div>
        <button className="analyse-btn" type="submit" disabled={isLoading}>
          {isLoading ? 'ANALYSING...' : 'ANALYSE →'}
        </button>
      </form>

      {error && <div className="repo-input-error">⚠ {error}</div>}

      <div className="days-tabs" role="group" aria-label="Time range">
        {DAY_OPTIONS.map(d => (
          <button
            key={d}
            className={`days-tab${days === d ? ' active' : ''}`}
            type="button"
            onClick={() => setDays(d)}
          >
            {d}d
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import './RepoInput.css';

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const DAY_OPTIONS = [30, 60, 90] as const;
type DayOption = typeof DAY_OPTIONS[number];

interface Props {
  onSubmit: (repo: string, days: number) => void;
  isLoading: boolean;
}

export function RepoInput({ onSubmit, isLoading }: Props) {
  const [repo, setRepo] = useState('suryach24/portfolio');
  const [days, setDays] = useState<DayOption>(90);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!REPO_PATTERN.test(repo.trim())) {
      setError('Use owner/repo format — e.g. suryach24/portfolio');
      return;
    }
    setError('');
    onSubmit(repo.trim(), days);
  };

  return (
    <div className="repo-input-section">
      <div className="repo-input-prompt">$ doratrace --repo</div>
      <h1 className="repo-input-title">Analyse any GitHub repository</h1>
      <p className="repo-input-subtitle">Real-time DORA metrics from your commit, PR and release history.</p>
      <form className="repo-input-form" onSubmit={handleSubmit}>
        <input
          className="repo-input-field" type="text" placeholder="owner/repo"
          value={repo} onChange={e => setRepo(e.target.value)} aria-label="GitHub repository"
        />
        <button className="analyse-btn" type="submit" disabled={isLoading}>
          {isLoading ? 'ANALYSING...' : 'ANALYSE \u2192'}
        </button>
      </form>
      {error && <div className="repo-input-error">&#9888; {error}</div>}
      <div className="days-tabs" role="group" aria-label="Time range">
        {DAY_OPTIONS.map(d => (
          <span key={d} className={`days-tab${days === d ? ' active' : ''}`}
            role="tab" aria-selected={days === d} onClick={() => setDays(d)}>{d}d</span>
        ))}
      </div>
    </div>
  );
}

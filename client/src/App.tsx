import { useState, useEffect } from 'react';
import { useMetrics } from './hooks/useMetrics';
import { RepoInput } from './components/RepoInput';
import { StatusBar } from './components/StatusBar';
import { MetricCard } from './components/MetricCard';
import { DeploymentTimeline } from './components/DeploymentTimeline';
import { MethodologyNote } from './components/MethodologyNote';
import './App.css';

const METRICS_CONFIG = [
  { key: 'deployFrequency' as const, label: 'DEPLOY_FREQ', accent: 'var(--green)', gradient: 'var(--green-mid)' },
  { key: 'leadTime' as const, label: 'LEAD_TIME', accent: 'var(--cyan)', gradient: 'var(--cyan-mid)' },
  { key: 'mttr' as const, label: 'MTTR', accent: 'var(--purple)', gradient: 'var(--purple-mid)' },
  { key: 'changeFailureRate' as const, label: 'FAIL_RATE', accent: 'var(--amber)', gradient: 'var(--amber-mid)' },
];

function App() {
  const { data, status, error, fetch } = useMetrics();

  // Persist theme in localStorage
  const [isLight, setIsLight] = useState<boolean>(() => {
    return localStorage.getItem('doratrace-theme') === 'light';
  });

  useEffect(() => {
    localStorage.setItem('doratrace-theme', isLight ? 'light' : 'dark');
  }, [isLight]);

  return (
    <div className={`app${isLight ? ' light' : ''}`}>
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <span className="logo-dora">dora</span>
          <span className="logo-trace">trace</span>
        </a>
        <div className="navbar-meta">
          <span className="navbar-version">v1.0.0</span>
          <button
            className="theme-toggle"
            onClick={() => setIsLight(v => !v)}
            aria-label="Toggle theme"
          >
            {isLight ? '🌙 Dark' : '☀ Light'}
          </button>
          <a href="https://github.com/suryach24/doratrace" target="_blank" rel="noopener noreferrer" className="navbar-github">
            GitHub ↗
          </a>
        </div>
      </nav>

      <main className="app-main">
        <RepoInput onSubmit={(repo, days) => fetch(repo, days)} isLoading={status === 'loading'} />
        <StatusBar repo={data?.repo ?? ''} isVisible={status === 'loading'} />

        {status === 'error' && <div className="error-banner">⚠ {error}</div>}

        {status === 'success' && data && (
          <>
            <div className="metrics-grid">
              {METRICS_CONFIG.map(cfg => (
                <MetricCard
                  key={cfg.key}
                  metric={data[cfg.key]}
                  label={cfg.label}
                  accentColor={cfg.accent}
                  gradientColor={cfg.gradient}
                />
              ))}
            </div>
            <div className="bottom-panels">
              <DeploymentTimeline events={data.timeline} days={data.days} />
              <MethodologyNote />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;

import { useState } from 'react';
import './MethodologyNote.css';

export function MethodologyNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="methodology">
      <button className="methodology-toggle" onClick={() => setOpen(o => !o)}>
        <span className="methodology-toggle-label">How are these metrics calculated?</span>
        <span className={`methodology-arrow${open ? ' open' : ''}`}>&#9660;</span>
      </button>
      {open && (
        <div className="methodology-body">
          <p><strong>Deployment Frequency</strong> &mdash; counted from GitHub Releases in the selected window. If no releases exist, merged pull requests to the default branch are used as a proxy.</p>
          <p><strong>Lead Time for Changes</strong> &mdash; for each merged PR, the time between the earliest commit in that PR and when the PR was merged. Averaged across the most recent 50 PRs.</p>
          <p><strong>MTTR</strong> &mdash; time from creation to close for issues labelled <strong>incident</strong>, <strong>hotfix</strong>, <strong>bug</strong>, or <strong>outage</strong>, plus any PRs with <strong>revert</strong>/<strong>rollback</strong>/<strong>hotfix</strong> in the branch name.</p>
          <p><strong>Change Failure Rate</strong> &mdash; incidents and revert PRs as a percentage of total releases (or PRs if no releases).</p>
          <p className="methodology-disclaimer">Results are estimates. Accuracy improves with consistent release tagging and incident labelling. DORA tier benchmarks are from the 2023 State of DevOps Report.</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import './StatusBar.css';

interface Props { repo: string; isVisible: boolean; }

const STEPS = [
  'Fetching releases...', '\u2713 releases fetched',
  'Fetching pull requests...', '\u2713 pull requests fetched',
  'Fetching issues & incidents...', '\u2713 analysis complete',
];

export function StatusBar({ repo, isVisible }: Props) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!isVisible) { setStep(0); return; }
    const id = setInterval(() => setStep(s => s < STEPS.length - 1 ? s + 1 : s), 600);
    return () => clearInterval(id);
  }, [isVisible]);
  if (!isVisible) return null;
  return (
    <div className="status-bar">
      <span className="status-bar-prompt">$ doratrace --repo {repo} </span>
      <span className="status-bar-step">{STEPS[step]}</span>
    </div>
  );
}

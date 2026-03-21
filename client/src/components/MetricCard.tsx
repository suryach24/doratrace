import './MetricCard.css';
import type { MetricResult } from '../types/dora';

interface Props {
  metric: MetricResult;
  label: string;
  accentColor: string;
  gradientColor: string;
}

export function MetricCard({ metric, label, accentColor, gradientColor }: Props) {
  const isNA = metric.tier === 'na';
  return (
    <div className="metric-card">
      <div className="metric-card-top-border"
        style={{ background: `linear-gradient(90deg, ${gradientColor}, ${accentColor})` }} />
      <div className="metric-card-label">{label}</div>
      {isNA
        ? <div className="metric-card-value na">N/A</div>
        : <div className="metric-card-value">{metric.value}</div>
      }
      <div className="metric-card-unit">{metric.unit}</div>
      <div className="metric-card-footer">
        <span className={`tier-badge ${metric.tier}`}>{metric.tier.toUpperCase()}</span>
        {metric.dataPoints > 0 && (
          <span className="metric-card-datapoints">from {metric.dataPoints} events</span>
        )}
      </div>
    </div>
  );
}

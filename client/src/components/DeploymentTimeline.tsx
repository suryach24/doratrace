import './DeploymentTimeline.css';
import type { DeployEvent } from '../types/dora';

interface Props { events: DeployEvent[]; days: number; }

export function DeploymentTimeline({ events, days }: Props) {
  if (events.length === 0) return null;
  const maxCount = Math.max(...events.map(e => e.count), 1);
  const totalDeploys = events.reduce((sum, e) => sum + e.count, 0);
  return (
    <div className="timeline">
      <div className="timeline-header">
        <span className="timeline-label">DEPLOYMENT_TIMELINE &mdash; last {days} days</span>
        <span className="timeline-count">{totalDeploys} total</span>
      </div>
      <div className="timeline-bars">
        {events.map(event => {
          const heightPct = event.count > 0 ? Math.max((event.count / maxCount) * 100, 8) : 6;
          const cls = event.count === 0 ? 'empty' : event.hasIncident ? 'incident' : 'deploy';
          return (
            <div key={event.date} className={`timeline-bar ${cls}`}
              style={{ height: `${heightPct}%` }}
              title={`${event.date}: ${event.count} deploy(s)${event.hasIncident ? ' \u00b7 incident' : ''}`}
            />
          );
        })}
      </div>
      <div className="timeline-dates">
        <span className="timeline-date">{days}d ago</span>
        <span className="timeline-date">today</span>
      </div>
    </div>
  );
}

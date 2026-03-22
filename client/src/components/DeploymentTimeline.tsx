import { useState } from 'react';
import './DeploymentTimeline.css';
import type { DeployEvent } from '../types/dora';

interface Props { events: DeployEvent[]; days: number; }

interface TooltipState {
  event: DeployEvent;
  barIndex: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DeploymentTimeline({ events, days }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
        {events.map((event, i) => {
          const heightPct = event.count > 0 ? Math.max((event.count / maxCount) * 100, 8) : 6;
          const cls = event.count === 0 ? 'empty' : event.hasIncident ? 'incident' : 'deploy';
          const isHovered = tooltip?.barIndex === i;

          return (
            <div
              key={event.date}
              className={`timeline-bar-wrap${isHovered ? ' hovered' : ''}`}
              onMouseEnter={() => setTooltip({ event, barIndex: i })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div className={`timeline-bar ${cls}`} style={{ height: `${heightPct}%` }} />

              {isHovered && (
                <div className={`timeline-tooltip-popup ${i > events.length * 0.7 ? 'align-right' : ''}`}>
                  <div className="ttp-date">{formatDate(event.date)}</div>
                  <div className="ttp-row">
                    <span className="ttp-label">Deploys</span>
                    <span className={`ttp-value ${event.count > 0 ? 'green' : 'dim'}`}>
                      {event.count}
                    </span>
                  </div>
                  {event.hasIncident && (
                    <div className="ttp-incident">⚠ incident detected</div>
                  )}
                </div>
              )}
            </div>
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

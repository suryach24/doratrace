import { render, screen } from '@testing-library/react';
import { MetricCard } from '../components/MetricCard';
import type { MetricResult } from '../types/dora';

const eliteMetric: MetricResult = { value: 4.2, unit: 'deploys/week', tier: 'elite', dataPoints: 38 };

describe('MetricCard', () => {
  it('renders value and unit', () => {
    render(<MetricCard metric={eliteMetric} label="DEPLOY_FREQ" accentColor="var(--green)" gradientColor="var(--green-mid)" />);
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('deploys/week')).toBeInTheDocument();
  });

  it('renders tier badge', () => {
    render(<MetricCard metric={eliteMetric} label="DEPLOY_FREQ" accentColor="var(--green)" gradientColor="var(--green-mid)" />);
    expect(screen.getByText('ELITE')).toBeInTheDocument();
  });

  it('shows dataPoints count', () => {
    render(<MetricCard metric={eliteMetric} label="DEPLOY_FREQ" accentColor="var(--green)" gradientColor="var(--green-mid)" />);
    expect(screen.getByText(/38/)).toBeInTheDocument();
  });

  it('renders N/A for na tier', () => {
    const naMetric: MetricResult = { value: 0, unit: 'minutes', tier: 'na', dataPoints: 0 };
    render(<MetricCard metric={naMetric} label="MTTR" accentColor="var(--purple)" gradientColor="var(--purple-mid)" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});

/**
 * Unit tests for MetricCard — a pure presentational component with no external deps.
 * (Dashboard.jsx has a broken import for ./NetworkTopology so it cannot be rendered
 * in isolation; MetricCard is a stable alternative for component-level smoke tests.)
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricCard from '../components/MetricCard';

describe('MetricCard', () => {
    it('renders label and value', () => {
        render(<MetricCard label="Risk Score" value={42} />);
        expect(screen.getByText('Risk Score')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders unit when provided', () => {
        render(<MetricCard label="Uptime" value={99} unit="%" />);
        expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        render(<MetricCard label="Alerts" value={3} icon="🔔" />);
        expect(screen.getByText('🔔')).toBeInTheDocument();
    });

    it('renders without optional props', () => {
        const { container } = render(<MetricCard label="Score" value={0} />);
        expect(container.firstChild).toBeTruthy();
    });

    it('applies purple gradient class by default', () => {
        const { container } = render(<MetricCard label="L" value={1} />);
        expect(container.firstChild.className).toContain('gradient-card-purple');
    });

    it('applies cyan gradient class when gradient=cyan', () => {
        const { container } = render(<MetricCard label="L" value={1} gradient="cyan" />);
        expect(container.firstChild.className).toContain('gradient-card-cyan');
    });

    it('shows positive trend indicator with up arrow', () => {
        render(<MetricCard label="L" value={1} trend={5} />);
        expect(screen.getByText(/vs last period/i)).toBeInTheDocument();
        expect(screen.getByText(/↑/)).toBeInTheDocument();
    });

    it('shows negative trend indicator with down arrow', () => {
        render(<MetricCard label="L" value={1} trend={-3} />);
        expect(screen.getByText(/vs last period/i)).toBeInTheDocument();
        expect(screen.getByText(/↓/)).toBeInTheDocument();
    });
});

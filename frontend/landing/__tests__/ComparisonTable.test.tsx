/**
 * @module ComparisonTable.test
 * @description Unit tests for ComparisonTable component
 */

import { render, screen } from '@testing-library/react';
import ComparisonTable from '@/components/ComparisonTable';

describe('ComparisonTable Component', () => {
  it('should render section header', () => {
    render(<ComparisonTable />);
    expect(screen.getByText(/How We Compare/i)).toBeInTheDocument();
  });

  it('should display all competitor names', () => {
    render(<ComparisonTable />);
    expect(screen.getAllByText(/Rev\.com/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Otter\.ai/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Descript/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/WhisperAPI/i).length).toBeGreaterThan(0);
  });

  it('should show WhisperAPI pricing advantage', () => {
    render(<ComparisonTable />);
    expect(screen.getByText('$0.15')).toBeInTheDocument();
    expect(screen.getByText('$1.50')).toBeInTheDocument();
    expect(screen.getByText('$0.33')).toBeInTheDocument();
    expect(screen.getByText('$0.40')).toBeInTheDocument();
  });

  it('should highlight speed advantage', () => {
    render(<ComparisonTable />);
    expect(screen.getByText(/~3 min/i)).toBeInTheDocument();
  });

  it('should show feature comparisons', () => {
    render(<ComparisonTable />);
    expect(screen.getByText(/Price per minute/i)).toBeInTheDocument();
    expect(screen.getByText(/Processing speed/i)).toBeInTheDocument();
    expect(screen.getByText(/API access/i)).toBeInTheDocument();
    expect(screen.getByText(/Self-hosted option/i)).toBeInTheDocument();
  });

  it('should render checkmarks and X marks', () => {
    const { container } = render(<ComparisonTable />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should display last updated date', () => {
    render(<ComparisonTable />);
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
  });

  it('should have disclaimer about competitor pricing', () => {
    render(<ComparisonTable />);
    expect(screen.getByText(/Competitor pricing may vary/i)).toBeInTheDocument();
  });
});

/**
 * @module Features.test
 * @description Unit tests for Features component
 */

import { render, screen } from '@testing-library/react';
import Features from '@/components/Features';

describe('Features Component', () => {
  it('should render section header', () => {
    render(<Features />);
    expect(screen.getByText(/Why Choose WhisperAPI\?/i)).toBeInTheDocument();
  });

  it('should render all six feature cards', () => {
    render(<Features />);
    expect(screen.getByText(/Lightning Fast/i)).toBeInTheDocument();
    expect(screen.getByText(/80% Cost Savings/i)).toBeInTheDocument();
    expect(screen.getByText(/Multiple Models/i)).toBeInTheDocument();
    expect(screen.getByText(/All Output Formats/i)).toBeInTheDocument();
    expect(screen.getByText(/Hybrid Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise Ready/i)).toBeInTheDocument();
  });

  it('should display feature statistics', () => {
    render(<Features />);
    expect(screen.getByText(/3x faster/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0.15\/min/i)).toBeInTheDocument();
  });

  it('should have CTA button at bottom', () => {
    render(<Features />);
    const ctaButton = screen.getByRole('link', { name: /Get Started for Free/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/signup');
  });

  it('should render feature descriptions', () => {
    render(<Features />);
    expect(screen.getByText(/M4 Metal acceleration/i)).toBeInTheDocument();
    expect(screen.getByText(/No hidden fees/i)).toBeInTheDocument();
    expect(screen.getByText(/Balance speed and accuracy/i)).toBeInTheDocument();
  });

  it('should have icons for each feature', () => {
    const { container } = render(<Features />);
    const icons = container.querySelectorAll('svg');
    // 6 feature icons + 1 CTA checkmark = 7 total (at minimum)
    expect(icons.length).toBeGreaterThanOrEqual(6);
  });
});

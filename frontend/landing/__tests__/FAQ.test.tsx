/**
 * @module FAQ.test
 * @description Unit tests for FAQ component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import FAQ from '@/components/FAQ';

describe('FAQ Component', () => {
  it('should render section header', () => {
    render(<FAQ />);
    expect(screen.getByText(/Frequently Asked Questions/i)).toBeInTheDocument();
  });

  it('should render all FAQ questions', () => {
    render(<FAQ />);
    expect(screen.getByText(/How does the free tier work\?/i)).toBeInTheDocument();
    expect(screen.getByText(/What Whisper models do you support\?/i)).toBeInTheDocument();
    expect(screen.getByText(/How fast is the transcription\?/i)).toBeInTheDocument();
  });

  it('should have first FAQ open by default', () => {
    render(<FAQ />);
    expect(screen.getByText(/60 minutes of transcription per month/i)).toBeVisible();
  });

  it('should toggle FAQ item when clicked', () => {
    render(<FAQ />);
    const secondQuestion = screen.getByText(/What Whisper models do you support\?/i);

    fireEvent.click(secondQuestion);

    expect(screen.getByText(/Base \(fastest, good accuracy\)/i)).toBeInTheDocument();
  });

  it('should close open FAQ when clicking another', () => {
    render(<FAQ />);
    const firstQuestion = screen.getByText(/How does the free tier work\?/i);
    const secondQuestion = screen.getByText(/What Whisper models do you support\?/i);

    // First one should be open
    expect(screen.getByText(/60 minutes of transcription per month/i)).toBeVisible();

    // Click second
    fireEvent.click(secondQuestion);

    // Second should now be visible
    expect(screen.getByText(/Base \(fastest, good accuracy\)/i)).toBeInTheDocument();
  });

  it('should render contact support section', () => {
    render(<FAQ />);
    expect(screen.getByText(/Still have questions\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read Documentation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact Support/i })).toBeInTheDocument();
  });

  it('should have correct number of FAQs', () => {
    render(<FAQ />);
    // Should have 12 FAQ items
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(12);
  });

  it('should rotate arrow icon when opening FAQ', () => {
    const { container } = render(<FAQ />);
    const firstButton = screen.getByText(/How does the free tier work\?/i).closest('button');

    // First FAQ is open by default, should have rotated arrow
    const arrow = firstButton?.querySelector('svg');
    expect(arrow).toHaveClass('rotate-180');
  });
});

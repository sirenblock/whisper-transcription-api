/**
 * @module Hero.test
 * @description Unit tests for Hero component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import Hero from '@/components/Hero';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('Hero Component', () => {
  it('should render hero headline', () => {
    render(<Hero />);
    expect(screen.getByText(/Transcribe Audio/i)).toBeInTheDocument();
    expect(screen.getByText(/80% Cheaper/i)).toBeInTheDocument();
  });

  it('should render subheadline with key metrics', () => {
    render(<Hero />);
    expect(screen.getByText(/3x faster/i)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI Whisper API/i)).toBeInTheDocument();
  });

  it('should render CTA buttons', () => {
    render(<Hero />);
    const startButton = screen.getByRole('link', { name: /Start Free Trial/i });
    const pricingButton = screen.getByRole('link', { name: /View Pricing/i });

    expect(startButton).toBeInTheDocument();
    expect(pricingButton).toBeInTheDocument();
    expect(startButton).toHaveAttribute('href', '/signup');
    expect(pricingButton).toHaveAttribute('href', '/pricing');
  });

  it('should render trust indicators', () => {
    render(<Hero />);
    expect(screen.getByText(/60 free minutes\/month/i)).toBeInTheDocument();
    expect(screen.getByText(/No credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel anytime/i)).toBeInTheDocument();
  });

  it('should render code example', () => {
    render(<Hero />);
    expect(screen.getByText(/curl -X POST/i)).toBeInTheDocument();
    expect(screen.getByText(/api.whisperapi.com\/v1\/transcribe/i)).toBeInTheDocument();
  });

  it('should copy code to clipboard when copy button is clicked', async () => {
    render(<Hero />);
    const copyButton = screen.getByTitle('Copy to clipboard');

    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('should show copied state after clicking copy button', async () => {
    render(<Hero />);
    const copyButton = screen.getByTitle('Copy to clipboard');

    fireEvent.click(copyButton);

    // Check for checkmark icon (copied state)
    const checkmark = copyButton.querySelector('path[fill-rule="evenodd"]');
    expect(checkmark).toBeInTheDocument();
  });

  it('should have M4 Metal badge', () => {
    render(<Hero />);
    expect(screen.getByText(/Now with M4 Metal acceleration/i)).toBeInTheDocument();
  });
});

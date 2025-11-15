/**
 * @module PricingTable.test
 * @description Unit tests for PricingTable component
 */

import { render, screen } from '@testing-library/react';
import PricingTable from '@/components/PricingTable';

describe('PricingTable Component', () => {
  it('should render section header', () => {
    render(<PricingTable />);
    expect(screen.getByText(/Simple, Transparent Pricing/i)).toBeInTheDocument();
  });

  it('should render all three pricing tiers', () => {
    render(<PricingTable />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Pay-as-you-go')).toBeInTheDocument();
  });

  it('should display correct prices', () => {
    render(<PricingTable />);
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$19')).toBeInTheDocument();
    expect(screen.getByText('$0.15')).toBeInTheDocument();
  });

  it('should show "Most Popular" badge on Pro plan', () => {
    render(<PricingTable />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('should display minute allocations', () => {
    render(<PricingTable />);
    expect(screen.getByText('60 minutes/month')).toBeInTheDocument();
    expect(screen.getByText('600 minutes/month')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('should have CTA buttons for each plan', () => {
    render(<PricingTable />);
    expect(screen.getByRole('link', { name: /Start Free/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Pro Trial/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Started/i })).toBeInTheDocument();
  });

  it('should render feature lists for each plan', () => {
    render(<PricingTable />);
    expect(screen.getByText(/Base model only/i)).toBeInTheDocument();
    expect(screen.getByText(/All models \(Base, Small, Medium\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority processing/i)).toBeInTheDocument();
  });

  it('should have enterprise contact section', () => {
    render(<PricingTable />);
    expect(screen.getByText(/Need a custom enterprise plan\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact Sales/i })).toBeInTheDocument();
  });

  it('should link to FAQ', () => {
    render(<PricingTable />);
    const faqLink = screen.getByRole('link', { name: /Check our FAQ/i });
    expect(faqLink).toHaveAttribute('href', '/pricing#faq');
  });
});

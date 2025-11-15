/**
 * @module PricingTable
 * @description Pricing table component with three tiers (Free, Pro, PAYG)
 *
 * Features:
 * - Clear pricing comparison
 * - Feature highlights
 * - CTA buttons for each tier
 * - Popular badge for Pro plan
 *
 * @example
 * <PricingTable />
 */

'use client';

import Link from 'next/link';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  minutes: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
}

export default function PricingTable() {
  const plans: PricingPlan[] = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      minutes: '60 minutes/month',
      description: 'Perfect for trying out WhisperAPI',
      features: [
        'Base model only',
        'Standard processing speed',
        'JSON output format',
        '3 requests/hour',
        'Community support',
        '24-hour file retention',
      ],
      cta: 'Start Free',
      ctaLink: '/signup',
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      minutes: '600 minutes/month',
      description: 'Best for professionals and small teams',
      features: [
        'All models (Base, Small, Medium)',
        'Priority processing',
        'All output formats (JSON, SRT, VTT, TXT)',
        '20 requests/hour',
        'Email support',
        '24-hour file retention',
        'API key management',
        'Usage analytics',
      ],
      cta: 'Start Pro Trial',
      ctaLink: '/signup?plan=pro',
      popular: true,
    },
    {
      name: 'Pay-as-you-go',
      price: '$0.15',
      period: '/minute',
      minutes: 'Unlimited',
      description: 'Scale without limits',
      features: [
        'All models included',
        'Priority processing',
        'All output formats',
        '100 requests/hour',
        'Priority email support',
        'Custom file retention',
        'Volume discounts available',
        'Dedicated account manager (100k+ min/month)',
      ],
      cta: 'Get Started',
      ctaLink: '/signup?plan=payg',
    },
  ];

  return (
    <div className="py-20 bg-gray-50">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                plan.popular
                  ? 'border-2 border-primary-500 transform md:scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-primary-600 font-medium mt-2">
                    {plan.minutes}
                  </p>
                </div>

                {/* CTA Button */}
                <Link
                  href={plan.ctaLink}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200 mb-8 ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features List */}
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-primary-600 to-blue-500 rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Need a custom enterprise plan?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Volume discounts, dedicated support, and custom SLAs available for high-volume users.
            </p>
            <a
              href="mailto:enterprise@whisperapi.com"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Have questions about pricing?{' '}
            <Link href="/pricing#faq" className="text-primary-600 hover:text-primary-700 font-medium">
              Check our FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

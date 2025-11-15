/**
 * @module PricingPage
 * @description Dedicated pricing page with detailed plan comparison
 *
 * Features:
 * - Full pricing table
 * - Detailed feature comparison
 * - FAQ specific to pricing
 * - Enterprise contact form
 *
 * @example
 * Rendered at: /pricing
 */

import PricingTable from '@/components/PricingTable';
import FAQ from '@/components/FAQ';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - WhisperAPI',
  description: 'Simple, transparent pricing for WhisperAPI. Start free with 60 minutes/month. Pro plans from $19/month or pay-as-you-go at $0.15/minute.',
};

export default function PricingPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="section-container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Pricing That Scales With You
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              From free hobby projects to enterprise deployments. No hidden fees, no surprises.
            </p>

            {/* Pricing Calculator */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Pricing Calculator
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minutes per month
                  </label>
                  <input
                    type="number"
                    placeholder="600"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated cost (PAYG)
                  </label>
                  <div className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg text-primary-700 font-semibold">
                    $90.00/month
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                💡 Tip: At 600 min/month, Pro plan ($19) saves you $71/month vs PAYG
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <PricingTable />

      {/* Detailed Feature Comparison */}
      <section className="py-20 bg-white">
        <div className="section-container">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Detailed Feature Comparison
          </h2>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700">Free</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700">Pro</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700">PAYG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { feature: 'Monthly minutes', free: '60', pro: '600', payg: 'Unlimited' },
                  { feature: 'Rate limit (req/hour)', free: '3', pro: '20', payg: '100' },
                  { feature: 'Whisper models', free: 'Base', pro: 'All', payg: 'All' },
                  { feature: 'Output formats', free: 'JSON', pro: 'All', payg: 'All' },
                  { feature: 'Processing priority', free: 'Standard', pro: 'High', payg: 'High' },
                  { feature: 'Support', free: 'Community', pro: 'Email', payg: 'Priority Email' },
                  { feature: 'API keys', free: '1', pro: '5', payg: 'Unlimited' },
                  { feature: 'Usage analytics', free: '✗', pro: '✓', payg: '✓' },
                  { feature: 'Webhooks', free: '✗', pro: '✓', payg: '✓' },
                  { feature: 'Custom retention', free: '✗', pro: '✗', payg: '✓' },
                  { feature: 'Volume discounts', free: '✗', pro: '✗', payg: '✓' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium text-gray-900">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-gray-700">{row.free}</td>
                    <td className="py-4 px-6 text-center text-gray-700">{row.pro}</td>
                    <td className="py-4 px-6 text-center text-gray-700">{row.payg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Enterprise CTA */}
      <section className="py-20 bg-gray-50">
        <div className="section-container">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary-600 to-blue-500 rounded-2xl p-12 text-white text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Enterprise & Custom Solutions
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Need custom SLAs, on-premise deployment, or processing 100k+ minutes/month?
              <br />
              Our enterprise team can help.
            </p>
            <ul className="text-left inline-block mb-8 space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Volume discounts (up to 50% off)
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Dedicated account manager
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Custom SLAs and support
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                On-premise deployment options
              </li>
            </ul>
            <div>
              <a
                href="mailto:enterprise@whisperapi.com"
                className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

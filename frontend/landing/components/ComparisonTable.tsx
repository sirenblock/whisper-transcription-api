/**
 * @module ComparisonTable
 * @description Comparison table showing WhisperAPI vs competitors
 *
 * Compares:
 * - Rev.com
 * - Otter.ai
 * - Descript
 * - WhisperAPI
 *
 * Metrics:
 * - Price per minute
 * - Processing speed
 * - API availability
 * - Self-hosted option
 *
 * @example
 * <ComparisonTable />
 */

'use client';

interface ComparisonRow {
  feature: string;
  rev: string | boolean;
  otter: string | boolean;
  descript: string | boolean;
  whisperapi: string | boolean;
  highlight?: boolean;
}

export default function ComparisonTable() {
  const comparisons: ComparisonRow[] = [
    {
      feature: 'Price per minute',
      rev: '$1.50',
      otter: '$0.33',
      descript: '$0.40',
      whisperapi: '$0.15',
      highlight: true,
    },
    {
      feature: 'Processing speed (1hr file)',
      rev: '~1 hour',
      otter: '~30 min',
      descript: '~45 min',
      whisperapi: '~3 min',
      highlight: true,
    },
    {
      feature: 'API access',
      rev: false,
      otter: true,
      descript: false,
      whisperapi: true,
    },
    {
      feature: 'Self-hosted option',
      rev: false,
      otter: false,
      descript: false,
      whisperapi: true,
      highlight: true,
    },
    {
      feature: 'Multiple models',
      rev: false,
      otter: false,
      descript: false,
      whisperapi: true,
    },
    {
      feature: 'Pay-as-you-go',
      rev: false,
      otter: false,
      descript: false,
      whisperapi: true,
    },
    {
      feature: 'Free tier',
      rev: false,
      otter: '300 min/month',
      descript: false,
      whisperapi: '60 min/month',
    },
    {
      feature: 'Output formats',
      rev: 'TXT, SRT',
      otter: 'TXT',
      descript: 'TXT, SRT',
      whisperapi: 'JSON, SRT, VTT, TXT',
    },
  ];

  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <svg className="w-6 h-6 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return <span className="text-gray-700">{value}</span>;
  };

  return (
    <div className="py-20 bg-white">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How We Compare
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how WhisperAPI stacks up against the competition
          </p>
        </div>

        {/* Comparison Table - Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full max-w-5xl mx-auto bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Feature
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Rev.com
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Otter.ai
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Descript
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold bg-primary-50 text-primary-900">
                  WhisperAPI ⭐
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparisons.map((row, index) => (
                <tr
                  key={index}
                  className={row.highlight ? 'bg-primary-50/30' : ''}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {row.feature}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {renderCell(row.rev)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {renderCell(row.otter)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {renderCell(row.descript)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center font-semibold bg-primary-50/50">
                    {renderCell(row.whisperapi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Comparison Cards - Mobile */}
        <div className="md:hidden space-y-6">
          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-primary-900 mb-4 flex items-center">
              WhisperAPI ⭐
            </h3>
            <ul className="space-y-3">
              {comparisons.map((row, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{row.feature}</span>
                  <span className="text-sm font-semibold">{renderCell(row.whisperapi)}</span>
                </li>
              ))}
            </ul>
          </div>

          {['Rev.com', 'Otter.ai', 'Descript'].map((competitor, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{competitor}</h3>
              <ul className="space-y-3">
                {comparisons.map((row, index) => {
                  const value = idx === 0 ? row.rev : idx === 1 ? row.otter : row.descript;
                  return (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{row.feature}</span>
                      <span className="text-sm">{renderCell(value)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <br />
            Competitor pricing may vary. Check their websites for current rates.
          </p>
        </div>
      </div>
    </div>
  );
}

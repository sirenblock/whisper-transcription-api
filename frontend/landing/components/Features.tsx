/**
 * @module Features
 * @description Features section showcasing key benefits
 *
 * Highlights:
 * - Speed and performance
 * - Cost savings
 * - Flexibility and ease of use
 * - Security and reliability
 *
 * @example
 * <Features />
 */

'use client';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  stat?: string;
}

export default function Features() {
  const features: Feature[] = [
    {
      title: 'Lightning Fast',
      description: 'M4 Metal acceleration processes audio 3x faster than cloud alternatives. 1-hour file in just 3 minutes.',
      stat: '3x faster',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: '80% Cost Savings',
      description: 'Pay only $0.15/minute with pay-as-you-go pricing. No hidden fees, no minimum commitments.',
      stat: '$0.15/min',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Multiple Models',
      description: 'Choose from Base, Small, and Medium Whisper models. Balance speed and accuracy for your use case.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      title: 'All Output Formats',
      description: 'Export as JSON, SRT, VTT, or plain text. Perfect for subtitles, transcripts, or data analysis.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Hybrid Architecture',
      description: 'Start with local Mac Mini processing. Scale to cloud GPU workers instantly when you need more capacity.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
    },
    {
      title: 'Enterprise Ready',
      description: 'SOC2 compliant with 99.9% uptime SLA. Files auto-deleted after 24 hours. Full API key management.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="py-20 bg-white">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose WhisperAPI?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built for developers who need fast, accurate, and affordable transcription at scale
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative card hover:border-primary-200 transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-lg mb-4 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>

              {/* Stat Badge */}
              {feature.stat && (
                <div className="mt-4 inline-block bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {feature.stat}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Ready to experience the difference?
          </p>
          <a href="/signup" className="btn-primary text-lg">
            Get Started for Free
          </a>
        </div>
      </div>
    </div>
  );
}

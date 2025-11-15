/**
 * @module FAQ
 * @description FAQ section with common questions and answers
 *
 * Features:
 * - Expandable accordion interface
 * - Common questions about pricing, features, and usage
 * - Link to more detailed documentation
 *
 * @example
 * <FAQ />
 */

'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: 'How does the free tier work?',
      answer: 'The free tier gives you 60 minutes of transcription per month using our base model. No credit card required. Perfect for testing and small projects. Minutes reset on the first of each month.',
    },
    {
      question: 'What Whisper models do you support?',
      answer: 'We support three OpenAI Whisper models: Base (fastest, good accuracy), Small (balanced), and Medium (highest accuracy). Free tier includes Base only. Pro and PAYG plans include all models.',
    },
    {
      question: 'How fast is the transcription?',
      answer: 'With M4 Metal acceleration, we process audio 3x faster than cloud alternatives. A 1-hour audio file typically completes in 3 minutes on the base model. Actual speed depends on model choice and current load.',
    },
    {
      question: 'What file formats do you accept?',
      answer: 'We accept MP3, WAV, M4A, MP4, MPEG, and WebM files up to 500MB. Files are automatically converted and optimized before processing.',
    },
    {
      question: 'What output formats are available?',
      answer: 'We provide JSON (timestamped segments), SRT (SubRip subtitles), VTT (WebVTT subtitles), and plain text. All formats include the full transcription with timestamps where applicable.',
    },
    {
      question: 'How is pricing calculated?',
      answer: 'We charge based on audio duration (minutes), not file size. A 10-minute audio file costs $1.50 on PAYG pricing. Pro plan includes 600 minutes/month. Unused minutes don\'t roll over.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. All uploads use HTTPS encryption. Files are automatically deleted after 24 hours. We\'re SOC2 compliant and never train models on your data. You can also self-host for complete control.',
    },
    {
      question: 'Can I self-host WhisperAPI?',
      answer: 'Absolutely! Our hybrid architecture supports local Mac Mini deployment with Tailscale networking. Perfect for sensitive data or air-gapped environments. Contact us for enterprise self-hosted setups.',
    },
    {
      question: 'What languages are supported?',
      answer: 'WhisperAPI supports 99+ languages via OpenAI Whisper, including English, Spanish, French, German, Chinese, Japanese, and more. The model automatically detects the language.',
    },
    {
      question: 'Do you offer volume discounts?',
      answer: 'Yes! Customers using 100k+ minutes per month qualify for custom pricing and dedicated support. Contact our sales team at enterprise@whisperapi.com for a quote.',
    },
    {
      question: 'What\'s your uptime SLA?',
      answer: 'We maintain 99.9% uptime for Pro and PAYG customers. Free tier is best-effort. Enterprise plans include custom SLAs. Check our status page at status.whisperapi.com.',
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your Pro subscription anytime. No cancellation fees. You\'ll retain access until the end of your billing period. PAYG has no subscription - just pay for what you use.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="py-20 bg-gray-50">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about WhisperAPI
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-8">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                      openIndex === index ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openIndex === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 pb-5 text-gray-700 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Still have questions?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/docs"
              className="btn-secondary"
            >
              Read Documentation
            </a>
            <a
              href="mailto:support@whisperapi.com"
              className="btn-primary"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

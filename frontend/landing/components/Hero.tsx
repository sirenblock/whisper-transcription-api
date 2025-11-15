/**
 * @module Hero
 * @description Hero section component with primary value proposition
 *
 * Features:
 * - Attention-grabbing headline with cost savings
 * - Clear CTA buttons
 * - Trust indicators (free trial, no CC required)
 * - Live demo code snippet
 *
 * @example
 * <Hero />
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const codeExample = `curl -X POST https://api.whisperapi.com/v1/transcribe \\
  -H "Authorization: Bearer wtr_live_xxx" \\
  -F "file=@audio.mp3" \\
  -F "model=base"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="section-container relative">
        <div className="text-center py-20 px-4 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            <span>Now with M4 Metal acceleration</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Transcribe Audio{' '}
            <span className="text-gradient">80% Cheaper</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            OpenAI Whisper API powered by M4 Metal.{' '}
            <span className="font-semibold text-gray-900">3x faster</span> than cloud alternatives.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="btn-secondary text-lg px-8 py-4">
              View Pricing
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 mb-16">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>60 free minutes/month</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>

          {/* Code Example */}
          <div className="max-w-3xl mx-auto animate-slide-up">
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
              {/* Terminal Header */}
              <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-400 text-sm font-mono">Quick Start Example</span>
                <button
                  onClick={handleCopy}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Code Content */}
              <div className="p-6">
                <pre className="text-gray-100 font-mono text-sm overflow-x-auto">
                  <code>{codeExample}</code>
                </pre>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              Get started in seconds with our simple REST API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

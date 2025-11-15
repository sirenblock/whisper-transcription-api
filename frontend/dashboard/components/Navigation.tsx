/**
 * @module Navigation
 * @description Main navigation component for the dashboard
 *
 * @example
 * <Navigation />
 *
 * @exports {Component} Navigation - Navigation bar
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApiKey } from '../hooks/useApiKey';
import clsx from 'clsx';

export default function Navigation() {
  const pathname = usePathname();
  const { hasApiKey, clearApiKey } = useApiKey();

  const navigation = [
    { name: 'Upload', href: '/upload', icon: '📤' },
    { name: 'Transcriptions', href: '/transcriptions', icon: '📄' },
    { name: 'API Keys', href: '/api-keys', icon: '🔑' },
  ];

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/upload" className="flex items-center space-x-2">
                <span className="text-2xl">🎙️</span>
                <span className="text-xl font-bold text-gray-900">WhisperAPI</span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                    pathname === item.href
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {hasApiKey && (
              <>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Connected</span>
                </div>
                <button
                  onClick={clearApiKey}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  title="Clear API Key"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden pb-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                pathname === item.href
                  ? 'border-primary-500 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <span className="mr-2">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

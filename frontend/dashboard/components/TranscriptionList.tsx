/**
 * @module TranscriptionList
 * @description Displays list of transcriptions with real-time status polling
 *
 * @requires react
 * @requires lib/api
 * @requires date-fns
 *
 * @example
 * <TranscriptionList apiKey="wtr_live_xxx" refreshTrigger={Date.now()} />
 *
 * @exports {Component} TranscriptionList - Transcription list with live updates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ApiClient, formatDuration, ApiError } from '../lib/api';
import type { Transcription, TranscriptionStatus } from '../lib/types';

interface TranscriptionListProps {
  apiKey: string;
  refreshTrigger?: number;
  onDownload?: (transcriptionId: string) => void;
}

const STATUS_COLORS: Record<TranscriptionStatus, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<TranscriptionStatus, string> = {
  QUEUED: '⏳',
  PROCESSING: '⚙️',
  COMPLETED: '✅',
  FAILED: '❌',
};

export default function TranscriptionList({
  apiKey,
  refreshTrigger,
  onDownload,
}: TranscriptionListProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const fetchTranscriptions = useCallback(async () => {
    if (!apiKey) return;

    try {
      const client = new ApiClient(apiKey);
      const data = await client.listTranscriptions();
      setTranscriptions(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load transcriptions');
      }
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Initial fetch
  useEffect(() => {
    fetchTranscriptions();
  }, [fetchTranscriptions, refreshTrigger]);

  // Poll for updates on active transcriptions
  useEffect(() => {
    const hasActiveJobs = transcriptions.some(
      (t) => t.status === 'QUEUED' || t.status === 'PROCESSING'
    );

    if (!hasActiveJobs || !apiKey) return;

    const interval = setInterval(fetchTranscriptions, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [transcriptions, apiKey, fetchTranscriptions]);

  const handleDownload = async (transcription: Transcription) => {
    if (transcription.status !== 'COMPLETED' || !apiKey) return;

    setDownloadingIds((prev) => new Set(prev).add(transcription.id));

    try {
      const client = new ApiClient(apiKey);
      const content = await client.downloadTranscription(transcription.id);

      // Create download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcription.${transcription.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onDownload?.(transcription.id);
    } catch (err) {
      alert('Failed to download transcription');
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(transcription.id);
        return next;
      });
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading transcriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="ml-3 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No transcriptions yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload an audio or video file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Transcriptions</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {transcriptions.map((transcription) => (
          <div key={transcription.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{STATUS_ICONS[transcription.status]}</span>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {transcription.filename}
                    </h3>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[transcription.status]}`}>
                        {transcription.status}
                      </span>
                      <span>Model: {transcription.model}</span>
                      <span>Format: {transcription.format}</span>
                      {transcription.durationSeconds && (
                        <span>Duration: {formatDuration(transcription.durationSeconds)}</span>
                      )}
                      <span>{formatDate(transcription.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar for Processing */}
                {transcription.status === 'PROCESSING' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Processing...</span>
                      <span>{transcription.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${transcription.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {transcription.status === 'FAILED' && transcription.errorMessage && (
                  <div className="mt-2 text-xs text-red-600">
                    Error: {transcription.errorMessage}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="ml-4 flex-shrink-0">
                {transcription.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleDownload(transcription)}
                    disabled={downloadingIds.has(transcription.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingIds.has(transcription.id) ? (
                      <>
                        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      {transcriptions.some((t) => t.status === 'QUEUED' || t.status === 'PROCESSING') && (
        <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center text-sm text-blue-700">
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Auto-refreshing every 5 seconds...
          </div>
        </div>
      )}
    </div>
  );
}

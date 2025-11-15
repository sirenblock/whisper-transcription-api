/**
 * @module TranscriptionsPage
 * @description Dedicated page for viewing all transcriptions
 */

'use client';

import TranscriptionList from '../../components/TranscriptionList';
import { useApiKey } from '../../hooks/useApiKey';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TranscriptionsPage() {
  const { apiKey, hasApiKey } = useApiKey();
  const router = useRouter();

  useEffect(() => {
    if (!hasApiKey) {
      router.push('/upload');
    }
  }, [hasApiKey, router]);

  if (!hasApiKey) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Transcriptions</h1>
        <p className="mt-2 text-gray-600">
          View and download all your transcription jobs.
        </p>
      </div>

      {/* Transcriptions List */}
      <TranscriptionList apiKey={apiKey} />
    </div>
  );
}

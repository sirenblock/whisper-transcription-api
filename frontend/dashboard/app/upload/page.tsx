/**
 * @module UploadPage
 * @description Main upload page for audio/video files
 */

'use client';

import { useState } from 'react';
import UploadForm from '../../components/UploadForm';
import TranscriptionList from '../../components/TranscriptionList';
import { useApiKey } from '../../hooks/useApiKey';

export default function UploadPage() {
  const { apiKey, setApiKey, hasApiKey } = useApiKey();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = (transcriptionId: string) => {
    console.log('Upload complete:', transcriptionId);
    // Trigger refresh of transcriptions list
    setRefreshTrigger(Date.now());
  };

  if (!hasApiKey) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to WhisperAPI Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            To get started, please enter your API key. You can create one in the API Keys section.
          </p>
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="flex space-x-3">
              <input
                type="password"
                id="apiKey"
                placeholder="wtr_live_xxxxxxxxxxxxx"
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Your API key is stored locally in your browser and never sent to our servers except for authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload & Transcribe</h1>
        <p className="mt-2 text-gray-600">
          Upload an audio or video file to get started with transcription.
        </p>
      </div>

      {/* Upload Form */}
      <UploadForm apiKey={apiKey} onUploadComplete={handleUploadComplete} />

      {/* Recent Transcriptions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Transcriptions</h2>
        <TranscriptionList apiKey={apiKey} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}

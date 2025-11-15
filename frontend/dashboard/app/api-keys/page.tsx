/**
 * @module ApiKeysPage
 * @description Page for managing API keys
 */

'use client';

import { useState } from 'react';
import ApiKeyManager from '../../components/ApiKeyManager';
import { useApiKey } from '../../hooks/useApiKey';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ApiKeysPage() {
  const { apiKey, hasApiKey, setApiKey } = useApiKey();
  const router = useRouter();
  const [showNewKeyBanner, setShowNewKeyBanner] = useState(false);

  useEffect(() => {
    if (!hasApiKey) {
      router.push('/upload');
    }
  }, [hasApiKey, router]);

  const handleKeyCreated = (newKey: string) => {
    setShowNewKeyBanner(true);
    // Optionally switch to the new key
    // setApiKey(newKey);
  };

  if (!hasApiKey) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-2 text-gray-600">
          Manage your API keys for accessing the WhisperAPI.
        </p>
      </div>

      {/* New Key Banner */}
      {showNewKeyBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                API Key Created Successfully
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Your new API key has been created. Make sure to copy it from the success message below!
              </p>
              <button
                onClick={() => setShowNewKeyBanner(false)}
                className="mt-2 text-sm text-blue-800 hover:text-blue-900 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Manager */}
      <ApiKeyManager apiKey={apiKey} onKeyCreated={handleKeyCreated} />

      {/* Usage Instructions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Use Your API Key</h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">1. Include in Request Headers</h3>
            <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
              <code>{`Authorization: Bearer wtr_live_xxxxxxxxxxxxx`}</code>
            </pre>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">2. Example cURL Request</h3>
            <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs">
              <code>{`curl -X POST https://api.whisperapi.com/v1/transcribe \\
  -H "Authorization: Bearer wtr_live_xxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"filename": "audio.mp3", "model": "BASE", "format": "JSON"}'`}</code>
            </pre>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">3. Example JavaScript Request</h3>
            <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs">
              <code>{`const response = await fetch('https://api.whisperapi.com/v1/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wtr_live_xxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: 'audio.mp3',
    model: 'BASE',
    format: 'JSON'
  })
});`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

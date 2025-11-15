/**
 * @module ApiKeyManager
 * @description Manages API keys - create, list, and delete
 *
 * @requires react
 * @requires lib/api
 * @requires date-fns
 *
 * @example
 * <ApiKeyManager apiKey="wtr_live_xxx" onKeyCreated={(key) => console.log(key)} />
 *
 * @exports {Component} ApiKeyManager - API key management component
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ApiClient, ApiError } from '../lib/api';
import type { ApiKey } from '../lib/types';

interface ApiKeyManagerProps {
  apiKey: string;
  onKeyCreated?: (key: string) => void;
}

export default function ApiKeyManager({ apiKey, onKeyCreated }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!apiKey) return;

    try {
      const client = new ApiClient(apiKey);
      const data = await client.listApiKeys();
      setKeys(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load API keys');
      }
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;

    setCreating(true);
    setError(null);

    try {
      const client = new ApiClient(apiKey);
      const newKey = await client.createApiKey(newKeyName || undefined);

      // Store the newly created key to display it once
      if (newKey.key) {
        setNewlyCreatedKey(newKey.key);
        onKeyCreated?.(newKey.key);
      }

      // Refresh the list
      await fetchKeys();

      // Reset form
      setNewKeyName('');
      setShowCreateForm(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create API key');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!apiKey) return;
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    setDeletingId(keyId);
    setError(null);

    try {
      const client = new ApiClient(apiKey);
      await client.deleteApiKey(keyId);

      // Refresh the list
      await fetchKeys();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete API key');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('API key copied to clipboard!');
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
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
          <span className="ml-3 text-gray-600">Loading API keys...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">API Key Created Successfully</h3>
              <div className="mt-2 text-sm text-green-700">
                <p className="mb-2">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
                <div className="flex items-center space-x-2 bg-white rounded p-3 border border-green-300">
                  <code className="flex-1 font-mono text-xs break-all">{newlyCreatedKey}</code>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="flex-shrink-0 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="mt-3 text-sm text-green-800 hover:text-green-900 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
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
      )}

      {/* Keys List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Key
          </button>
        </div>

        {/* Create Key Form */}
        {showCreateForm && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Key Name (Optional)
                </label>
                <input
                  type="text"
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API, Development Key"
                  disabled={creating}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName('');
                  }}
                  disabled={creating}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Keys Table */}
        {keys.length === 0 ? (
          <div className="px-6 py-12 text-center">
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create an API key to start using the WhisperAPI.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {keys.map((key) => (
              <div key={key.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {key.name || 'Unnamed Key'}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>Created {formatDate(key.createdAt)}</span>
                          <span>Last used {formatDate(key.lastUsedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    disabled={deletingId === key.id}
                    className="ml-4 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === key.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3 text-sm text-blue-700">
            <p className="font-medium">API Key Security</p>
            <p className="mt-1">
              Keep your API keys secure and never share them publicly. Each key provides full access to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

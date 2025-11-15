/**
 * @module useApiKey
 * @description Custom React hook for managing API key in localStorage
 *
 * @example
 * const { apiKey, setApiKey, hasApiKey, clearApiKey } = useApiKey();
 *
 * @exports {Hook} useApiKey - API key management hook
 */

'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'whisper_api_key';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setApiKeyState(stored);
    }
    setIsLoaded(true);
  }, []);

  // Save API key to localStorage and state
  const setApiKey = (key: string) => {
    const trimmedKey = key.trim();
    setApiKeyState(trimmedKey);
    if (trimmedKey) {
      localStorage.setItem(STORAGE_KEY, trimmedKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Clear API key
  const clearApiKey = () => {
    setApiKeyState('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasApiKey = isLoaded && apiKey.length > 0;

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    hasApiKey,
    isLoaded,
  };
}

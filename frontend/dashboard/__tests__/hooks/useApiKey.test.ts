/**
 * @module useApiKey.test
 * @description Tests for useApiKey hook
 */

import { renderHook, act } from '@testing-library/react';
import { useApiKey } from '../../hooks/useApiKey';

describe('useApiKey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty API key', () => {
    const { result } = renderHook(() => useApiKey());

    expect(result.current.apiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
  });

  it('should load API key from localStorage', () => {
    localStorage.setItem('whisper_api_key', 'wtr_live_test123');

    const { result } = renderHook(() => useApiKey());

    act(() => {
      // Wait for effect to run
    });

    expect(result.current.apiKey).toBe('wtr_live_test123');
    expect(result.current.hasApiKey).toBe(true);
  });

  it('should save API key to localStorage', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('wtr_live_newkey');
    });

    expect(result.current.apiKey).toBe('wtr_live_newkey');
    expect(localStorage.setItem).toHaveBeenCalledWith('whisper_api_key', 'wtr_live_newkey');
  });

  it('should clear API key', () => {
    localStorage.setItem('whisper_api_key', 'wtr_live_test123');

    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.clearApiKey();
    });

    expect(result.current.apiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('whisper_api_key');
  });

  it('should trim API key before saving', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('  wtr_live_test123  ');
    });

    expect(result.current.apiKey).toBe('wtr_live_test123');
  });

  it('should remove from localStorage when setting empty key', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('wtr_live_test123');
    });

    act(() => {
      result.current.setApiKey('');
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('whisper_api_key');
  });
});

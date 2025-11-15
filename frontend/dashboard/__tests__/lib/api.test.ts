/**
 * @module api.test
 * @description Tests for API client
 */

import { ApiClient, ApiError, isValidAudioFile, formatFileSize, formatDuration } from '../../lib/api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let client: ApiClient;
  const testApiKey = 'wtr_live_test123456789';

  beforeEach(() => {
    client = new ApiClient(testApiKey);
    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });

  describe('transcribe', () => {
    it('should upload a file and return transcription ID', async () => {
      const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const mockTranscriptionId = 'trans_123';
      const mockUploadUrl = 'https://s3.example.com/upload';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            uploadUrl: mockUploadUrl,
            transcriptionId: mockTranscriptionId,
          },
        },
      });

      mockedAxios.put.mockResolvedValueOnce({ data: {} });

      const result = await client.transcribe(mockFile, 'BASE', 'JSON');

      expect(result).toBe(mockTranscriptionId);
      expect(mockedAxios.post).toHaveBeenCalledWith('/transcribe', {
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
        model: 'BASE',
        format: 'JSON',
      });
      expect(mockedAxios.put).toHaveBeenCalledWith(
        mockUploadUrl,
        mockFile,
        expect.objectContaining({
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      );
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
        },
      });

      await expect(client.transcribe(mockFile)).rejects.toThrow('Failed to get upload URL');
    });
  });

  describe('getStatus', () => {
    it('should return transcription status', async () => {
      const mockTranscription = {
        id: 'trans_123',
        status: 'COMPLETED',
        filename: 'test.mp3',
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockTranscription,
        },
      });

      const result = await client.getStatus('trans_123');

      expect(result).toEqual(mockTranscription);
      expect(mockedAxios.get).toHaveBeenCalledWith('/status/trans_123');
    });

    it('should handle status fetch errors', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: false,
        },
      });

      await expect(client.getStatus('trans_123')).rejects.toThrow(
        'Failed to get transcription status'
      );
    });
  });

  describe('listTranscriptions', () => {
    it('should return list of transcriptions', async () => {
      const mockTranscriptions = [
        { id: 'trans_1', filename: 'file1.mp3' },
        { id: 'trans_2', filename: 'file2.mp3' },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockTranscriptions,
        },
      });

      const result = await client.listTranscriptions();

      expect(result).toEqual(mockTranscriptions);
      expect(mockedAxios.get).toHaveBeenCalledWith('/transcriptions');
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const mockApiKey = {
        id: 'key_123',
        key: 'wtr_live_newkey123',
        name: 'Test Key',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockApiKey,
        },
      });

      const result = await client.createApiKey('Test Key');

      expect(result).toEqual(mockApiKey);
      expect(mockedAxios.post).toHaveBeenCalledWith('/keys', {
        name: 'Test Key',
      });
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      mockedAxios.delete.mockResolvedValueOnce({
        data: {
          success: true,
        },
      });

      await client.deleteApiKey('key_123');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/keys/key_123');
    });
  });
});

describe('Utility Functions', () => {
  describe('isValidAudioFile', () => {
    it('should validate audio file types', () => {
      const mp3File = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const wavFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
      const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      expect(isValidAudioFile(mp3File)).toBe(true);
      expect(isValidAudioFile(wavFile)).toBe(true);
      expect(isValidAudioFile(txtFile)).toBe(false);
    });

    it('should validate by file extension', () => {
      const mp3File = new File(['test'], 'test.mp3', { type: '' });
      const m4aFile = new File(['test'], 'test.m4a', { type: '' });
      const docFile = new File(['test'], 'test.doc', { type: '' });

      expect(isValidAudioFile(mp3File)).toBe(true);
      expect(isValidAudioFile(m4aFile)).toBe(true);
      expect(isValidAudioFile(docFile)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(3661)).toBe('1h 1m 1s');
      expect(formatDuration(7200)).toBe('2h 0m 0s');
    });
  });
});

describe('ApiError', () => {
  it('should create an error with code and message', () => {
    const error = new ApiError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', { limit: 10 });

    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.details).toEqual({ limit: 10 });
    expect(error.name).toBe('ApiError');
  });
});

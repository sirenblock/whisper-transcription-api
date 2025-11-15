/**
 * @module api
 * @description API client for WhisperAPI backend
 *
 * @requires axios
 *
 * @example
 * const client = new ApiClient('wtr_live_xxxxx');
 * const transcriptionId = await client.transcribe(file, 'BASE', 'JSON');
 * const status = await client.getStatus(transcriptionId);
 *
 * @exports {Class} ApiClient - Main API client class
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  Transcription,
  TranscriptionUploadResponse,
  ApiKey,
  UsageStats,
  WhisperModel,
  OutputFormat,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.data?.error) {
          const { code, message, details } = error.response.data.error;
          throw new ApiError(code, message, details);
        }
        throw error;
      }
    );
  }

  /**
   * Initiates a transcription job
   * @param file - Audio/video file to transcribe
   * @param model - Whisper model to use (BASE, SMALL, MEDIUM)
   * @param format - Output format (JSON, SRT, VTT, TXT)
   * @returns Transcription ID
   */
  async transcribe(
    file: File,
    model: WhisperModel = 'BASE',
    format: OutputFormat = 'JSON'
  ): Promise<string> {
    // Step 1: Get presigned upload URL
    const { data } = await this.client.post<ApiResponse<TranscriptionUploadResponse>>(
      '/transcribe',
      {
        filename: file.name,
        contentType: file.type,
        model,
        format,
      }
    );

    if (!data.success || !data.data) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, transcriptionId } = data.data;

    // Step 2: Upload file directly to S3
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });

    return transcriptionId;
  }

  /**
   * Gets the status of a transcription
   * @param transcriptionId - The transcription ID
   * @returns Transcription object with current status
   */
  async getStatus(transcriptionId: string): Promise<Transcription> {
    const { data } = await this.client.get<ApiResponse<Transcription>>(
      `/status/${transcriptionId}`
    );

    if (!data.success || !data.data) {
      throw new Error('Failed to get transcription status');
    }

    return data.data;
  }

  /**
   * Lists all transcriptions for the authenticated user
   * @returns Array of transcriptions
   */
  async listTranscriptions(): Promise<Transcription[]> {
    const { data } = await this.client.get<ApiResponse<Transcription[]>>(
      '/transcriptions'
    );

    if (!data.success || !data.data) {
      throw new Error('Failed to list transcriptions');
    }

    return data.data;
  }

  /**
   * Gets the download URL for a completed transcription
   * @param transcriptionId - The transcription ID
   * @returns Presigned download URL
   */
  async getDownloadUrl(transcriptionId: string): Promise<string> {
    const { data } = await this.client.get<ApiResponse<{ downloadUrl: string }>>(
      `/download/${transcriptionId}`
    );

    if (!data.success || !data.data) {
      throw new Error('Failed to get download URL');
    }

    return data.data.downloadUrl;
  }

  /**
   * Downloads the transcription result
   * @param transcriptionId - The transcription ID
   * @returns Transcription content as string
   */
  async downloadTranscription(transcriptionId: string): Promise<string> {
    const downloadUrl = await this.getDownloadUrl(transcriptionId);
    const { data } = await axios.get(downloadUrl);
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  /**
   * Gets usage statistics for the authenticated user
   * @returns Usage stats including monthly minutes used
   */
  async getUsage(): Promise<UsageStats> {
    const { data } = await this.client.get<ApiResponse<UsageStats>>('/usage');

    if (!data.success || !data.data) {
      throw new Error('Failed to get usage stats');
    }

    return data.data;
  }

  /**
   * Lists all API keys for the authenticated user
   * @returns Array of API keys (without the actual key values)
   */
  async listApiKeys(): Promise<ApiKey[]> {
    const { data } = await this.client.get<ApiResponse<ApiKey[]>>('/keys');

    if (!data.success || !data.data) {
      throw new Error('Failed to list API keys');
    }

    return data.data;
  }

  /**
   * Creates a new API key
   * @param name - Optional name for the API key
   * @returns API key object with the actual key value (only returned once)
   */
  async createApiKey(name?: string): Promise<ApiKey> {
    const { data } = await this.client.post<ApiResponse<ApiKey>>('/keys', {
      name,
    });

    if (!data.success || !data.data) {
      throw new Error('Failed to create API key');
    }

    return data.data;
  }

  /**
   * Deletes an API key
   * @param keyId - The API key ID to delete
   */
  async deleteApiKey(keyId: string): Promise<void> {
    const { data } = await this.client.delete<ApiResponse>(`/keys/${keyId}`);

    if (!data.success) {
      throw new Error('Failed to delete API key');
    }
  }

  /**
   * Cancels a queued or processing transcription
   * @param transcriptionId - The transcription ID to cancel
   */
  async cancelTranscription(transcriptionId: string): Promise<void> {
    const { data } = await this.client.post<ApiResponse>(
      `/transcriptions/${transcriptionId}/cancel`
    );

    if (!data.success) {
      throw new Error('Failed to cancel transcription');
    }
  }
}

/**
 * Helper function to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper function to format duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Validates if a file is an accepted audio/video format
 */
export function isValidAudioFile(file: File): boolean {
  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
    'video/mp4',
    'video/mpeg',
    'audio/webm',
    'video/webm',
  ];

  const allowedExtensions = ['mp3', 'wav', 'm4a', 'mp4', 'mpeg', 'webm'];
  const extension = file.name.split('.').pop()?.toLowerCase();

  return (
    allowedTypes.includes(file.type) ||
    (extension !== undefined && allowedExtensions.includes(extension))
  );
}

export { API_BASE };

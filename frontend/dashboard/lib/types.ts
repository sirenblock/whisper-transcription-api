/**
 * @module types
 * @description Shared TypeScript type definitions for the Whisper API Dashboard
 *
 * These types match the canonical database schema and API contracts
 * defined in the shared context.
 */

export type Plan = 'FREE' | 'PRO' | 'PAYG';
export type WhisperModel = 'BASE' | 'SMALL' | 'MEDIUM';
export type OutputFormat = 'JSON' | 'SRT' | 'VTT' | 'TXT';
export type TranscriptionStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  plan: Plan;
  monthlyMinutesUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transcription {
  id: string;
  userId: string;
  filename: string;
  durationSeconds: number | null;
  model: WhisperModel;
  format: OutputFormat;
  status: TranscriptionStatus;
  s3AudioUrl: string | null;
  s3ResultUrl: string | null;
  errorMessage: string | null;
  jobId: string | null;
  progress: number;
  createdAt: Date | string;
  completedAt: Date | string | null;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  name: string | null;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
  // The actual key value (only returned on creation)
  key?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

export interface TranscriptionUploadResponse {
  uploadUrl: string;
  transcriptionId: string;
}

export interface UsageStats {
  monthlyMinutesUsed: number;
  monthlyLimit: number | null;
  plan: Plan;
  remainingMinutes: number | null;
}

export const ERROR_CODES = {
  // Auth errors (401)
  INVALID_API_KEY: 'INVALID_API_KEY',
  MISSING_API_KEY: 'MISSING_API_KEY',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MONTHLY_QUOTA_EXCEEDED: 'MONTHLY_QUOTA_EXCEEDED',

  // Validation errors (400)
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_MODEL: 'INVALID_MODEL',

  // Server errors (500)
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',

  // Not found (404)
  TRANSCRIPTION_NOT_FOUND: 'TRANSCRIPTION_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

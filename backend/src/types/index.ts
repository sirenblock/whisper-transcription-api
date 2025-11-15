/**
 * @module Types
 * @description Shared TypeScript types for the Whisper API
 *
 * @exports All Prisma types and custom types
 */

// Re-export all Prisma types
export type {
  User,
  ApiKey,
  Transcription,
  UsageLog,
  Plan,
  WhisperModel,
  OutputFormat,
  TranscriptionStatus,
} from '@prisma/client';

/**
 * API Response wrapper
 */
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

/**
 * Transcription job data for queue
 */
export interface TranscriptionJob {
  transcriptionId: string;
  userId: string;
  s3AudioUrl: string;
  model: 'BASE' | 'SMALL' | 'MEDIUM';
  format: 'JSON' | 'SRT' | 'VTT' | 'TXT';
}

/**
 * User with safe API key data (without hash)
 */
export interface UserWithApiKeys {
  id: string;
  email: string;
  plan: 'FREE' | 'PRO' | 'PAYG';
  monthlyMinutesUsed: number;
  apiKeys: Array<{
    id: string;
    name: string | null;
    lastUsedAt: Date | null;
    createdAt: Date;
  }>;
}

/**
 * Transcription creation input
 */
export interface CreateTranscriptionInput {
  userId: string;
  filename: string;
  model: 'BASE' | 'SMALL' | 'MEDIUM';
  format: 'JSON' | 'SRT' | 'VTT' | 'TXT';
  s3AudioUrl: string;
  jobId?: string;
}

/**
 * Transcription status update input
 */
export interface UpdateTranscriptionInput {
  progress?: number;
  durationSeconds?: number;
  s3ResultUrl?: string;
  errorMessage?: string;
}

/**
 * Standard error codes used across the API
 */
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
  INVALID_FORMAT: 'INVALID_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Server errors (500)
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  // Not found (404)
  TRANSCRIPTION_NOT_FOUND: 'TRANSCRIPTION_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  API_KEY_NOT_FOUND: 'API_KEY_NOT_FOUND',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * @module S3Service
 * @description S3/R2 service for handling audio file uploads and downloads using presigned URLs
 *
 * @requires @aws-sdk/client-s3
 * @requires @aws-sdk/s3-request-presigner
 * @requires crypto
 *
 * @example
 * import { generateUploadUrl, getDownloadUrl, deleteFile } from './services/s3.service';
 *
 * // Generate upload URL for client
 * const { uploadUrl, s3Key } = await generateUploadUrl('user123', 'podcast.mp3', 'audio/mpeg');
 *
 * // Get download URL
 * const downloadUrl = await getDownloadUrl(s3Key);
 *
 * @exports {Function} generateUploadUrl - Generate presigned upload URL
 * @exports {Function} getDownloadUrl - Generate presigned download URL
 * @exports {Function} uploadFile - Upload file directly from server
 * @exports {Function} deleteFile - Delete file from S3
 * @exports {Function} scheduleCleanup - Schedule file deletion
 * @exports {Function} getFileSize - Get file size without downloading
 * @exports {Function} isValidAudioFile - Validate file type
 * @exports {Function} isValidFileSize - Validate file size
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Types
export interface UploadUrlResult {
  uploadUrl: string;
  s3Key: string;
  expiresAt: Date;
}

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// Constants
const BUCKET_NAME = process.env.S3_BUCKET || 'whisper-audio';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '500') * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'video/mp4',
  'audio/webm',
  'audio/x-matroska',
];

// Initialize S3 client
let s3Client: S3Client;

/**
 * Initialize S3 client with configuration
 * @private
 */
function initializeS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const config: any = {
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  };

  // Add endpoint for R2 or S3-compatible services
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    config.forcePathStyle = true; // Required for R2
  }

  s3Client = new S3Client(config);

  logInfo('S3 client initialized', {
    bucket: BUCKET_NAME,
    region: S3_REGION,
    hasEndpoint: !!process.env.S3_ENDPOINT,
  });

  return s3Client;
}

/**
 * Structured logging helper
 * @private
 */
function logInfo(message: string, data?: any): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 's3-service',
    message,
    data,
  }));
}

/**
 * Structured error logging helper
 * @private
 */
function logError(message: string, error: any, data?: any): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    module: 's3-service',
    message,
    error: error.message || String(error),
    data,
  }));
}

/**
 * Generate a unique S3 key for an audio file
 *
 * @param userId - User ID for organizing files
 * @param filename - Original filename
 * @param prefix - S3 key prefix (default: 'uploads')
 * @returns S3 key in format: prefix/userId/timestamp_randomId_filename
 *
 * @example
 * generateS3Key('user123', 'my podcast.mp3', 'uploads')
 * // Returns: 'uploads/user123/1234567890_a1b2c3d4_my_podcast.mp3'
 *
 * @private
 */
function generateS3Key(userId: string, filename: string, prefix: string = 'uploads'): string {
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${userId}/${timestamp}_${randomId}_${sanitized}`;
}

/**
 * Generate presigned upload URL for client-side upload
 *
 * @param userId - User ID for organizing files
 * @param filename - Original filename
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration in seconds (default: 3600)
 * @returns Object with upload URL, S3 key, and expiration time
 *
 * @throws {Error} If S3 credentials are missing
 * @throws {Error} If presigned URL generation fails
 *
 * @example
 * const { uploadUrl, s3Key, expiresAt } = await generateUploadUrl(
 *   'user123',
 *   'podcast.mp3',
 *   'audio/mpeg'
 * );
 * // Client uploads directly to uploadUrl
 * await fetch(uploadUrl, {
 *   method: 'PUT',
 *   body: audioFile,
 *   headers: { 'Content-Type': 'audio/mpeg' }
 * });
 */
export async function generateUploadUrl(
  userId: string,
  filename: string,
  contentType: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<UploadUrlResult> {
  try {
    const client = initializeS3Client();
    const s3Key = generateS3Key(userId, filename, 'uploads');

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    logInfo('Generated upload URL', {
      userId,
      filename,
      s3Key,
      expiresAt,
    });

    return { uploadUrl, s3Key, expiresAt };
  } catch (error) {
    logError('Failed to generate upload URL', error, { userId, filename });
    throw new Error(`Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate presigned download URL
 *
 * @param s3Key - S3 key of the file
 * @param expiresIn - URL expiration in seconds (default: 3600)
 * @returns Presigned download URL
 *
 * @throws {Error} If presigned URL generation fails
 *
 * @example
 * const downloadUrl = await getDownloadUrl('uploads/user123/audio.mp3');
 * // Return this URL to the client for download
 */
export async function getDownloadUrl(
  s3Key: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    const client = initializeS3Client();

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(client, command, { expiresIn });

    logInfo('Generated download URL', { s3Key, expiresIn });

    return downloadUrl;
  } catch (error) {
    logError('Failed to generate download URL', error, { s3Key });
    throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a file directly from server (used by workers)
 *
 * @param s3Key - Destination S3 key
 * @param fileBuffer - File content as Buffer
 * @param contentType - MIME type
 * @returns S3 URL (s3:// format)
 *
 * @throws {Error} If upload fails
 *
 * @example
 * const resultBuffer = Buffer.from(JSON.stringify(transcription));
 * const s3Url = await uploadFile(
 *   'results/user123/transcript.json',
 *   resultBuffer,
 *   'application/json'
 * );
 */
export async function uploadFile(
  s3Key: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    const client = initializeS3Client();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    const s3Url = `s3://${BUCKET_NAME}/${s3Key}`;

    logInfo('Uploaded file', {
      s3Key,
      size: fileBuffer.length,
      contentType,
    });

    return s3Url;
  } catch (error) {
    logError('Failed to upload file', error, { s3Key });
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from S3
 *
 * @param s3Key - S3 key of the file to delete
 * @returns Promise<void>
 *
 * @throws {Error} If deletion fails
 *
 * @example
 * await deleteFile('uploads/user123/old_audio.mp3');
 */
export async function deleteFile(s3Key: string): Promise<void> {
  try {
    const client = initializeS3Client();

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await client.send(command);

    logInfo('Deleted file', { s3Key });
  } catch (error) {
    logError('Failed to delete file', error, { s3Key });
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Schedule file deletion after specified hours
 *
 * @param s3Key - S3 key to delete
 * @param hours - Hours until deletion (default: 24)
 *
 * @example
 * await scheduleCleanup('uploads/temp_file.mp3', 24);
 * // File will be deleted after 24 hours
 */
export async function scheduleCleanup(s3Key: string, hours: number = 24): Promise<void> {
  const deleteAfter = hours * 60 * 60 * 1000; // Convert to milliseconds
  const deleteAt = new Date(Date.now() + deleteAfter);

  logInfo('Scheduled file cleanup', {
    s3Key,
    hours,
    deleteAt,
  });

  setTimeout(async () => {
    try {
      await deleteFile(s3Key);
      logInfo('Cleanup completed', { s3Key });
    } catch (error) {
      logError('Cleanup failed', error, { s3Key });
    }
  }, deleteAfter);
}

/**
 * Get file size from S3 (without downloading)
 *
 * @param s3Key - S3 key
 * @returns File size in bytes
 *
 * @throws {Error} If file doesn't exist or request fails
 *
 * @example
 * const size = await getFileSize('uploads/user123/audio.mp3');
 * console.log(`File size: ${size} bytes`);
 */
export async function getFileSize(s3Key: string): Promise<number> {
  try {
    const client = initializeS3Client();

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await client.send(command);
    const size = response.ContentLength || 0;

    logInfo('Retrieved file size', { s3Key, size });

    return size;
  } catch (error) {
    logError('Failed to get file size', error, { s3Key });
    throw new Error(`Failed to get file size: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if file exists in S3
 *
 * @param s3Key - S3 key
 * @returns True if file exists, false otherwise
 *
 * @example
 * const exists = await fileExists('uploads/user123/audio.mp3');
 */
export async function fileExists(s3Key: string): Promise<boolean> {
  try {
    await getFileSize(s3Key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate file type
 *
 * @param contentType - MIME type
 * @returns True if valid audio file type
 *
 * @example
 * if (!isValidAudioFile('audio/mpeg')) {
 *   throw new Error('Invalid file type');
 * }
 */
export function isValidAudioFile(contentType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(contentType.toLowerCase());
}

/**
 * Validate file size
 *
 * @param sizeInBytes - File size in bytes
 * @returns True if size is within limit
 *
 * @example
 * if (!isValidFileSize(fileSize)) {
 *   throw new Error('File too large');
 * }
 */
export function isValidFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_FILE_SIZE;
}

/**
 * Get maximum allowed file size
 *
 * @returns Maximum file size in bytes
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

/**
 * Get list of allowed MIME types
 *
 * @returns Array of allowed MIME types
 */
export function getAllowedMimeTypes(): string[] {
  return [...ALLOWED_MIME_TYPES];
}

/**
 * Parse S3 URL to extract bucket and key
 *
 * @param s3Url - S3 URL in format s3://bucket/key
 * @returns Object with bucket and key
 *
 * @example
 * const { bucket, key } = parseS3Url('s3://whisper-audio/uploads/file.mp3');
 */
export function parseS3Url(s3Url: string): { bucket: string; key: string } {
  const match = s3Url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid S3 URL format: ${s3Url}`);
  }
  return {
    bucket: match[1],
    key: match[2],
  };
}

/**
 * Get file extension from filename
 *
 * @param filename - Filename
 * @returns File extension (lowercase, without dot)
 *
 * @private
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Validate file extension
 *
 * @param filename - Filename
 * @returns True if extension is allowed
 *
 * @example
 * if (!isValidFileExtension('audio.mp3')) {
 *   throw new Error('Invalid file extension');
 * }
 */
export function isValidFileExtension(filename: string): boolean {
  const allowedExtensions = (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,mp4,mpeg,webm')
    .split(',')
    .map(ext => ext.trim().toLowerCase());

  const extension = getFileExtension(filename);
  return allowedExtensions.includes(extension);
}

// Export client for testing purposes
export function getS3Client(): S3Client {
  return initializeS3Client();
}

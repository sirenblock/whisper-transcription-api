/**
 * @module DatabaseHelpers
 * @description Helper functions for common database operations
 *
 * @requires @prisma/client
 * @requires ./index
 *
 * @example
 * import { findUserByEmail, recordUsage } from './db/helpers';
 * const user = await findUserByEmail('user@example.com');
 * await recordUsage(user.id, transcriptionId, 5.5);
 *
 * @exports {Function} findUserByEmail - Find user by email address
 * @exports {Function} findUserByApiKeyHash - Find user by hashed API key
 * @exports {Function} getUserMonthlyUsage - Get user's current month usage
 * @exports {Function} hasExceededQuota - Check if user exceeded monthly quota
 * @exports {Function} recordUsage - Record transcription usage
 * @exports {Function} resetMonthlyUsage - Reset all users' monthly counters
 * @exports {Function} getUserTranscriptions - Get user's transcription history
 * @exports {Function} getTranscription - Get single transcription with auth check
 * @exports {Function} updateTranscriptionStatus - Update transcription status
 */

import { prisma } from './index';
import { Plan, TranscriptionStatus } from '@prisma/client';

/**
 * Find user by email address
 * Includes user's API keys (without sensitive hash)
 *
 * @param email - User's email address
 * @returns User object with API keys or null if not found
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      apiKeys: {
        select: {
          id: true,
          name: true,
          lastUsedAt: true,
          createdAt: true,
          // Never return keyHash for security
        },
      },
    },
  });
}

/**
 * Find user by API key hash
 * Updates the lastUsedAt timestamp on successful lookup
 *
 * @param keyHash - SHA-256 hash of the API key
 * @returns User object or null if key not found
 */
export async function findUserByApiKeyHash(keyHash: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    return null;
  }

  // Update last used timestamp asynchronously (don't await)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      console.error('Failed to update API key last used timestamp:', err);
    });

  return apiKey.user;
}

/**
 * Get user's monthly usage in minutes
 * Calculates from the start of the current calendar month
 *
 * @param userId - User's ID
 * @returns Total minutes used this month
 */
export async function getUserMonthlyUsage(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await prisma.usageLog.aggregate({
    where: {
      userId,
      timestamp: {
        gte: startOfMonth,
      },
    },
    _sum: {
      minutesUsed: true,
    },
  });

  return usage._sum.minutesUsed || 0;
}

/**
 * Check if user has exceeded their monthly quota
 *
 * @param userId - User's ID
 * @param plan - User's current plan (FREE, PRO, PAYG)
 * @returns True if quota exceeded, false otherwise
 */
export async function hasExceededQuota(userId: string, plan: Plan): Promise<boolean> {
  const QUOTAS: Record<Plan, number> = {
    FREE: 60,
    PRO: 600,
    PAYG: Infinity,
  };

  const usage = await getUserMonthlyUsage(userId);
  return usage >= QUOTAS[plan];
}

/**
 * Record usage for a transcription
 * Creates usage log entry and updates user's cached monthly usage
 *
 * @param userId - User's ID
 * @param transcriptionId - Transcription ID
 * @param minutesUsed - Minutes of audio transcribed
 */
export async function recordUsage(
  userId: string,
  transcriptionId: string,
  minutesUsed: number
) {
  // Use transaction to ensure both operations succeed or fail together
  await prisma.$transaction([
    prisma.usageLog.create({
      data: {
        userId,
        transcriptionId,
        minutesUsed,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        monthlyMinutesUsed: {
          increment: minutesUsed,
        },
      },
    }),
  ]);
}

/**
 * Reset monthly usage counters for all users
 * Should be run as a cron job on the 1st of each month
 *
 * @returns Number of users updated
 */
export async function resetMonthlyUsage(): Promise<number> {
  const result = await prisma.user.updateMany({
    data: {
      monthlyMinutesUsed: 0,
    },
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'db-helpers',
    message: 'Monthly usage reset completed',
    data: { usersUpdated: result.count },
  }));

  return result.count;
}

/**
 * Get user's transcription history
 * Returns paginated results ordered by creation date (newest first)
 *
 * @param userId - User's ID
 * @param limit - Maximum number of results (default: 50)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of transcription objects
 */
export async function getUserTranscriptions(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return prisma.transcription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      filename: true,
      status: true,
      model: true,
      format: true,
      durationSeconds: true,
      progress: true,
      createdAt: true,
      completedAt: true,
      s3ResultUrl: true,
      errorMessage: true,
      // Don't expose internal fields
      // s3AudioUrl, jobId
    },
  });
}

/**
 * Get transcription by ID with authorization check
 * Ensures the requesting user owns the transcription
 *
 * @param transcriptionId - Transcription ID
 * @param userId - User's ID (for authorization)
 * @returns Transcription object or null if not found/unauthorized
 */
export async function getTranscription(transcriptionId: string, userId: string) {
  return prisma.transcription.findFirst({
    where: {
      id: transcriptionId,
      userId, // Authorization: ensures user owns this transcription
    },
  });
}

/**
 * Update transcription status and related fields
 * Automatically sets completedAt timestamp for COMPLETED/FAILED status
 *
 * @param transcriptionId - Transcription ID
 * @param status - New status (QUEUED, PROCESSING, COMPLETED, FAILED)
 * @param data - Optional additional fields to update
 * @returns Updated transcription object
 */
export async function updateTranscriptionStatus(
  transcriptionId: string,
  status: TranscriptionStatus,
  data?: {
    progress?: number;
    durationSeconds?: number;
    s3ResultUrl?: string;
    errorMessage?: string;
  }
) {
  const updateData: any = { status };

  if (data?.progress !== undefined) {
    updateData.progress = data.progress;
  }
  if (data?.durationSeconds !== undefined) {
    updateData.durationSeconds = data.durationSeconds;
  }
  if (data?.s3ResultUrl) {
    updateData.s3ResultUrl = data.s3ResultUrl;
  }
  if (data?.errorMessage) {
    updateData.errorMessage = data.errorMessage;
  }

  // Auto-set completion timestamp
  if (status === TranscriptionStatus.COMPLETED || status === TranscriptionStatus.FAILED) {
    updateData.completedAt = new Date();
  }

  return prisma.transcription.update({
    where: { id: transcriptionId },
    data: updateData,
  });
}

/**
 * Create a new API key for a user
 *
 * @param userId - User's ID
 * @param keyHash - SHA-256 hash of the API key
 * @param name - Optional name for the key
 * @returns Created API key object
 */
export async function createApiKey(userId: string, keyHash: string, name?: string) {
  return prisma.apiKey.create({
    data: {
      userId,
      keyHash,
      name,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      // Never return keyHash
    },
  });
}

/**
 * Delete an API key
 *
 * @param keyId - API key ID
 * @param userId - User's ID (for authorization)
 * @returns Deleted API key object or null if not found/unauthorized
 */
export async function deleteApiKey(keyId: string, userId: string) {
  // Verify ownership before deletion
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: keyId,
      userId,
    },
  });

  if (!apiKey) {
    return null;
  }

  return prisma.apiKey.delete({
    where: { id: keyId },
  });
}

/**
 * Create a new transcription job
 *
 * @param data - Transcription data
 * @returns Created transcription object
 */
export async function createTranscription(data: {
  userId: string;
  filename: string;
  model: 'BASE' | 'SMALL' | 'MEDIUM';
  format: 'JSON' | 'SRT' | 'VTT' | 'TXT';
  s3AudioUrl: string;
  jobId?: string;
}) {
  return prisma.transcription.create({
    data: {
      userId: data.userId,
      filename: data.filename,
      model: data.model,
      format: data.format,
      s3AudioUrl: data.s3AudioUrl,
      jobId: data.jobId,
      status: TranscriptionStatus.QUEUED,
      progress: 0,
    },
  });
}

/**
 * Get transcription by job ID (used by workers)
 *
 * @param jobId - BullMQ job ID
 * @returns Transcription object or null if not found
 */
export async function getTranscriptionByJobId(jobId: string) {
  return prisma.transcription.findUnique({
    where: { jobId },
  });
}

/**
 * Update user's Stripe customer ID
 *
 * @param userId - User's ID
 * @param stripeCustomerId - Stripe customer ID
 * @returns Updated user object
 */
export async function updateUserStripeCustomer(userId: string, stripeCustomerId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId },
  });
}

/**
 * Update user's plan
 *
 * @param userId - User's ID
 * @param plan - New plan (FREE, PRO, PAYG)
 * @returns Updated user object
 */
export async function updateUserPlan(userId: string, plan: Plan) {
  return prisma.user.update({
    where: { id: userId },
    data: { plan },
  });
}

/**
 * Get or create user by email
 * Used for new user registration
 *
 * @param email - User's email address
 * @returns User object
 */
export async function getOrCreateUser(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      plan: Plan.FREE,
    },
  });
}

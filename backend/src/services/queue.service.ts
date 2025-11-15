/**
 * @module QueueService
 * @description BullMQ-based job queue for transcription processing
 *
 * Manages transcription job queuing, status tracking, and worker coordination.
 * Supports priority-based processing and automatic retries.
 *
 * @requires bullmq
 * @requires ioredis
 * @requires prisma
 *
 * @example
 * // Add a job to the queue
 * const jobId = await addTranscriptionJob({
 *   transcriptionId: 'cuid123',
 *   userId: 'user123',
 *   s3AudioUrl: 'https://s3.../audio.mp3',
 *   model: 'BASE',
 *   format: 'JSON'
 * }, 5); // PRO priority
 *
 * @exports {Function} addTranscriptionJob - Add job to queue
 * @exports {Function} getJobStatus - Get current job status
 * @exports {Function} createWorker - Create worker instance
 * @exports {Function} updateJobProgress - Update job progress
 * @exports {Function} cancelJob - Cancel pending job
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Redis connection configuration
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Job data interface for transcription jobs
 */
export interface TranscriptionJobData {
  transcriptionId: string;
  userId: string;
  s3AudioUrl: string;
  model: 'BASE' | 'SMALL' | 'MEDIUM';
  format: 'JSON' | 'SRT' | 'VTT' | 'TXT';
}

/**
 * Job priority levels based on user plan
 */
export const JOB_PRIORITIES = {
  FREE: 1,
  PRO: 5,
  PAYG: 10,
} as const;

/**
 * Job result interface
 */
export interface TranscriptionJobResult {
  s3ResultUrl: string;
  durationSeconds: number;
  completedAt: Date;
}

// Create transcription queue
export const transcriptionQueue = new Queue<TranscriptionJobData>('transcription', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

// Queue events for monitoring
const queueEvents = new QueueEvents('transcription', { connection });

/**
 * Add transcription job to queue
 *
 * @param data - Job data containing transcription details
 * @param priority - Job priority (1-10, higher = more important)
 * @returns Job ID
 *
 * @throws Error if job creation fails
 */
export async function addTranscriptionJob(
  data: TranscriptionJobData,
  priority?: number
): Promise<string> {
  try {
    // Validate input
    if (!data.transcriptionId || !data.userId || !data.s3AudioUrl) {
      throw new Error('Missing required job data');
    }

    // Add job to queue
    const job = await transcriptionQueue.add('transcribe', data, {
      priority: priority || JOB_PRIORITIES.FREE,
      jobId: data.transcriptionId, // Use transcription ID as job ID for easy lookup
    });

    // Update database status
    await prisma.transcription.update({
      where: { id: data.transcriptionId },
      data: {
        status: 'QUEUED',
        jobId: job.id,
      },
    });

    _log('info', 'Job added to queue', {
      jobId: job.id,
      transcriptionId: data.transcriptionId,
      priority,
    });

    return job.id!;
  } catch (error) {
    _log('error', 'Failed to add job to queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
      transcriptionId: data.transcriptionId,
    });
    throw error;
  }
}

/**
 * Get job status and details
 *
 * @param jobId - Job ID to query
 * @returns Job status object or null if not found
 */
export async function getJobStatus(jobId: string) {
  try {
    const job = await transcriptionQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = (job.progress as number) || 0;

    return {
      id: job.id,
      status: state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    };
  } catch (error) {
    _log('error', 'Failed to get job status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId,
    });
    return null;
  }
}

/**
 * Update job progress (called by workers)
 *
 * @param jobId - Job ID
 * @param progress - Progress percentage (0-100)
 */
export async function updateJobProgress(jobId: string, progress: number): Promise<void> {
  try {
    const job = await transcriptionQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.updateProgress(progress);

    // Also update database
    await prisma.transcription.update({
      where: { id: jobId },
      data: { progress },
    });

    _log('info', 'Job progress updated', { jobId, progress });
  } catch (error) {
    _log('error', 'Failed to update job progress', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId,
      progress,
    });
  }
}

/**
 * Cancel a pending job
 *
 * @param jobId - Job ID to cancel
 * @returns True if cancelled, false if not found or already processing
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const job = await transcriptionQueue.getJob(jobId);

    if (!job) {
      return false;
    }

    const state = await job.getState();

    // Can only cancel waiting or delayed jobs
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();

      // Update database
      await prisma.transcription.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: 'Job cancelled by user',
        },
      });

      _log('info', 'Job cancelled', { jobId });
      return true;
    }

    return false;
  } catch (error) {
    _log('error', 'Failed to cancel job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId,
    });
    return false;
  }
}

/**
 * Get queue statistics
 *
 * @returns Queue metrics
 */
export async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      transcriptionQueue.getWaitingCount(),
      transcriptionQueue.getActiveCount(),
      transcriptionQueue.getCompletedCount(),
      transcriptionQueue.getFailedCount(),
      transcriptionQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    _log('error', 'Failed to get queue stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Create worker instance (called in worker process)
 *
 * @param processor - Async function to process jobs
 * @param concurrency - Number of concurrent jobs (default: 2)
 * @returns Worker instance
 *
 * @example
 * const worker = createWorker(async (job) => {
 *   await job.updateProgress(25);
 *   // Process transcription...
 *   await job.updateProgress(100);
 *   return { s3ResultUrl: 'https://...', durationSeconds: 120 };
 * });
 */
export function createWorker(
  processor: (job: Job<TranscriptionJobData>) => Promise<TranscriptionJobResult>,
  concurrency: number = 2
): Worker<TranscriptionJobData, TranscriptionJobResult> {
  const worker = new Worker<TranscriptionJobData, TranscriptionJobResult>(
    'transcription',
    async (job) => {
      _log('info', 'Processing job', {
        jobId: job.id,
        transcriptionId: job.data.transcriptionId,
        attempt: job.attemptsMade + 1,
      });

      try {
        // Update status to PROCESSING
        await prisma.transcription.update({
          where: { id: job.data.transcriptionId },
          data: { status: 'PROCESSING' },
        });

        // Process the job
        const result = await processor(job);

        // Update status to COMPLETED
        await prisma.transcription.update({
          where: { id: job.data.transcriptionId },
          data: {
            status: 'COMPLETED',
            s3ResultUrl: result.s3ResultUrl,
            durationSeconds: result.durationSeconds,
            completedAt: result.completedAt,
            progress: 100,
          },
        });

        _log('info', 'Job completed', {
          jobId: job.id,
          transcriptionId: job.data.transcriptionId,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        _log('error', 'Job failed', {
          jobId: job.id,
          transcriptionId: job.data.transcriptionId,
          error: errorMessage,
          attempt: job.attemptsMade + 1,
        });

        // Update status to FAILED (only if no more retries)
        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
          await prisma.transcription.update({
            where: { id: job.data.transcriptionId },
            data: {
              status: 'FAILED',
              errorMessage,
            },
          });
        }

        throw error;
      }
    },
    {
      connection,
      concurrency,
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // Per second
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    _log('info', 'Worker completed job', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    _log('error', 'Worker failed job', {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    _log('error', 'Worker error', { error: err.message });
  });

  return worker;
}

/**
 * Retry a failed job
 *
 * @param jobId - Job ID to retry
 * @returns True if retried successfully
 */
export async function retryFailedJob(jobId: string): Promise<boolean> {
  try {
    const job = await transcriptionQueue.getJob(jobId);

    if (!job) {
      return false;
    }

    const state = await job.getState();

    if (state === 'failed') {
      await job.retry();

      await prisma.transcription.update({
        where: { id: jobId },
        data: {
          status: 'QUEUED',
          errorMessage: null,
        },
      });

      _log('info', 'Job retried', { jobId });
      return true;
    }

    return false;
  } catch (error) {
    _log('error', 'Failed to retry job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId,
    });
    return false;
  }
}

/**
 * Clean up old jobs from queue
 *
 * @param olderThan - Remove jobs older than this many milliseconds (default: 24h)
 */
export async function cleanupOldJobs(olderThan: number = 86400000): Promise<void> {
  try {
    await transcriptionQueue.clean(olderThan, 1000, 'completed');
    await transcriptionQueue.clean(olderThan * 7, 100, 'failed'); // Keep failed jobs for 7 days

    _log('info', 'Old jobs cleaned up', { olderThan });
  } catch (error) {
    _log('error', 'Failed to clean up jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  _log('info', 'Shutting down queue service');

  try {
    await transcriptionQueue.close();
    await queueEvents.close();
    await connection.quit();
    await prisma.$disconnect();

    _log('info', 'Queue service shut down successfully');
  } catch (error) {
    _log('error', 'Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Internal logging function
 * @private
 */
function _log(
  level: 'info' | 'error' | 'warn',
  message: string,
  data?: Record<string, any>
): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      module: 'queue-service',
      message,
      ...data,
    })
  );
}

// Export queue and events for advanced usage
export { transcriptionQueue, queueEvents };

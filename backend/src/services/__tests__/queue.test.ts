/**
 * @module QueueServiceTests
 * @description Comprehensive tests for BullMQ queue service
 */

import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import {
  addTranscriptionJob,
  getJobStatus,
  createWorker,
  updateJobProgress,
  cancelJob,
  getQueueStats,
  retryFailedJob,
  cleanupOldJobs,
  transcriptionQueue,
  JOB_PRIORITIES,
  TranscriptionJobData,
  TranscriptionJobResult,
} from '../queue.service';

// Mock dependencies
jest.mock('ioredis');
jest.mock('bullmq');
jest.mock('@prisma/client');

const mockPrisma = {
  transcription: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

// Mock BullMQ
const mockJob = {
  id: 'job-123',
  data: {
    transcriptionId: 'trans-123',
    userId: 'user-123',
    s3AudioUrl: 'https://s3.example.com/audio.mp3',
    model: 'BASE' as const,
    format: 'JSON' as const,
  },
  progress: 0,
  attemptsMade: 0,
  opts: { attempts: 3 },
  updateProgress: jest.fn(),
  getState: jest.fn(),
  remove: jest.fn(),
  retry: jest.fn(),
  returnvalue: null,
  failedReason: null,
  processedOn: Date.now(),
  finishedOn: null,
};

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
  getWaitingCount: jest.fn(),
  getActiveCount: jest.fn(),
  getCompletedCount: jest.fn(),
  getFailedCount: jest.fn(),
  getDelayedCount: jest.fn(),
  clean: jest.fn(),
  close: jest.fn(),
};

const mockWorker = {
  on: jest.fn(),
  close: jest.fn(),
};

// Replace actual implementations with mocks
(Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => mockQueue as any);
(Worker as jest.MockedClass<typeof Worker>).mockImplementation(() => mockWorker as any);

describe('QueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addTranscriptionJob', () => {
    const validJobData: TranscriptionJobData = {
      transcriptionId: 'trans-123',
      userId: 'user-123',
      s3AudioUrl: 'https://s3.example.com/audio.mp3',
      model: 'BASE',
      format: 'JSON',
    };

    it('should add job to queue with default priority', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-123' });
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const jobId = await addTranscriptionJob(validJobData);

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith('transcribe', validJobData, {
        priority: JOB_PRIORITIES.FREE,
        jobId: validJobData.transcriptionId,
      });
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: validJobData.transcriptionId },
        data: {
          status: 'QUEUED',
          jobId: 'job-123',
        },
      });
    });

    it('should add job with custom priority', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-124' });
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const jobId = await addTranscriptionJob(validJobData, JOB_PRIORITIES.PRO);

      expect(jobId).toBe('job-124');
      expect(mockQueue.add).toHaveBeenCalledWith('transcribe', validJobData, {
        priority: JOB_PRIORITIES.PRO,
        jobId: validJobData.transcriptionId,
      });
    });

    it('should handle missing required fields', async () => {
      const invalidData = {
        transcriptionId: '',
        userId: 'user-123',
        s3AudioUrl: 'https://s3.example.com/audio.mp3',
        model: 'BASE' as const,
        format: 'JSON' as const,
      };

      await expect(addTranscriptionJob(invalidData)).rejects.toThrow(
        'Missing required job data'
      );
    });

    it('should handle queue errors', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection failed'));

      await expect(addTranscriptionJob(validJobData)).rejects.toThrow(
        'Redis connection failed'
      );
    });

    it('should handle database errors', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-125' });
      mockPrisma.transcription.update = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(addTranscriptionJob(validJobData)).rejects.toThrow('Database error');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const mockJobWithState = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('active'),
        progress: 50,
      };

      mockQueue.getJob.mockResolvedValue(mockJobWithState);

      const status = await getJobStatus('job-123');

      expect(status).toEqual({
        id: 'job-123',
        status: 'active',
        progress: 50,
        data: mockJob.data,
        returnvalue: null,
        failedReason: null,
        processedOn: mockJob.processedOn,
        finishedOn: null,
        attemptsMade: 0,
      });
    });

    it('should return null for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const status = await getJobStatus('non-existent');

      expect(status).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockQueue.getJob.mockRejectedValue(new Error('Redis error'));

      const status = await getJobStatus('job-123');

      expect(status).toBeNull();
    });

    it('should handle jobs with zero progress', async () => {
      const mockJobWithState = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('waiting'),
        progress: 0,
      };

      mockQueue.getJob.mockResolvedValue(mockJobWithState);

      const status = await getJobStatus('job-123');

      expect(status?.progress).toBe(0);
    });
  });

  describe('updateJobProgress', () => {
    it('should update job progress', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      await updateJobProgress('job-123', 75);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(75);
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: { progress: 75 },
      });
    });

    it('should handle non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      // Should not throw, just log error
      await expect(updateJobProgress('non-existent', 50)).rejects.toThrow(
        'Job non-existent not found'
      );
    });

    it('should handle progress values from 0 to 100', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      await updateJobProgress('job-123', 0);
      await updateJobProgress('job-123', 100);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(0);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('cancelJob', () => {
    it('should cancel waiting job', async () => {
      const mockWaitingJob = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('waiting'),
      };

      mockQueue.getJob.mockResolvedValue(mockWaitingJob);
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const result = await cancelJob('job-123');

      expect(result).toBe(true);
      expect(mockWaitingJob.remove).toHaveBeenCalled();
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'FAILED',
          errorMessage: 'Job cancelled by user',
        },
      });
    });

    it('should cancel delayed job', async () => {
      const mockDelayedJob = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('delayed'),
      };

      mockQueue.getJob.mockResolvedValue(mockDelayedJob);
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const result = await cancelJob('job-123');

      expect(result).toBe(true);
    });

    it('should not cancel active job', async () => {
      const mockActiveJob = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('active'),
      };

      mockQueue.getJob.mockResolvedValue(mockActiveJob);

      const result = await cancelJob('job-123');

      expect(result).toBe(false);
      expect(mockActiveJob.remove).not.toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const result = await cancelJob('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);

      const stats = await getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        total: 111,
      });
    });

    it('should handle errors', async () => {
      mockQueue.getWaitingCount.mockRejectedValue(new Error('Redis error'));

      await expect(getQueueStats()).rejects.toThrow('Redis error');
    });
  });

  describe('createWorker', () => {
    it('should create worker with default concurrency', () => {
      const processor = jest.fn();

      const worker = createWorker(processor);

      expect(Worker).toHaveBeenCalledWith(
        'transcription',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 2,
        })
      );
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should create worker with custom concurrency', () => {
      const processor = jest.fn();

      createWorker(processor, 5);

      expect(Worker).toHaveBeenCalledWith(
        'transcription',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });

    it('should process job successfully', async () => {
      const mockResult: TranscriptionJobResult = {
        s3ResultUrl: 'https://s3.example.com/result.json',
        durationSeconds: 120,
        completedAt: new Date(),
      };

      const processor = jest.fn().mockResolvedValue(mockResult);
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      // Get the processor function passed to Worker constructor
      createWorker(processor);
      const workerProcessor = (Worker as jest.MockedClass<typeof Worker>).mock
        .calls[0][1] as Function;

      const result = await workerProcessor(mockJob);

      expect(processor).toHaveBeenCalledWith(mockJob);
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: { status: 'PROCESSING' },
      });
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: {
          status: 'COMPLETED',
          s3ResultUrl: mockResult.s3ResultUrl,
          durationSeconds: mockResult.durationSeconds,
          completedAt: mockResult.completedAt,
          progress: 100,
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle job failure with retries remaining', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('Processing failed'));
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const jobWithRetries = {
        ...mockJob,
        attemptsMade: 0,
        opts: { attempts: 3 },
      };

      createWorker(processor);
      const workerProcessor = (Worker as jest.MockedClass<typeof Worker>).mock
        .calls[0][1] as Function;

      await expect(workerProcessor(jobWithRetries)).rejects.toThrow('Processing failed');

      // Should not mark as FAILED yet
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: { status: 'PROCESSING' },
      });
      expect(mockPrisma.transcription.update).not.toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });

    it('should mark job as FAILED when no retries remaining', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('Processing failed'));
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const jobNoRetries = {
        ...mockJob,
        attemptsMade: 2, // Last attempt
        opts: { attempts: 3 },
      };

      createWorker(processor);
      const workerProcessor = (Worker as jest.MockedClass<typeof Worker>).mock
        .calls[0][1] as Function;

      await expect(workerProcessor(jobNoRetries)).rejects.toThrow('Processing failed');

      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: {
          status: 'FAILED',
          errorMessage: 'Processing failed',
        },
      });
    });
  });

  describe('retryFailedJob', () => {
    it('should retry failed job', async () => {
      const mockFailedJob = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('failed'),
      };

      mockQueue.getJob.mockResolvedValue(mockFailedJob);
      mockPrisma.transcription.update = jest.fn().mockResolvedValue({});

      const result = await retryFailedJob('job-123');

      expect(result).toBe(true);
      expect(mockFailedJob.retry).toHaveBeenCalled();
      expect(mockPrisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'QUEUED',
          errorMessage: null,
        },
      });
    });

    it('should not retry non-failed job', async () => {
      const mockActiveJob = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('active'),
      };

      mockQueue.getJob.mockResolvedValue(mockActiveJob);

      const result = await retryFailedJob('job-123');

      expect(result).toBe(false);
      expect(mockActiveJob.retry).not.toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const result = await retryFailedJob('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should clean up old jobs with default retention', async () => {
      mockQueue.clean.mockResolvedValue([]);

      await cleanupOldJobs();

      expect(mockQueue.clean).toHaveBeenCalledWith(86400000, 1000, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(604800000, 100, 'failed');
    });

    it('should clean up old jobs with custom retention', async () => {
      mockQueue.clean.mockResolvedValue([]);

      await cleanupOldJobs(3600000); // 1 hour

      expect(mockQueue.clean).toHaveBeenCalledWith(3600000, 1000, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(25200000, 100, 'failed');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockQueue.clean.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw
      await expect(cleanupOldJobs()).resolves.toBeUndefined();
    });
  });

  describe('JOB_PRIORITIES', () => {
    it('should have correct priority values', () => {
      expect(JOB_PRIORITIES.FREE).toBe(1);
      expect(JOB_PRIORITIES.PRO).toBe(5);
      expect(JOB_PRIORITIES.PAYG).toBe(10);
    });
  });
});

/**
 * @jest-environment node
 */

import request from 'supertest';
import express from 'express';
import transcriptionRoutes from '../../routes/transcription.routes';
import { authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware';
import * as s3Service from '../../services/s3.service';
import * as queueService from '../../services/queue.service';
import { prisma } from '../../db';

// Mock dependencies
jest.mock('../../middleware/auth.middleware');
jest.mock('../../middleware/rateLimit.middleware');
jest.mock('../../services/s3.service');
jest.mock('../../services/queue.service');
jest.mock('../../db', () => ({
  prisma: {
    transcription: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1', transcriptionRoutes);

describe('Transcription Routes', () => {
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      plan: 'PRO',
      monthlyMinutesUsed: 0,
    };

    // Mock auth middleware to pass through
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Mock rate limit middleware to pass through
    (rateLimitMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      next();
    });
  });

  describe('POST /api/v1/transcribe', () => {
    it('should successfully initiate transcription', async () => {
      const mockUploadUrl = 'https://s3.example.com/upload/test.mp3';
      const mockS3Key = 'audio/user-123/test-id.mp3';
      const mockTranscription = {
        id: 'trans-123',
        userId: 'user-123',
        filename: 'test.mp3',
        model: 'BASE',
        format: 'JSON',
        status: 'QUEUED',
        s3AudioUrl: mockS3Key,
        createdAt: new Date(),
      };

      (s3Service.generateUploadUrl as jest.Mock).mockResolvedValue({
        uploadUrl: mockUploadUrl,
        s3Key: mockS3Key,
      });

      (prisma.transcription.create as jest.Mock).mockResolvedValue(mockTranscription);
      (queueService.addTranscriptionJob as jest.Mock).mockResolvedValue({ id: 'job-123' });

      const response = await request(app)
        .post('/api/v1/transcribe')
        .send({
          filename: 'test.mp3',
          contentType: 'audio/mpeg',
          model: 'BASE',
          format: 'JSON',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transcriptionId');
      expect(response.body.data).toHaveProperty('uploadUrl');
      expect(response.body.data).toHaveProperty('statusUrl');
      expect(response.body.data.uploadUrl).toBe(mockUploadUrl);

      expect(s3Service.generateUploadUrl).toHaveBeenCalledWith(
        'user-123',
        'test.mp3',
        'audio/mpeg'
      );
      expect(prisma.transcription.create).toHaveBeenCalled();
      expect(queueService.addTranscriptionJob).toHaveBeenCalled();
    });

    it('should return 400 for invalid filename', async () => {
      const response = await request(app)
        .post('/api/v1/transcribe')
        .send({
          filename: '',
          contentType: 'audio/mpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for invalid content type', async () => {
      const response = await request(app)
        .post('/api/v1/transcribe')
        .send({
          filename: 'test.mp3',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/transcribe')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should use default model and format if not provided', async () => {
      (s3Service.generateUploadUrl as jest.Mock).mockResolvedValue({
        uploadUrl: 'https://s3.example.com/upload',
        s3Key: 'key',
      });

      (prisma.transcription.create as jest.Mock).mockResolvedValue({
        id: 'trans-123',
        userId: 'user-123',
        filename: 'test.mp3',
        model: 'BASE',
        format: 'JSON',
        status: 'QUEUED',
        s3AudioUrl: 'key',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/v1/transcribe')
        .send({
          filename: 'test.mp3',
          contentType: 'audio/mpeg',
        });

      expect(response.status).toBe(200);
      const createCall = (prisma.transcription.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.model).toBe('BASE');
      expect(createCall.data.format).toBe('JSON');
    });

    it('should handle S3 upload URL generation failure', async () => {
      (s3Service.generateUploadUrl as jest.Mock).mockRejectedValue(
        new Error('S3 error')
      );

      const response = await request(app)
        .post('/api/v1/transcribe')
        .send({
          filename: 'test.mp3',
          contentType: 'audio/mpeg',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRANSCRIPTION_FAILED');
    });
  });

  describe('GET /api/v1/status/:id', () => {
    it('should return transcription status', async () => {
      const mockTranscription = {
        id: 'trans-123',
        userId: 'user-123',
        filename: 'test.mp3',
        model: 'BASE',
        format: 'JSON',
        status: 'PROCESSING',
        progress: 50,
        durationSeconds: null,
        createdAt: new Date(),
        completedAt: null,
        s3ResultUrl: null,
        errorMessage: null,
        jobId: 'job-123',
      };

      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(mockTranscription);
      (queueService.getJobStatus as jest.Mock).mockResolvedValue({ progress: 50 });

      const response = await request(app).get('/api/v1/status/trans-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('trans-123');
      expect(response.body.data.status).toBe('PROCESSING');
      expect(response.body.data.progress).toBe(50);
    });

    it('should return 404 for non-existent transcription', async () => {
      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/status/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TRANSCRIPTION_NOT_FOUND');
    });

    it('should include download URL for completed transcription', async () => {
      const mockTranscription = {
        id: 'trans-123',
        userId: 'user-123',
        filename: 'test.mp3',
        model: 'BASE',
        format: 'JSON',
        status: 'COMPLETED',
        progress: 100,
        durationSeconds: 120,
        createdAt: new Date(),
        completedAt: new Date(),
        s3ResultUrl: 'results/trans-123.json',
        errorMessage: null,
        jobId: 'job-123',
      };

      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(mockTranscription);
      (s3Service.getDownloadUrl as jest.Mock).mockResolvedValue('https://s3.example.com/download');

      const response = await request(app).get('/api/v1/status/trans-123');

      expect(response.status).toBe(200);
      expect(response.body.data.downloadUrl).toBe('https://s3.example.com/download');
    });

    it('should include error message for failed transcription', async () => {
      const mockTranscription = {
        id: 'trans-123',
        userId: 'user-123',
        filename: 'test.mp3',
        model: 'BASE',
        format: 'JSON',
        status: 'FAILED',
        progress: 0,
        durationSeconds: null,
        createdAt: new Date(),
        completedAt: new Date(),
        s3ResultUrl: null,
        errorMessage: 'Transcription failed due to invalid audio format',
        jobId: 'job-123',
      };

      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(mockTranscription);

      const response = await request(app).get('/api/v1/status/trans-123');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('FAILED');
      expect(response.body.data.errorMessage).toBeTruthy();
    });
  });

  describe('GET /api/v1/transcriptions', () => {
    it('should return list of transcriptions', async () => {
      const mockTranscriptions = [
        {
          id: 'trans-1',
          filename: 'test1.mp3',
          model: 'BASE',
          format: 'JSON',
          status: 'COMPLETED',
          durationSeconds: 120,
          progress: 100,
          createdAt: new Date(),
          completedAt: new Date(),
          errorMessage: null,
        },
        {
          id: 'trans-2',
          filename: 'test2.mp3',
          model: 'SMALL',
          format: 'SRT',
          status: 'PROCESSING',
          durationSeconds: null,
          progress: 50,
          createdAt: new Date(),
          completedAt: null,
          errorMessage: null,
        },
      ];

      (prisma.transcription.findMany as jest.Mock).mockResolvedValue(mockTranscriptions);
      (prisma.transcription.count as jest.Mock).mockResolvedValue(2);

      const response = await request(app).get('/api/v1/transcriptions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transcriptions).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should support pagination', async () => {
      (prisma.transcription.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transcription.count as jest.Mock).mockResolvedValue(100);

      const response = await request(app)
        .get('/api/v1/transcriptions')
        .query({ limit: '10', offset: '20' });

      expect(response.status).toBe(200);
      expect(prisma.transcription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should support status filtering', async () => {
      (prisma.transcription.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transcription.count as jest.Mock).mockResolvedValue(0);

      const response = await request(app)
        .get('/api/v1/transcriptions')
        .query({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(prisma.transcription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should enforce maximum limit of 100', async () => {
      (prisma.transcription.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transcription.count as jest.Mock).mockResolvedValue(0);

      const response = await request(app)
        .get('/api/v1/transcriptions')
        .query({ limit: '500' });

      expect(response.status).toBe(200);
      expect(prisma.transcription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        })
      );
    });
  });

  describe('GET /api/v1/download/:id', () => {
    it('should return download URL for completed transcription', async () => {
      const mockTranscription = {
        id: 'trans-123',
        userId: 'user-123',
        filename: 'test.mp3',
        format: 'JSON',
        status: 'COMPLETED',
        s3ResultUrl: 'results/trans-123.json',
      };

      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(mockTranscription);
      (s3Service.getDownloadUrl as jest.Mock).mockResolvedValue('https://s3.example.com/download');

      const response = await request(app).get('/api/v1/download/trans-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.downloadUrl).toBe('https://s3.example.com/download');
      expect(response.body.data.filename).toBe('test.mp3');
      expect(response.body.data.format).toBe('JSON');
    });

    it('should return 404 for non-existent transcription', async () => {
      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/download/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-completed transcription', async () => {
      const mockTranscription = {
        id: 'trans-123',
        userId: 'user-123',
        status: 'PROCESSING',
        s3ResultUrl: null,
      };

      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(mockTranscription);

      const response = await request(app).get('/api/v1/download/trans-123');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('TRANSCRIPTION_NOT_READY');
    });
  });

  describe('GET /api/v1/usage', () => {
    it('should return usage statistics', async () => {
      const mockUser = {
        plan: 'PRO',
        monthlyMinutesUsed: 120,
        createdAt: new Date('2024-01-01'),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.transcription.count as jest.Mock).mockResolvedValue(15);

      const response = await request(app).get('/api/v1/usage');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plan).toBe('PRO');
      expect(response.body.data.minutesUsed).toBe(120);
      expect(response.body.data.quota).toBe(600);
      expect(response.body.data.remaining).toBe(480);
      expect(response.body.data.percentageUsed).toBe(20);
    });

    it('should handle PAYG plan with unlimited quota', async () => {
      const mockUser = {
        plan: 'PAYG',
        monthlyMinutesUsed: 1000,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.transcription.count as jest.Mock).mockResolvedValue(100);

      const response = await request(app).get('/api/v1/usage');

      expect(response.status).toBe(200);
      expect(response.body.data.quota).toBe('unlimited');
      expect(response.body.data.remaining).toBe('unlimited');
    });
  });
});

/**
 * @module DatabaseHelpersTests
 * @description Unit tests for database helper functions
 */

import { PrismaClient, Plan } from '@prisma/client';
import {
  findUserByEmail,
  findUserByApiKeyHash,
  getUserMonthlyUsage,
  hasExceededQuota,
  recordUsage,
  resetMonthlyUsage,
  getUserTranscriptions,
  getTranscription,
  updateTranscriptionStatus,
  createApiKey,
  deleteApiKey,
  createTranscription,
  getTranscriptionByJobId,
  updateUserStripeCustomer,
  updateUserPlan,
  getOrCreateUser,
} from '../helpers';
import { prisma } from '../index';
import crypto from 'crypto';

// Mock Prisma client for testing
jest.mock('../index', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    apiKey: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    transcription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    usageLog: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Database Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('should find user by email with API keys', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        plan: 'FREE' as Plan,
        apiKeys: [
          {
            id: 'key_123',
            name: 'Test Key',
            lastUsedAt: new Date(),
            createdAt: new Date(),
          },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await findUserByEmail('test@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          apiKeys: {
            select: {
              id: true,
              name: true,
              lastUsedAt: true,
              createdAt: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserByApiKeyHash', () => {
    it('should find user by API key hash and update lastUsedAt', async () => {
      const mockApiKey = {
        id: 'key_123',
        keyHash: 'hash123',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          plan: 'FREE' as Plan,
        },
      };

      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(mockApiKey);
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

      const result = await findUserByApiKeyHash('hash123');

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { keyHash: 'hash123' },
        include: { user: true },
      });
      expect(result).toEqual(mockApiKey.user);
    });

    it('should return null for invalid API key hash', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await findUserByApiKeyHash('invalid_hash');

      expect(result).toBeNull();
    });
  });

  describe('getUserMonthlyUsage', () => {
    it('should calculate monthly usage correctly', async () => {
      const mockAggregate = {
        _sum: {
          minutesUsed: 45.5,
        },
      };

      (prisma.usageLog.aggregate as jest.Mock).mockResolvedValue(mockAggregate);

      const result = await getUserMonthlyUsage('user_123');

      expect(result).toBe(45.5);
      expect(prisma.usageLog.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          timestamp: {
            gte: expect.any(Date),
          },
        },
        _sum: {
          minutesUsed: true,
        },
      });
    });

    it('should return 0 when no usage exists', async () => {
      const mockAggregate = {
        _sum: {
          minutesUsed: null,
        },
      };

      (prisma.usageLog.aggregate as jest.Mock).mockResolvedValue(mockAggregate);

      const result = await getUserMonthlyUsage('user_123');

      expect(result).toBe(0);
    });
  });

  describe('hasExceededQuota', () => {
    it('should return true when FREE user exceeds 60 minutes', async () => {
      (prisma.usageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { minutesUsed: 65 },
      });

      const result = await hasExceededQuota('user_123', Plan.FREE);

      expect(result).toBe(true);
    });

    it('should return false when FREE user is under 60 minutes', async () => {
      (prisma.usageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { minutesUsed: 45 },
      });

      const result = await hasExceededQuota('user_123', Plan.FREE);

      expect(result).toBe(false);
    });

    it('should return true when PRO user exceeds 600 minutes', async () => {
      (prisma.usageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { minutesUsed: 650 },
      });

      const result = await hasExceededQuota('user_123', Plan.PRO);

      expect(result).toBe(true);
    });

    it('should return false for PAYG users (unlimited)', async () => {
      (prisma.usageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { minutesUsed: 10000 },
      });

      const result = await hasExceededQuota('user_123', Plan.PAYG);

      expect(result).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('should create usage log and update user counter', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      await recordUsage('user_123', 'trans_123', 30.5);

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({
          data: {
            userId: 'user_123',
            transcriptionId: 'trans_123',
            minutesUsed: 30.5,
          },
        }),
        expect.any(Object),
      ]);
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should reset all users monthly usage counters', async () => {
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 150 });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await resetMonthlyUsage();

      expect(result).toBe(150);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        data: {
          monthlyMinutesUsed: 0,
        },
      });

      consoleSpy.mockRestore();
    });
  });

  describe('getUserTranscriptions', () => {
    it('should return paginated transcription history', async () => {
      const mockTranscriptions = [
        {
          id: 'trans_1',
          filename: 'test1.mp3',
          status: 'COMPLETED',
          model: 'BASE',
          format: 'JSON',
        },
        {
          id: 'trans_2',
          filename: 'test2.mp3',
          status: 'PROCESSING',
          model: 'SMALL',
          format: 'SRT',
        },
      ];

      (prisma.transcription.findMany as jest.Mock).mockResolvedValue(mockTranscriptions);

      const result = await getUserTranscriptions('user_123', 10, 0);

      expect(result).toEqual(mockTranscriptions);
      expect(prisma.transcription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
        select: expect.any(Object),
      });
    });
  });

  describe('getTranscription', () => {
    it('should return transcription if user owns it', async () => {
      const mockTranscription = {
        id: 'trans_123',
        userId: 'user_123',
        filename: 'test.mp3',
      };

      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(mockTranscription);

      const result = await getTranscription('trans_123', 'user_123');

      expect(result).toEqual(mockTranscription);
      expect(prisma.transcription.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'trans_123',
          userId: 'user_123',
        },
      });
    });

    it('should return null if user does not own transcription', async () => {
      (prisma.transcription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getTranscription('trans_123', 'wrong_user');

      expect(result).toBeNull();
    });
  });

  describe('updateTranscriptionStatus', () => {
    it('should update status and progress', async () => {
      const mockUpdated = {
        id: 'trans_123',
        status: 'PROCESSING',
        progress: 50,
      };

      (prisma.transcription.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await updateTranscriptionStatus('trans_123', 'PROCESSING', {
        progress: 50,
      });

      expect(result).toEqual(mockUpdated);
    });

    it('should set completedAt when status is COMPLETED', async () => {
      (prisma.transcription.update as jest.Mock).mockResolvedValue({});

      await updateTranscriptionStatus('trans_123', 'COMPLETED', {
        s3ResultUrl: 's3://bucket/result.json',
      });

      expect(prisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'trans_123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should set completedAt when status is FAILED', async () => {
      (prisma.transcription.update as jest.Mock).mockResolvedValue({});

      await updateTranscriptionStatus('trans_123', 'FAILED', {
        errorMessage: 'Processing failed',
      });

      expect(prisma.transcription.update).toHaveBeenCalledWith({
        where: { id: 'trans_123' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Processing failed',
          completedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('createApiKey', () => {
    it('should create API key without returning hash', async () => {
      const mockApiKey = {
        id: 'key_123',
        name: 'New Key',
        createdAt: new Date(),
      };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      const result = await createApiKey('user_123', 'hash123', 'New Key');

      expect(result).toEqual(mockApiKey);
      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          keyHash: 'hash123',
          name: 'New Key',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key if user owns it', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
        id: 'key_123',
        userId: 'user_123',
      });
      (prisma.apiKey.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteApiKey('key_123', 'user_123');

      expect(result).toBeTruthy();
      expect(prisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key_123' },
      });
    });

    it('should return null if user does not own key', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await deleteApiKey('key_123', 'wrong_user');

      expect(result).toBeNull();
      expect(prisma.apiKey.delete).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateUser', () => {
    it('should create new user if does not exist', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'new@example.com',
        plan: Plan.FREE,
      };

      (prisma.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await getOrCreateUser('new@example.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
        update: {},
        create: {
          email: 'new@example.com',
          plan: Plan.FREE,
        },
      });
    });
  });
});

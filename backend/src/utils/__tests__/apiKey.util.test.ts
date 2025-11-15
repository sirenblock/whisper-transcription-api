/**
 * @module ApiKeyUtilTests
 * @description Test suite for API key utility functions
 */

import { generateApiKey, hashApiKey, isValidKeyFormat, deleteApiKey, listUserApiKeys } from '../apiKey.util';
import { prisma } from '../../db';

// Mock Prisma
jest.mock('../../db', () => ({
  prisma: {
    apiKey: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('ApiKey Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate a valid API key with correct format', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-123',
        keyHash: 'hash-123',
        name: 'Test Key',
        createdAt: new Date(),
        lastUsedAt: null,
      };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      const result = await generateApiKey('user-123', 'Test Key');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('plainKey');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('createdAt');
      expect(result.plainKey).toMatch(/^wtr_live_[a-f0-9]{32}$/);
      expect(result.id).toBe('key-123');
      expect(result.name).toBe('Test Key');
    });

    it('should generate unique keys for multiple calls', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-123',
        keyHash: 'hash-123',
        name: 'Test Key',
        createdAt: new Date(),
        lastUsedAt: null,
      };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      const key1 = await generateApiKey('user-123');
      const key2 = await generateApiKey('user-123');

      expect(key1.plainKey).not.toBe(key2.plainKey);
    });

    it('should use default name if not provided', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-123',
        keyHash: 'hash-123',
        name: 'Key 2025-01-15T00:00:00.000Z',
        createdAt: new Date(),
        lastUsedAt: null,
      };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      await generateApiKey('user-123');

      const createCall = (prisma.apiKey.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.name).toMatch(/^Key \d{4}-\d{2}-\d{2}/);
    });

    it('should hash the API key before storing', async () => {
      const mockApiKey = {
        id: 'key-123',
        userId: 'user-123',
        keyHash: 'hash-123',
        name: 'Test Key',
        createdAt: new Date(),
        lastUsedAt: null,
      };

      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockApiKey);

      await generateApiKey('user-123', 'Test Key');

      const createCall = (prisma.apiKey.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.keyHash).toBeDefined();
      expect(createCall.data.keyHash).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('hashApiKey', () => {
    it('should produce consistent hashes for the same input', () => {
      const key = 'wtr_live_test123456789012345678901234';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should produce different hashes for different inputs', () => {
      const key1 = 'wtr_live_key1111111111111111111111111111';
      const key2 = 'wtr_live_key2222222222222222222222222222';

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce valid SHA-256 hex string', () => {
      const key = 'wtr_live_test123456789012345678901234';
      const hash = hashApiKey(key);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('isValidKeyFormat', () => {
    it('should accept valid API key format', () => {
      const validKey = 'wtr_live_' + 'a'.repeat(32);
      expect(isValidKeyFormat(validKey)).toBe(true);
    });

    it('should reject keys with wrong prefix', () => {
      const invalidKey = 'wrong_prefix_' + 'a'.repeat(32);
      expect(isValidKeyFormat(invalidKey)).toBe(false);
    });

    it('should reject keys that are too short', () => {
      const shortKey = 'wtr_live_tooshort';
      expect(isValidKeyFormat(shortKey)).toBe(false);
    });

    it('should reject keys that are too long', () => {
      const longKey = 'wtr_live_' + 'a'.repeat(100);
      expect(isValidKeyFormat(longKey)).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(isValidKeyFormat(null as any)).toBe(false);
      expect(isValidKeyFormat(undefined as any)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidKeyFormat(123 as any)).toBe(false);
      expect(isValidKeyFormat({} as any)).toBe(false);
      expect(isValidKeyFormat([] as any)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidKeyFormat('')).toBe(false);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key when user owns it', async () => {
      (prisma.apiKey.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await deleteApiKey('key-123', 'user-123');

      expect(result).toBe(true);
      expect(prisma.apiKey.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'key-123',
          userId: 'user-123',
        },
      });
    });

    it('should return false when key not found or unauthorized', async () => {
      (prisma.apiKey.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await deleteApiKey('key-123', 'wrong-user');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.apiKey.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await deleteApiKey('key-123', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('listUserApiKeys', () => {
    it('should return list of user API keys without hashes', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          lastUsedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'key-2',
          name: 'Development Key',
          lastUsedAt: null,
          createdAt: new Date('2025-01-10'),
        },
      ];

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue(mockKeys);

      const result = await listUserApiKeys('user-123');

      expect(result).toEqual(mockKeys);
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: {
          id: true,
          name: true,
          lastUsedAt: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when user has no keys', async () => {
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

      const result = await listUserApiKeys('user-123');

      expect(result).toEqual([]);
    });
  });
});

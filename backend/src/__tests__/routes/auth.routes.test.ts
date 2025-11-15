/**
 * @jest-environment node
 */

import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as apiKeyUtil from '../../utils/apiKey.util';
import { prisma } from '../../db';

// Mock dependencies
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/apiKey.util');
jest.mock('../../db', () => ({
  prisma: {
    apiKey: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1', authRoutes);

describe('Auth Routes', () => {
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      plan: 'PRO',
    };

    // Mock auth middleware to pass through
    (authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/v1/keys', () => {
    it('should successfully generate a new API key', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'wtr_live_abc123def456',
        name: 'Test Key',
        createdAt: new Date(),
      };

      (prisma.apiKey.count as jest.Mock).mockResolvedValue(2);
      (apiKeyUtil.generateApiKey as jest.Mock).mockResolvedValue(mockApiKey);

      const response = await request(app)
        .post('/api/v1/keys')
        .send({ name: 'Test Key' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('wtr_live_abc123def456');
      expect(response.body.data.name).toBe('Test Key');
      expect(response.body.message).toContain('Save this key securely');

      expect(apiKeyUtil.generateApiKey).toHaveBeenCalledWith('user-123', 'Test Key');
    });

    it('should generate key without name', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'wtr_live_abc123def456',
        name: null,
        createdAt: new Date(),
      };

      (prisma.apiKey.count as jest.Mock).mockResolvedValue(1);
      (apiKeyUtil.generateApiKey as jest.Mock).mockResolvedValue(mockApiKey);

      const response = await request(app)
        .post('/api/v1/keys')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.key).toBeTruthy();
    });

    it('should reject if max keys limit reached', async () => {
      (prisma.apiKey.count as jest.Mock).mockResolvedValue(10);

      const response = await request(app)
        .post('/api/v1/keys')
        .send({ name: 'Test Key' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MAX_KEYS_EXCEEDED');
    });

    it('should handle key generation failure', async () => {
      (prisma.apiKey.count as jest.Mock).mockResolvedValue(1);
      (apiKeyUtil.generateApiKey as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/v1/keys')
        .send({ name: 'Test Key' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVER_ERROR');
    });

    it('should validate name length', async () => {
      const longName = 'x'.repeat(101);

      const response = await request(app)
        .post('/api/v1/keys')
        .send({ name: longName });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /api/v1/keys', () => {
    it('should list all user API keys', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          createdAt: new Date('2024-01-01'),
          lastUsedAt: new Date('2024-01-15'),
        },
        {
          id: 'key-2',
          name: 'Development Key',
          createdAt: new Date('2024-01-10'),
          lastUsedAt: null,
        },
      ];

      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue(mockKeys);

      const response = await request(app).get('/api/v1/keys');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.keys).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.keys[0]).not.toHaveProperty('keyHash');
    });

    it('should return empty array when user has no keys', async () => {
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/v1/keys');

      expect(response.status).toBe(200);
      expect(response.body.data.keys).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should handle database error', async () => {
      (prisma.apiKey.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/v1/keys');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/keys/:id', () => {
    it('should successfully delete an API key', async () => {
      const mockKey = {
        id: 'key-123',
        userId: 'user-123',
        name: 'Test Key',
      };

      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(mockKey);
      (prisma.apiKey.delete as jest.Mock).mockResolvedValue(mockKey);

      const response = await request(app).delete('/api/v1/keys/key-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('revoked');

      expect(prisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-123' },
      });
    });

    it('should return 404 for non-existent key', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/api/v1/keys/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('KEY_NOT_FOUND');
    });

    it('should not delete key belonging to different user', async () => {
      // findFirst with userId check will return null
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/api/v1/keys/other-user-key');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('KEY_NOT_FOUND');
      expect(prisma.apiKey.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion failure', async () => {
      (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
        id: 'key-123',
        userId: 'user-123',
      });
      (prisma.apiKey.delete as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).delete('/api/v1/keys/key-123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/me', () => {
    it('should return current user information', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'PRO',
        monthlyMinutesUsed: 120,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData);

      const response = await request(app).get('/api/v1/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user-123');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.plan).toBe('PRO');
      expect(response.body.data).not.toHaveProperty('stripeCustomerId');
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/me');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/v1/me');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});

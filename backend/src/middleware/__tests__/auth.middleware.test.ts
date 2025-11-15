/**
 * @module AuthMiddlewareTests
 * @description Test suite for authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, requirePlan } from '../auth.middleware';
import { hashApiKey } from '../../utils/apiKey.util';
import { findUserByApiKeyHash } from '../../db/helpers';

// Mock dependencies
jest.mock('../../utils/apiKey.util');
jest.mock('../../db/helpers');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      path: '/test',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should reject requests without Authorization header', async () => {
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Authorization header required. Format: Bearer wtr_live_xxx',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid Authorization format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat wtr_live_123',
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization format must be: Bearer wtr_live_xxx',
        },
      });
    });

    it('should reject malformed Bearer token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer',
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should reject API key with invalid format', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid_key_format',
      };

      (hashApiKey as jest.Mock).mockReturnValue('hashed');
      const mockIsValidKeyFormat = require('../../utils/apiKey.util').isValidKeyFormat;
      jest.spyOn(require('../../utils/apiKey.util'), 'isValidKeyFormat')
        .mockReturnValue(false);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
        },
      });
    });

    it('should reject non-existent API key', async () => {
      const validKey = 'wtr_live_' + 'a'.repeat(32);
      mockRequest.headers = {
        authorization: `Bearer ${validKey}`,
      };

      jest.spyOn(require('../../utils/apiKey.util'), 'isValidKeyFormat')
        .mockReturnValue(true);
      (hashApiKey as jest.Mock).mockReturnValue('hashed_key');
      (findUserByApiKeyHash as jest.Mock).mockResolvedValue(null);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or revoked API key',
        },
      });
    });

    it('should authenticate valid API key and attach user to request', async () => {
      const validKey = 'wtr_live_' + 'a'.repeat(32);
      mockRequest.headers = {
        authorization: `Bearer ${validKey}`,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'PRO' as const,
        monthlyMinutesUsed: 100,
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(require('../../utils/apiKey.util'), 'isValidKeyFormat')
        .mockReturnValue(true);
      (hashApiKey as jest.Mock).mockReturnValue('hashed_key');
      (findUserByApiKeyHash as jest.Mock).mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        plan: 'PRO',
        monthlyMinutesUsed: 100,
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const validKey = 'wtr_live_' + 'a'.repeat(32);
      mockRequest.headers = {
        authorization: `Bearer ${validKey}`,
      };

      jest.spyOn(require('../../utils/apiKey.util'), 'isValidKeyFormat')
        .mockReturnValue(true);
      (hashApiKey as jest.Mock).mockReturnValue('hashed_key');
      (findUserByApiKeyHash as jest.Mock).mockRejectedValue(new Error('DB error'));

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should continue without authentication when no header provided', async () => {
      await optionalAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should authenticate when valid header is provided', async () => {
      const validKey = 'wtr_live_' + 'a'.repeat(32);
      mockRequest.headers = {
        authorization: `Bearer ${validKey}`,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'FREE' as const,
        monthlyMinutesUsed: 10,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(require('../../utils/apiKey.util'), 'isValidKeyFormat')
        .mockReturnValue(true);
      (hashApiKey as jest.Mock).mockReturnValue('hashed_key');
      (findUserByApiKeyHash as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid authentication when header is provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid_key',
      };

      jest.spyOn(require('../../utils/apiKey.util'), 'isValidKeyFormat')
        .mockReturnValue(false);

      await optionalAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePlan', () => {
    it('should allow users with correct plan', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'PRO',
        monthlyMinutesUsed: 100,
      };

      const middleware = requirePlan(['PRO', 'PAYG']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject users without correct plan', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'FREE',
        monthlyMinutesUsed: 10,
      };

      const middleware = requirePlan(['PRO', 'PAYG']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: 'This feature requires one of these plans: PRO, PAYG',
          details: {
            currentPlan: 'FREE',
            requiredPlans: ['PRO', 'PAYG'],
          },
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated users', () => {
      const middleware = requirePlan(['PRO']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should allow FREE plan users when FREE is in allowed plans', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'FREE',
        monthlyMinutesUsed: 5,
      };

      const middleware = requirePlan(['FREE', 'PRO', 'PAYG']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});

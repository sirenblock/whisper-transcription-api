/**
 * @module AuthRoutes
 * @description Express routes for authentication and API key management
 *
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../utils/apiKey.util
 * @requires ../db
 * @requires zod
 *
 * @example
 * import authRoutes from './routes/auth.routes';
 * app.use('/api/v1', authRoutes);
 *
 * @exports {Router} default - Express router with auth endpoints
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateApiKey } from '../utils/apiKey.util';
import { prisma } from '../db';

const router = express.Router();

// Validation schemas
const CreateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

/**
 * POST /api/v1/keys - Generate new API key
 *
 * @route POST /api/v1/keys
 * @auth Required - API key via Bearer token
 *
 * @body {string} [name] - Optional name/label for the key
 *
 * @returns {object} 200 - New API key (shown only once)
 * @returns {object} 400 - Validation error
 * @returns {object} 500 - Server error
 */
router.post('/keys', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validationResult = CreateKeySchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request parameters',
          details: validationResult.error.errors,
        },
      });
    }

    const { name } = validationResult.data;

    // Check if user has reached max keys limit (optional safety check)
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId: req.user!.id },
    });

    const MAX_KEYS_PER_USER = parseInt(process.env.MAX_KEYS_PER_USER || '10');
    if (existingKeysCount >= MAX_KEYS_PER_USER) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MAX_KEYS_EXCEEDED',
          message: `Maximum of ${MAX_KEYS_PER_USER} API keys allowed per user`,
        },
      });
    }

    const apiKey = await generateApiKey(req.user!.id, name);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'auth-routes',
      message: 'API key generated',
      data: {
        userId: req.user!.id,
        keyId: apiKey.id,
        name: name || 'unnamed',
      }
    }));

    res.json({
      success: true,
      data: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      },
      message: 'Save this key securely - it will not be shown again',
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'auth-routes',
      message: 'Create key error',
      data: {
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate API key',
      },
    });
  }
});

/**
 * GET /api/v1/keys - List API keys (without plain keys)
 *
 * @route GET /api/v1/keys
 * @auth Required - API key via Bearer token
 *
 * @returns {object} 200 - List of API keys (hashed)
 * @returns {object} 500 - Server error
 */
router.get('/keys', authMiddleware, async (req: Request, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        keys,
        total: keys.length,
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'auth-routes',
      message: 'List keys error',
      data: {
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch API keys',
      },
    });
  }
});

/**
 * DELETE /api/v1/keys/:id - Revoke API key
 *
 * @route DELETE /api/v1/keys/:id
 * @auth Required - API key via Bearer token
 *
 * @param {string} id - API key ID to revoke
 *
 * @returns {object} 200 - Success message
 * @returns {object} 404 - Key not found
 * @returns {object} 500 - Server error
 */
router.delete('/keys/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check if key exists and belongs to user
    const key = await prisma.apiKey.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'KEY_NOT_FOUND',
          message: 'API key not found or access denied',
        },
      });
    }

    // Delete the key
    await prisma.apiKey.delete({
      where: { id: req.params.id },
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'auth-routes',
      message: 'API key revoked',
      data: {
        userId: req.user!.id,
        keyId: req.params.id,
      }
    }));

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'auth-routes',
      message: 'Revoke key error',
      data: {
        userId: req.user?.id,
        keyId: req.params.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to revoke API key',
      },
    });
  }
});

/**
 * GET /api/v1/me - Get current user info
 *
 * @route GET /api/v1/me
 * @auth Required - API key via Bearer token
 *
 * @returns {object} 200 - User information
 * @returns {object} 500 - Server error
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        plan: true,
        monthlyMinutesUsed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'auth-routes',
      message: 'Get user error',
      data: {
        userId: req.user?.id,
        error: error.message,
      }
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch user information',
      },
    });
  }
});

export default router;

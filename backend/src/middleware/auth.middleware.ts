/**
 * @module AuthMiddleware
 * @description Express middleware for API key authentication
 *
 * @requires express
 * @requires ../utils/apiKey.util
 * @requires ../db/helpers
 *
 * @example
 * // Protect a route with authentication
 * import { authMiddleware } from './middleware/auth.middleware';
 *
 * router.post('/api/v1/transcribe', authMiddleware, async (req, res) => {
 *   // req.user is now available and authenticated
 *   console.log(`User ${req.user.email} is making a request`);
 * });
 *
 * @exports {Function} authMiddleware - Required authentication middleware
 * @exports {Function} optionalAuthMiddleware - Optional authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { hashApiKey, isValidKeyFormat } from '../utils/apiKey.util';
import { findUserByApiKeyHash } from '../db/helpers';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        plan: 'FREE' | 'PRO' | 'PAYG';
        monthlyMinutesUsed: number;
      };
    }
  }
}

/**
 * Authentication middleware - validates API key and attaches user to request
 *
 * Validates the Authorization header in format: Bearer wtr_live_xxx
 * If valid, attaches user object to req.user
 * If invalid, returns 401 Unauthorized
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * router.get('/protected', authMiddleware, (req, res) => {
 *   console.log(req.user.id); // User is authenticated
 *   res.json({ userId: req.user.id });
 * });
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Authorization header required. Format: Bearer wtr_live_xxx',
        },
      });
      return;
    }

    // Parse Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization format must be: Bearer wtr_live_xxx',
        },
      });
      return;
    }

    const apiKey = parts[1];

    // Validate key format (quick check before database lookup)
    if (!isValidKeyFormat(apiKey)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
        },
      });
      return;
    }

    // Hash and lookup user
    const keyHash = hashApiKey(apiKey);
    const user = await findUserByApiKeyHash(keyHash);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or revoked API key',
        },
      });
      return;
    }

    // Attach user to request for downstream middleware/handlers
    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
      monthlyMinutesUsed: user.monthlyMinutesUsed,
    };

    // Log authentication (for monitoring/debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        module: 'auth-middleware',
        message: 'User authenticated',
        data: {
          userId: user.id,
          email: user.email,
          plan: user.plan,
          path: req.path,
        },
      }));
    }

    next();
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'auth-middleware',
      message: 'Authentication error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
      },
    }));

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional authentication middleware
 *
 * Attempts to authenticate if Authorization header is present,
 * but doesn't fail if it's missing. Useful for endpoints that
 * work for both authenticated and anonymous users.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * // Endpoint that works with or without authentication
 * router.get('/public-or-private', optionalAuthMiddleware, (req, res) => {
 *   if (req.user) {
 *     // Authenticated user - show personalized content
 *     res.json({ message: `Hello ${req.user.email}` });
 *   } else {
 *     // Anonymous user - show public content
 *     res.json({ message: 'Hello anonymous user' });
 *   }
 * });
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // No auth header = continue without authentication
  if (!authHeader) {
    return next();
  }

  // Auth header exists = validate it
  return authMiddleware(req, res, next);
}

/**
 * Middleware to require specific user plans
 *
 * @param allowedPlans - Array of allowed plans
 * @returns Express middleware function
 *
 * @example
 * router.post(
 *   '/premium-feature',
 *   authMiddleware,
 *   requirePlan(['PRO', 'PAYG']),
 *   handler
 * );
 */
export function requirePlan(allowedPlans: Array<'FREE' | 'PRO' | 'PAYG'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `This feature requires one of these plans: ${allowedPlans.join(', ')}`,
          details: {
            currentPlan: req.user.plan,
            requiredPlans: allowedPlans,
          },
        },
      });
      return;
    }

    next();
  };
}

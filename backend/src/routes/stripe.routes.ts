/**
 * @module StripeRoutes
 * @description Express routes for Stripe payment processing
 *
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../services/stripe.service
 * @requires zod
 *
 * @example
 * import stripeRoutes from './routes/stripe.routes';
 * app.use('/api/v1/stripe', stripeRoutes);
 *
 * @exports Express Router
 */

import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
} from '../services/stripe.service';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const CreateCheckoutSchema = z.object({
  priceId: z.string().startsWith('price_', {
    message: 'Invalid Stripe price ID format',
  }),
  successUrl: z.string().url({ message: 'Success URL must be a valid URL' }).optional(),
  cancelUrl: z.string().url({ message: 'Cancel URL must be a valid URL' }).optional(),
  metadata: z.record(z.string()).optional(),
});

const CreatePortalSchema = z.object({
  returnUrl: z.string().url({ message: 'Return URL must be a valid URL' }).optional(),
});

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        plan: 'FREE' | 'PRO' | 'PAYG';
      };
    }
  }
}

/**
 * POST /create-checkout
 * Creates a Stripe Checkout session for subscription purchase
 *
 * @route POST /api/v1/stripe/create-checkout
 * @access Protected (requires API key)
 *
 * @param {string} priceId - Stripe price ID (e.g., price_xxx)
 * @param {string} [successUrl] - URL to redirect after successful payment
 * @param {string} [cancelUrl] - URL to redirect after cancelled payment
 * @param {object} [metadata] - Additional metadata to attach to the session
 *
 * @returns {200} Success response with checkout URL
 * @returns {400} Validation error
 * @returns {401} Unauthorized
 * @returns {500} Internal server error
 */
router.post(
  '/create-checkout',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = CreateCheckoutSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: validationResult.error.errors,
          },
        });
      }

      const { priceId, metadata } = validationResult.data;

      // Get frontend URL from environment or use default
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

      // Use provided URLs or defaults
      const successUrl =
        validationResult.data.successUrl || `${frontendUrl}/dashboard?payment=success`;
      const cancelUrl =
        validationResult.data.cancelUrl || `${frontendUrl}/dashboard?payment=cancelled`;

      // Ensure user exists (authMiddleware sets this)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      // Check if user is already on a paid plan
      if (req.user.plan !== 'FREE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_SUBSCRIBED',
            message: `You are already on the ${req.user.plan} plan. Use the customer portal to manage your subscription.`,
          },
        });
      }

      // Create checkout session
      const session = await createCheckoutSession({
        userId: req.user.id,
        priceId,
        successUrl,
        cancelUrl,
        metadata,
      });

      return res.status(200).json({
        success: true,
        data: {
          url: session.url,
          sessionId: session.id,
        },
        message: 'Checkout session created successfully',
      });
    } catch (error: any) {
      console.error('Create checkout error:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'CHECKOUT_FAILED',
          message: error.message || 'Failed to create checkout session',
        },
      });
    }
  }
);

/**
 * POST /create-portal
 * Creates a Stripe Customer Portal session for subscription management
 *
 * @route POST /api/v1/stripe/create-portal
 * @access Protected (requires API key)
 *
 * @param {string} [returnUrl] - URL to return to after portal session
 *
 * @returns {200} Success response with portal URL
 * @returns {400} Validation error or no subscription
 * @returns {401} Unauthorized
 * @returns {500} Internal server error
 */
router.post(
  '/create-portal',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = CreatePortalSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: validationResult.error.errors,
          },
        });
      }

      // Ensure user exists
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      // Check if user has a paid plan
      if (req.user.plan === 'FREE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'You do not have an active subscription',
          },
        });
      }

      // Get frontend URL from environment or use default
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const returnUrl = validationResult.data.returnUrl || `${frontendUrl}/dashboard`;

      // Create portal session
      const session = await createPortalSession({
        userId: req.user.id,
        returnUrl,
      });

      return res.status(200).json({
        success: true,
        data: {
          url: session.url,
        },
        message: 'Portal session created successfully',
      });
    } catch (error: any) {
      console.error('Create portal error:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'PORTAL_FAILED',
          message: error.message || 'Failed to create portal session',
        },
      });
    }
  }
);

/**
 * POST /webhook
 * Handles Stripe webhook events
 *
 * @route POST /api/v1/stripe/webhook
 * @access Public (Stripe signature verification)
 *
 * IMPORTANT: This route must be registered BEFORE express.json() middleware
 * to access the raw body for signature verification.
 *
 * @returns {200} Webhook processed successfully
 * @returns {400} Webhook verification failed
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'Missing Stripe signature header',
          },
        });
      }

      // Handle webhook
      await handleWebhook(req.body, signature);

      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);

      // Return 400 for webhook verification errors
      if (error.type === 'StripeSignatureVerificationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Webhook signature verification failed',
          },
        });
      }

      // Return 500 for other errors but still acknowledge receipt
      // This prevents Stripe from retrying unnecessarily
      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: error.message || 'Webhook processing failed',
        },
      });
    }
  }
);

/**
 * GET /plans
 * Returns available subscription plans with pricing information
 *
 * @route GET /api/v1/stripe/plans
 * @access Public
 *
 * @returns {200} List of available plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = [
      {
        id: 'FREE',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
          '60 minutes per month',
          '3 transcriptions per hour',
          'Base model only',
          'Community support',
        ],
        priceId: null,
      },
      {
        id: 'PRO',
        name: 'Pro',
        price: 29,
        interval: 'month',
        features: [
          '600 minutes per month',
          '20 transcriptions per hour',
          'All models (Base, Small, Medium)',
          'Priority support',
          'API access',
        ],
        priceId: process.env.STRIPE_PRICE_ID_PRO,
      },
      {
        id: 'PAYG',
        name: 'Pay As You Go',
        price: 0.10,
        interval: 'minute',
        features: [
          'Unlimited minutes',
          '100 transcriptions per hour',
          'All models (Base, Small, Medium)',
          'Priority support',
          'API access',
          'No monthly commitment',
        ],
        priceId: process.env.STRIPE_PRICE_ID_PAYG,
      },
    ];

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error('Get plans error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_PLANS_FAILED',
        message: 'Failed to fetch plans',
      },
    });
  }
});

export default router;

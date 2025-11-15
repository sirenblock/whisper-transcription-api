/**
 * @module WebhookRoutes
 * @description Express routes for handling external webhooks (Stripe, etc.)
 *
 * @requires express
 * @requires ../services/payment.service
 * @requires stripe
 *
 * @example
 * import webhookRoutes from './routes/webhook.routes';
 * app.use('/webhooks', webhookRoutes);
 *
 * @exports {Router} default - Express router with webhook endpoints
 */

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { handleWebhook } from '../services/payment.service';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

/**
 * POST /webhooks/stripe - Handle Stripe webhook events
 *
 * @route POST /webhooks/stripe
 * @auth Stripe signature verification
 *
 * @body {raw} Raw Stripe webhook payload
 *
 * @returns {object} 200 - Webhook processed
 * @returns {object} 400 - Invalid signature or payload
 * @returns {object} 500 - Server error
 *
 * @note This endpoint requires raw body parsing (not JSON)
 * @note Signature verification is done via Stripe library
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        module: 'webhook-routes',
        message: 'Missing Stripe signature',
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing Stripe signature header',
        },
      });
    }

    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        module: 'webhook-routes',
        message: 'Stripe webhook received',
        data: {
          type: event.type,
          id: event.id,
        }
      }));

      // Handle the webhook event
      await handleWebhook(event);

      res.json({
        success: true,
        received: true,
      });
    } catch (error: any) {
      if (error.type === 'StripeSignatureVerificationError') {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          module: 'webhook-routes',
          message: 'Invalid Stripe signature',
          data: {
            error: error.message,
          }
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        });
      }

      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        module: 'webhook-routes',
        message: 'Webhook processing error',
        data: {
          error: error.message,
          stack: error.stack,
        }
      }));

      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook',
        },
      });
    }
  }
);

/**
 * GET /webhooks/health - Health check for webhook endpoint
 *
 * @route GET /webhooks/health
 *
 * @returns {object} 200 - Webhook endpoint is healthy
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;

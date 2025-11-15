/**
 * @module StripeRoutesTests
 * @description Comprehensive tests for Stripe routes
 */

import request from 'supertest';
import express from 'express';
import stripeRoutes from '../stripe.routes';
import * as stripeService from '../../services/stripe.service';

// Mock Stripe service
jest.mock('../../services/stripe.service');

// Mock auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid_token') {
      req.user = {
        id: 'user_123',
        email: 'test@example.com',
        plan: 'FREE',
      };
      next();
    } else {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      });
    }
  },
}));

// Mock environment variables
process.env.FRONTEND_URL = 'https://example.com';
process.env.STRIPE_PRICE_ID_PRO = 'price_pro123';
process.env.STRIPE_PRICE_ID_PAYG = 'price_payg123';

describe('StripeRoutes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/v1/stripe', stripeRoutes);
  });

  describe('POST /create-checkout', () => {
    it('should create checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      };

      (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/stripe/create-checkout')
        .set('Authorization', 'Bearer valid_token')
        .send({
          priceId: 'price_pro123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          url: 'https://checkout.stripe.com/test',
          sessionId: 'cs_test123',
        },
        message: 'Checkout session created successfully',
      });

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith({
        userId: 'user_123',
        priceId: 'price_pro123',
        successUrl: 'https://example.com/dashboard?payment=success',
        cancelUrl: 'https://example.com/dashboard?payment=cancelled',
        metadata: undefined,
      });
    });

    it('should accept custom success and cancel URLs', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      };

      (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/stripe/create-checkout')
        .set('Authorization', 'Bearer valid_token')
        .send({
          priceId: 'price_pro123',
          successUrl: 'https://custom.com/success',
          cancelUrl: 'https://custom.com/cancel',
        });

      expect(response.status).toBe(200);
      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith({
        userId: 'user_123',
        priceId: 'price_pro123',
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel',
        metadata: undefined,
      });
    });

    it('should include metadata if provided', async () => {
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      };

      (stripeService.createCheckoutSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/stripe/create-checkout')
        .set('Authorization', 'Bearer valid_token')
        .send({
          priceId: 'price_pro123',
          metadata: { source: 'mobile_app' },
        });

      expect(response.status).toBe(200);
      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { source: 'mobile_app' },
        })
      );
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/v1/stripe/create-checkout').send({
        priceId: 'price_pro123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid price ID format', async () => {
      const response = await request(app)
        .post('/api/v1/stripe/create-checkout')
        .set('Authorization', 'Bearer valid_token')
        .send({
          priceId: 'invalid_format',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: expect.any(Array),
        },
      });
    });

    it('should return 400 for invalid URL format', async () => {
      const response = await request(app)
        .post('/api/v1/stripe/create-checkout')
        .set('Authorization', 'Bearer valid_token')
        .send({
          priceId: 'price_pro123',
          successUrl: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if user already subscribed', async () => {
      // Override auth middleware for this test
      const appWithProUser = express();
      appWithProUser.use(express.json());
      appWithProUser.use('/api/v1/stripe', (req: any, res, next) => {
        req.user = {
          id: 'user_123',
          email: 'test@example.com',
          plan: 'PRO',
        };
        next();
      });
      appWithProUser.use('/api/v1/stripe', stripeRoutes);

      const response = await request(appWithProUser)
        .post('/api/v1/stripe/create-checkout')
        .send({
          priceId: 'price_pro123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'ALREADY_SUBSCRIBED',
          message: expect.stringContaining('already on the PRO plan'),
        },
      });
    });

    it('should return 500 on service error', async () => {
      (stripeService.createCheckoutSession as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const response = await request(app)
        .post('/api/v1/stripe/create-checkout')
        .set('Authorization', 'Bearer valid_token')
        .send({
          priceId: 'price_pro123',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'CHECKOUT_FAILED',
          message: 'Stripe API error',
        },
      });
    });
  });

  describe('POST /create-portal', () => {
    it('should create portal session successfully', async () => {
      // Override auth middleware for PRO user
      const appWithProUser = express();
      appWithProUser.use(express.json());
      appWithProUser.use('/api/v1/stripe', (req: any, res, next) => {
        req.user = {
          id: 'user_123',
          email: 'test@example.com',
          plan: 'PRO',
        };
        next();
      });
      appWithProUser.use('/api/v1/stripe', stripeRoutes);

      const mockSession = {
        id: 'bps_test123',
        url: 'https://billing.stripe.com/portal/test',
      };

      (stripeService.createPortalSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(appWithProUser).post('/api/v1/stripe/create-portal').send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          url: 'https://billing.stripe.com/portal/test',
        },
        message: 'Portal session created successfully',
      });

      expect(stripeService.createPortalSession).toHaveBeenCalledWith({
        userId: 'user_123',
        returnUrl: 'https://example.com/dashboard',
      });
    });

    it('should accept custom return URL', async () => {
      const appWithProUser = express();
      appWithProUser.use(express.json());
      appWithProUser.use('/api/v1/stripe', (req: any, res, next) => {
        req.user = {
          id: 'user_123',
          email: 'test@example.com',
          plan: 'PRO',
        };
        next();
      });
      appWithProUser.use('/api/v1/stripe', stripeRoutes);

      const mockSession = {
        id: 'bps_test123',
        url: 'https://billing.stripe.com/portal/test',
      };

      (stripeService.createPortalSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(appWithProUser)
        .post('/api/v1/stripe/create-portal')
        .send({
          returnUrl: 'https://custom.com/settings',
        });

      expect(response.status).toBe(200);
      expect(stripeService.createPortalSession).toHaveBeenCalledWith({
        userId: 'user_123',
        returnUrl: 'https://custom.com/settings',
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/v1/stripe/create-portal').send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if user is on FREE plan', async () => {
      const response = await request(app)
        .post('/api/v1/stripe/create-portal')
        .set('Authorization', 'Bearer valid_token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'You do not have an active subscription',
        },
      });
    });

    it('should return 400 for invalid return URL', async () => {
      const appWithProUser = express();
      appWithProUser.use(express.json());
      appWithProUser.use('/api/v1/stripe', (req: any, res, next) => {
        req.user = {
          id: 'user_123',
          email: 'test@example.com',
          plan: 'PRO',
        };
        next();
      });
      appWithProUser.use('/api/v1/stripe', stripeRoutes);

      const response = await request(appWithProUser)
        .post('/api/v1/stripe/create-portal')
        .send({
          returnUrl: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 on service error', async () => {
      const appWithProUser = express();
      appWithProUser.use(express.json());
      appWithProUser.use('/api/v1/stripe', (req: any, res, next) => {
        req.user = {
          id: 'user_123',
          email: 'test@example.com',
          plan: 'PRO',
        };
        next();
      });
      appWithProUser.use('/api/v1/stripe', stripeRoutes);

      (stripeService.createPortalSession as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const response = await request(appWithProUser).post('/api/v1/stripe/create-portal').send({});

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PORTAL_FAILED',
          message: 'Stripe API error',
        },
      });
    });
  });

  describe('POST /webhook', () => {
    beforeEach(() => {
      // Create app with raw body parser for webhooks
      app = express();
      app.use('/api/v1/stripe', stripeRoutes);
    });

    it('should process webhook successfully', async () => {
      (stripeService.handleWebhook as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(Buffer.from('test_payload'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(stripeService.handleWebhook).toHaveBeenCalled();
    });

    it('should return 400 if signature is missing', async () => {
      const response = await request(app)
        .post('/api/v1/stripe/webhook')
        .send(Buffer.from('test_payload'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing Stripe signature header',
        },
      });
    });

    it('should return 400 on signature verification error', async () => {
      const error = new Error('Invalid signature');
      (error as any).type = 'StripeSignatureVerificationError';

      (stripeService.handleWebhook as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(Buffer.from('test_payload'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
      });
    });

    it('should return 500 on processing error', async () => {
      (stripeService.handleWebhook as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/v1/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(Buffer.from('test_payload'));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: 'Database error',
        },
      });
    });
  });

  describe('GET /plans', () => {
    it('should return available plans', async () => {
      const response = await request(app).get('/api/v1/stripe/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toMatchObject({
        id: 'FREE',
        name: 'Free',
        price: 0,
        interval: 'month',
        priceId: null,
      });
      expect(response.body.data[1]).toMatchObject({
        id: 'PRO',
        name: 'Pro',
        price: 29,
        interval: 'month',
        priceId: 'price_pro123',
      });
      expect(response.body.data[2]).toMatchObject({
        id: 'PAYG',
        name: 'Pay As You Go',
        price: 0.10,
        interval: 'minute',
        priceId: 'price_payg123',
      });
    });

    it('should include features for each plan', async () => {
      const response = await request(app).get('/api/v1/stripe/plans');

      expect(response.status).toBe(200);
      expect(response.body.data[0].features).toBeDefined();
      expect(Array.isArray(response.body.data[0].features)).toBe(true);
      expect(response.body.data[0].features.length).toBeGreaterThan(0);
    });
  });
});

/**
 * @jest-environment node
 */

import request from 'supertest';
import express from 'express';
import webhookRoutes from '../../routes/webhook.routes';
import * as paymentService from '../../services/payment.service';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../services/payment.service');
jest.mock('stripe');

const app = express();
app.use('/webhooks', webhookRoutes);

describe('Webhook Routes', () => {
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Stripe instance
    mockStripe = {
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    // Replace the actual Stripe instance with our mock
    (Stripe as any).mockImplementation(() => mockStripe);
  });

  describe('POST /webhooks/stripe', () => {
    it('should successfully process valid Stripe webhook', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (paymentService.handleWebhook as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'valid_signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.received).toBe(true);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
      expect(paymentService.handleWebhook).toHaveBeenCalledWith(mockEvent);
    });

    it('should return 400 for missing signature', async () => {
      const response = await request(app)
        .post('/webhooks/stripe')
        .send(JSON.stringify({ test: 'data' }));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_SIGNATURE');
    });

    it('should return 400 for invalid signature', async () => {
      const error: any = new Error('Invalid signature');
      error.type = 'StripeSignatureVerificationError';

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify({ test: 'data' }));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should handle webhook processing errors', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: { object: {} },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (paymentService.handleWebhook as jest.Mock).mockRejectedValue(
        new Error('Processing failed')
      );

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'valid_signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEBHOOK_ERROR');
    });

    it('should handle different webhook event types', async () => {
      const eventTypes = [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ];

      for (const eventType of eventTypes) {
        const mockEvent = {
          id: `evt_test_${eventType}`,
          type: eventType,
          data: { object: {} },
        };

        mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
        (paymentService.handleWebhook as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app)
          .post('/webhooks/stripe')
          .set('stripe-signature', 'valid_signature')
          .send(JSON.stringify(mockEvent));

        expect(response.status).toBe(200);
        expect(paymentService.handleWebhook).toHaveBeenCalledWith(mockEvent);
      }
    });
  });

  describe('GET /webhooks/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/webhooks/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('healthy');
      expect(response.body.timestamp).toBeTruthy();
    });
  });
});

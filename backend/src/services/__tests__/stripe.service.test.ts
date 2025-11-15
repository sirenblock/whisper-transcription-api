/**
 * @module StripeServiceTests
 * @description Comprehensive tests for Stripe service
 */

import Stripe from 'stripe';
import { prismaMock } from '../../test-utils/prisma-mock';
import {
  createCheckoutSession,
  createPortalSession,
  recordUsageForPayg,
  handleWebhook,
} from '../stripe.service';

// Mock Stripe
jest.mock('stripe');

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock123';
process.env.STRIPE_PRICE_ID_PRO = 'price_pro123';
process.env.STRIPE_PRICE_ID_PAYG = 'price_payg123';

// Mock Prisma
jest.mock('../../db', () => ({
  prisma: prismaMock,
}));

describe('StripeService', () => {
  let stripeMock: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Stripe mock instance
    stripeMock = {
      customers: {
        create: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        list: jest.fn(),
        retrieve: jest.fn(),
      },
      subscriptionItems: {
        createUsageRecord: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    } as any;

    (Stripe as any).mockImplementation(() => stripeMock);
  });

  describe('createCheckoutSession', () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      stripeCustomerId: null,
      plan: 'FREE' as const,
    };

    const mockParams = {
      userId: 'user_123',
      priceId: 'price_pro123',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    it('should create checkout session for existing Stripe customer', async () => {
      const userWithCustomer = {
        ...mockUser,
        stripeCustomerId: 'cus_existing123',
      };

      prismaMock.user.findUnique.mockResolvedValue(userWithCustomer);

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
        customer: 'cus_existing123',
      };

      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const result = await createCheckoutSession(mockParams);

      expect(result).toEqual(mockSession);
      expect(stripeMock.customers.create).not.toHaveBeenCalled();
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123',
          mode: 'subscription',
          line_items: [{ price: 'price_pro123', quantity: 1 }],
        })
      );
    });

    it('should create new Stripe customer if none exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockCustomer = {
        id: 'cus_new123',
        email: 'test@example.com',
      };

      stripeMock.customers.create.mockResolvedValue(mockCustomer as any);

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
        customer: 'cus_new123',
      };

      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession as any);

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        stripeCustomerId: 'cus_new123',
      });

      const result = await createCheckoutSession(mockParams);

      expect(result).toEqual(mockSession);
      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: 'user_123' },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { stripeCustomerId: 'cus_new123' },
      });
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(createCheckoutSession(mockParams)).rejects.toThrow('User not found');
    });

    it('should validate input parameters', async () => {
      const invalidParams = {
        userId: 'invalid',
        priceId: 'invalid_price',
        successUrl: 'not-a-url',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(createCheckoutSession(invalidParams)).rejects.toThrow();
    });

    it('should include metadata in checkout session', async () => {
      const userWithCustomer = {
        ...mockUser,
        stripeCustomerId: 'cus_existing123',
      };

      prismaMock.user.findUnique.mockResolvedValue(userWithCustomer);

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      };

      stripeMock.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const paramsWithMetadata = {
        ...mockParams,
        metadata: { source: 'dashboard', campaign: 'spring2024' },
      };

      await createCheckoutSession(paramsWithMetadata);

      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user_123',
            source: 'dashboard',
            campaign: 'spring2024',
          }),
        })
      );
    });
  });

  describe('createPortalSession', () => {
    const mockParams = {
      userId: 'user_123',
      returnUrl: 'https://example.com/dashboard',
    };

    it('should create portal session for user with Stripe customer ID', async () => {
      const mockUser = {
        stripeCustomerId: 'cus_123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockSession = {
        id: 'bps_test123',
        url: 'https://billing.stripe.com/portal/test',
      };

      stripeMock.billingPortal.sessions.create.mockResolvedValue(mockSession as any);

      const result = await createPortalSession(mockParams);

      expect(result).toEqual(mockSession);
      expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://example.com/dashboard',
      });
    });

    it('should throw error if user has no Stripe customer ID', async () => {
      const mockUser = {
        stripeCustomerId: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(createPortalSession(mockParams)).rejects.toThrow(
        'User has no Stripe customer ID'
      );
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(createPortalSession(mockParams)).rejects.toThrow(
        'User has no Stripe customer ID'
      );
    });

    it('should validate input parameters', async () => {
      const invalidParams = {
        userId: 'invalid',
        returnUrl: 'not-a-url',
      };

      await expect(createPortalSession(invalidParams)).rejects.toThrow();
    });
  });

  describe('recordUsageForPayg', () => {
    const mockParams = {
      userId: 'user_123',
      minutes: 5.5,
      transcriptionId: 'trans_123',
    };

    it('should record usage for PAYG user with active subscription', async () => {
      const mockUser = {
        id: 'user_123',
        plan: 'PAYG' as const,
        stripeCustomerId: 'cus_123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockSubscription = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_payg123' },
            },
          ],
        },
      };

      stripeMock.subscriptions.list.mockResolvedValue({
        data: [mockSubscription],
      } as any);

      stripeMock.subscriptionItems.createUsageRecord.mockResolvedValue({} as any);

      await recordUsageForPayg(mockParams);

      expect(stripeMock.subscriptionItems.createUsageRecord).toHaveBeenCalledWith(
        'si_123',
        expect.objectContaining({
          quantity: 550, // 5.5 * 100
          action: 'increment',
        })
      );
    });

    it('should skip recording for non-PAYG users', async () => {
      const mockUser = {
        id: 'user_123',
        plan: 'PRO' as const,
        stripeCustomerId: 'cus_123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await recordUsageForPayg(mockParams);

      expect(stripeMock.subscriptions.list).not.toHaveBeenCalled();
      expect(stripeMock.subscriptionItems.createUsageRecord).not.toHaveBeenCalled();
    });

    it('should skip recording if no active subscription found', async () => {
      const mockUser = {
        id: 'user_123',
        plan: 'PAYG' as const,
        stripeCustomerId: 'cus_123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      stripeMock.subscriptions.list.mockResolvedValue({
        data: [],
      } as any);

      await recordUsageForPayg(mockParams);

      expect(stripeMock.subscriptionItems.createUsageRecord).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(recordUsageForPayg(mockParams)).rejects.toThrow('User not found');
    });

    it('should throw error if user has no Stripe customer ID', async () => {
      const mockUser = {
        id: 'user_123',
        plan: 'PAYG' as const,
        stripeCustomerId: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(recordUsageForPayg(mockParams)).rejects.toThrow(
        'User has no Stripe customer ID'
      );
    });

    it('should validate input parameters', async () => {
      const invalidParams = {
        userId: 'invalid',
        minutes: -5,
        transcriptionId: 'trans_123',
      };

      await expect(recordUsageForPayg(invalidParams)).rejects.toThrow();
    });
  });

  describe('handleWebhook', () => {
    const mockRawBody = Buffer.from('test');
    const mockSignature = 'test_signature';

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { userId: 'user_123' },
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      stripeMock.subscriptions.retrieve.mockResolvedValue({
        items: {
          data: [{ price: { id: 'price_pro123' } }],
        },
      } as any);

      prismaMock.user.update.mockResolvedValue({} as any);

      await handleWebhook(mockRawBody, mockSignature);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          plan: 'PRO',
          stripeCustomerId: 'cus_123',
          monthlyMinutesUsed: 0,
        },
      });
    });

    it('should handle customer.subscription.updated event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_pro123' } }],
            },
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const mockUser = {
        id: 'user_123',
        plan: 'FREE' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({} as any);

      await handleWebhook(mockRawBody, mockSignature);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          plan: 'PRO',
          monthlyMinutesUsed: 0,
        },
      });
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const mockUser = {
        id: 'user_123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({} as any);

      await handleWebhook(mockRawBody, mockSignature);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          plan: 'FREE',
          monthlyMinutesUsed: 0,
        },
      });
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            billing_reason: 'subscription_cycle',
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const mockUser = {
        id: 'user_123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({} as any);

      await handleWebhook(mockRawBody, mockSignature);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { monthlyMinutesUsed: 0 },
      });
    });

    it('should handle invoice.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            amount_due: 2900,
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await handleWebhook(mockRawBody, mockSignature);

      // Should log error but not throw
      expect(console.error).toHaveBeenCalled();
    });

    it('should throw error on invalid signature', async () => {
      const error = new Error('Invalid signature');
      (error as any).type = 'StripeSignatureVerificationError';

      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw error;
      });

      await expect(handleWebhook(mockRawBody, mockSignature)).rejects.toThrow(
        'Invalid signature'
      );
    });

    it('should handle unrecognized event types', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'customer.created',
        data: {
          object: {},
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      await handleWebhook(mockRawBody, mockSignature);

      // Should complete without error
      expect(console.log).toHaveBeenCalled();
    });
  });
});

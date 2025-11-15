/**
 * @module StripeService
 * @description Handles Stripe payment processing, subscription management, and webhooks
 *
 * @requires stripe
 * @requires @prisma/client
 *
 * @example
 * const session = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);
 * await handleWebhook(rawBody, signature);
 *
 * @exports {Function} createCheckoutSession - Creates Stripe checkout session
 * @exports {Function} handleWebhook - Processes Stripe webhook events
 * @exports {Function} createPortalSession - Creates customer portal session
 * @exports {Function} recordUsageForPayg - Records usage for pay-as-you-go customers
 */

import Stripe from 'stripe';
import { prisma } from '../db';
import { z } from 'zod';

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Validation schemas
const CheckoutSessionSchema = z.object({
  userId: z.string().cuid(),
  priceId: z.string().startsWith('price_'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});

const PortalSessionSchema = z.object({
  userId: z.string().cuid(),
  returnUrl: z.string().url(),
});

const UsageRecordSchema = z.object({
  userId: z.string().cuid(),
  minutes: z.number().positive(),
  transcriptionId: z.string().cuid(),
});

// Types
interface CheckoutSessionParams {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

interface PortalSessionParams {
  userId: string;
  returnUrl: string;
}

interface UsageRecordParams {
  userId: string;
  minutes: number;
  transcriptionId: string;
}

// Constants
const PLAN_MAP: Record<string, 'FREE' | 'PRO' | 'PAYG'> = {
  [process.env.STRIPE_PRICE_ID_PRO || '']: 'PRO',
  [process.env.STRIPE_PRICE_ID_PAYG || '']: 'PAYG',
};

/**
 * Creates a Stripe Checkout session for subscription purchase
 * @param params - Checkout session parameters
 * @returns Stripe checkout session object
 * @throws {Error} If user not found or Stripe API fails
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  try {
    // Validate input
    const validated = CheckoutSessionSchema.parse(params);

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true, stripeCustomerId: true, plan: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      _logInfo('createCheckoutSession', 'Creating new Stripe customer', {
        userId: user.id,
        email: user.email,
      });

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Determine subscription mode based on price ID
    const isPayg = validated.priceId === process.env.STRIPE_PRICE_ID_PAYG;

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: validated.priceId,
          quantity: 1,
        },
      ],
      success_url: validated.successUrl,
      cancel_url: validated.cancelUrl,
      metadata: {
        userId: user.id,
        ...validated.metadata,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      allow_promotion_codes: true,
    };

    // For PAYG, add usage-based billing configuration
    if (isPayg) {
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        trial_period_days: 0,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    _logInfo('createCheckoutSession', 'Checkout session created', {
      sessionId: session.id,
      userId: user.id,
      priceId: validated.priceId,
    });

    return session;
  } catch (error) {
    _logError('createCheckoutSession', 'Failed to create checkout session', error);
    throw error;
  }
}

/**
 * Creates a Stripe Customer Portal session for subscription management
 * @param params - Portal session parameters
 * @returns Stripe portal session object
 * @throws {Error} If user not found or has no Stripe customer ID
 */
export async function createPortalSession(
  params: PortalSessionParams
): Promise<Stripe.BillingPortal.Session> {
  try {
    // Validate input
    const validated = PortalSessionSchema.parse(params);

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('User has no Stripe customer ID');
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: validated.returnUrl,
    });

    _logInfo('createPortalSession', 'Portal session created', {
      sessionId: session.id,
      userId: validated.userId,
    });

    return session;
  } catch (error) {
    _logError('createPortalSession', 'Failed to create portal session', error);
    throw error;
  }
}

/**
 * Records usage for pay-as-you-go customers
 * @param params - Usage record parameters
 * @throws {Error} If user is not on PAYG plan or recording fails
 */
export async function recordUsageForPayg(params: UsageRecordParams): Promise<void> {
  try {
    // Validate input
    const validated = UsageRecordSchema.parse(params);

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, plan: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.plan !== 'PAYG') {
      _logInfo('recordUsageForPayg', 'User not on PAYG plan, skipping usage record', {
        userId: user.id,
        plan: user.plan,
      });
      return;
    }

    if (!user.stripeCustomerId) {
      throw new Error('User has no Stripe customer ID');
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      _logInfo('recordUsageForPayg', 'No active subscription found', {
        userId: user.id,
      });
      return;
    }

    const subscription = subscriptions.data[0];
    const usageItem = subscription.items.data.find(
      (item) => item.price.id === process.env.STRIPE_PRICE_ID_PAYG
    );

    if (!usageItem) {
      throw new Error('Usage-based subscription item not found');
    }

    // Record usage (Stripe expects integer quantity, we'll use minutes * 100 for precision)
    const quantity = Math.ceil(validated.minutes * 100);

    await stripe.subscriptionItems.createUsageRecord(usageItem.id, {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    });

    _logInfo('recordUsageForPayg', 'Usage recorded', {
      userId: user.id,
      minutes: validated.minutes,
      quantity,
      transcriptionId: validated.transcriptionId,
    });
  } catch (error) {
    _logError('recordUsageForPayg', 'Failed to record usage', error);
    throw error;
  }
}

/**
 * Handles incoming Stripe webhook events
 * @param rawBody - Raw request body from Stripe
 * @param signature - Stripe signature header
 * @throws {Error} If webhook verification fails
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    _logInfo('handleWebhook', 'Webhook received', {
      type: event.type,
      id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await _handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await _handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await _handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await _handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await _handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        _logInfo('handleWebhook', 'Unhandled webhook event type', {
          type: event.type,
        });
    }
  } catch (error) {
    _logError('handleWebhook', 'Webhook processing failed', error);
    throw error;
  }
}

/**
 * Handles checkout.session.completed event
 * @private
 */
async function _handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const userId = session.metadata?.userId;

    if (!userId) {
      _logError('_handleCheckoutCompleted', 'No userId in session metadata', {
        sessionId: session.id,
      });
      return;
    }

    // Get subscription to determine plan
    let plan: 'PRO' | 'PAYG' = 'PRO';

    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const priceId = subscription.items.data[0]?.price.id;
      plan = PLAN_MAP[priceId] || 'PRO';
    }

    // Update user plan and reset monthly usage
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        stripeCustomerId: session.customer as string,
        monthlyMinutesUsed: 0,
      },
    });

    _logInfo('_handleCheckoutCompleted', 'User plan updated', {
      userId,
      plan,
      sessionId: session.id,
    });
  } catch (error) {
    _logError('_handleCheckoutCompleted', 'Failed to handle checkout completed', error);
    throw error;
  }
}

/**
 * Handles subscription created/updated events
 * @private
 */
async function _handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
      select: { id: true, plan: true },
    });

    if (!user) {
      _logError('_handleSubscriptionChange', 'User not found for subscription', {
        customerId: subscription.customer,
      });
      return;
    }

    // Determine plan from subscription
    const priceId = subscription.items.data[0]?.price.id;
    const newPlan = PLAN_MAP[priceId] || 'PRO';

    // Only update if plan changed and subscription is active
    if (subscription.status === 'active' && user.plan !== newPlan) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: newPlan,
          monthlyMinutesUsed: 0, // Reset usage on plan change
        },
      });

      _logInfo('_handleSubscriptionChange', 'User plan updated', {
        userId: user.id,
        oldPlan: user.plan,
        newPlan,
        subscriptionId: subscription.id,
      });
    }
  } catch (error) {
    _logError('_handleSubscriptionChange', 'Failed to handle subscription change', error);
    throw error;
  }
}

/**
 * Handles subscription deleted event
 * @private
 */
async function _handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
      select: { id: true },
    });

    if (!user) {
      _logError('_handleSubscriptionDeleted', 'User not found for subscription', {
        customerId: subscription.customer,
      });
      return;
    }

    // Downgrade to FREE plan
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'FREE',
        monthlyMinutesUsed: 0,
      },
    });

    _logInfo('_handleSubscriptionDeleted', 'User downgraded to FREE', {
      userId: user.id,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    _logError('_handleSubscriptionDeleted', 'Failed to handle subscription deletion', error);
    throw error;
  }
}

/**
 * Handles invoice.payment_succeeded event
 * @private
 */
async function _handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
      select: { id: true },
    });

    if (!user) {
      return;
    }

    // Reset monthly usage on successful payment (monthly billing cycle)
    if (invoice.billing_reason === 'subscription_cycle') {
      await prisma.user.update({
        where: { id: user.id },
        data: { monthlyMinutesUsed: 0 },
      });

      _logInfo('_handlePaymentSucceeded', 'Monthly usage reset', {
        userId: user.id,
        invoiceId: invoice.id,
      });
    }
  } catch (error) {
    _logError('_handlePaymentSucceeded', 'Failed to handle payment succeeded', error);
    // Don't throw - this is not critical
  }
}

/**
 * Handles invoice.payment_failed event
 * @private
 */
async function _handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
      select: { id: true, email: true },
    });

    if (!user) {
      return;
    }

    _logError('_handlePaymentFailed', 'Payment failed for user', {
      userId: user.id,
      email: user.email,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
    });

    // TODO: Send notification email to user
    // This would integrate with an email service (Task not specified in requirements)
  } catch (error) {
    _logError('_handlePaymentFailed', 'Failed to handle payment failure', error);
    // Don't throw - this is not critical
  }
}

/**
 * Logs info-level messages
 * @private
 */
function _logInfo(function_name: string, message: string, data?: any): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'stripe-service',
      function: function_name,
      message,
      data,
    })
  );
}

/**
 * Logs error-level messages
 * @private
 */
function _logError(function_name: string, message: string, error: any): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      module: 'stripe-service',
      function: function_name,
      message,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        code: error?.code,
      },
    })
  );
}

import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe: Stripe | null = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Add it in Settings → Environment.');
  }
  return stripe;
}

// ─── Checkout Sessions ──────────────────────────────────────────

export async function createCheckoutSession(params: {
  organizationId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}) {
  const { organizationId, planId, successUrl, cancelUrl, customerEmail } = params;
  const sdk = getStripe();

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('Plan not found');
  if (plan.price <= 0) throw new Error('Free plans do not require checkout');

  // Check for existing active subscription
  const existingSub = await db.subscription.findFirst({
    where: {
      organizationId,
      status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
    },
  });

  // If using Stripe price IDs
  if (plan.stripePriceId) {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: {
        organizationId,
        planId,
      },
    };

    if (existingSub?.externalId) {
      // Use Stripe customer ID from existing subscription
      const existingSubscription = await sdk.subscriptions.retrieve(existingSub.externalId);
      sessionParams.customer = typeof existingSubscription.customer === 'string'
        ? existingSubscription.customer
        : existingSubscription.customer.id;
      sessionParams.subscription_data = {
        trial_period_days: 14,
      };
    } else {
      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }
      sessionParams.subscription_data = {
        trial_period_days: 14,
      };
    }

    return sdk.checkout.sessions.create(sessionParams);
  }

  // For plans without Stripe price IDs, use trial mode (manual provider)
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (existingSub) {
    await db.subscription.update({
      where: { id: existingSub.id },
      data: {
        planId,
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        provider: 'MANUAL',
      },
    });
  } else {
    await db.subscription.create({
      data: {
        organizationId,
        planId,
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        provider: 'MANUAL',
      },
    });
  }

  return {
    id: 'manual_' + Math.random().toString(36).slice(2),
    url: successUrl,
    status: 'complete' as const,
  };
}

// ─── Subscription Management ────────────────────────────────────

export async function cancelSubscription(subscriptionId: string) {
  const sdk = getStripe();

  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) throw new Error('Subscription not found');

  if (subscription.externalId && subscription.provider === 'STRIPE') {
    await sdk.subscriptions.update(subscription.externalId, {
      cancel_at_period_end: true,
    });
  }

  return db.subscription.update({
    where: { id: subscriptionId },
    data: { canceledAt: new Date() },
  });
}

export async function resumeSubscription(subscriptionId: string) {
  const sdk = getStripe();

  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) throw new Error('Subscription not found');

  if (subscription.externalId && subscription.provider === 'STRIPE') {
    await sdk.subscriptions.update(subscription.externalId, {
      cancel_at_period_end: false,
    });
  }

  return db.subscription.update({
    where: { id: subscriptionId },
    data: { canceledAt: null },
  });
}

export async function getSubscriptionStatus(organizationId: string) {
  const subscription = await db.subscription.findFirst({
    where: { organizationId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    return { active: false, plan: null, subscription: null };
  }

  const isActive = ['ACTIVE', 'TRIALING'].includes(subscription.status);
  const isTrial = subscription.status === 'TRIALING';
  const trialEndsAt = isTrial ? subscription.currentPeriodEnd : null;

  return {
    active: isActive,
    plan: subscription.plan,
    subscription,
    isTrial,
    trialEndsAt,
    status: subscription.status,
  };
}

// ─── Webhook Handling ───────────────────────────────────────────

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(sub);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }
    default:
      break;
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { organizationId, planId } = session.metadata || {};
  if (!organizationId || !planId) return;

  const sdk = getStripe();

  if (session.subscription) {
    const subId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
    const stripeSub = await sdk.subscriptions.retrieve(subId);

    const existing = await db.subscription.findFirst({
      where: { organizationId, planId },
    });

    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: {
          status: stripeSub.status.toUpperCase(),
          externalId: stripeSub.id,
          provider: 'STRIPE',
          currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
          canceledAt: (stripeSub as any).canceled_at
            ? new Date((stripeSub as any).canceled_at * 1000)
            : null,
        },
      });
    } else {
      await db.subscription.create({
        data: {
          organizationId,
          planId,
          status: stripeSub.status.toUpperCase(),
          externalId: stripeSub.id,
          provider: 'STRIPE',
          currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
        },
      });
    }
  }

  await db.organization.update({
    where: { id: organizationId },
    data: { planId },
  });
}

async function handleSubscriptionUpdate(stripeSub: Stripe.Subscription) {
  const subscription = await db.subscription.findFirst({
    where: { externalId: stripeSub.id },
  });

  if (subscription) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: stripeSub.status.toUpperCase(),
        currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
        canceledAt: (stripeSub as any).canceled_at
          ? new Date((stripeSub as any).canceled_at * 1000)
          : null,
      },
    });
  }
}

async function handleSubscriptionCanceled(stripeSub: Stripe.Subscription) {
  const subscription = await db.subscription.findFirst({
    where: { externalId: stripeSub.id },
  });

  if (subscription) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  if (invoiceAny.subscription) {
    const subId = typeof invoiceAny.subscription === 'string'
      ? invoiceAny.subscription
      : invoiceAny.subscription.id;
    const subscription = await db.subscription.findFirst({
      where: { externalId: subId },
    });
    if (subscription) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  if (invoiceAny.subscription) {
    const subId = typeof invoiceAny.subscription === 'string'
      ? invoiceAny.subscription
      : invoiceAny.subscription.id;
    const subscription = await db.subscription.findFirst({
      where: { externalId: subId },
    });
    if (subscription) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' },
      });
    }
  }
}

// ─── Portal ─────────────────────────────────────────────────────

export async function createCustomerPortalSession(
  organizationId: string,
  returnUrl: string
) {
  const sdk = getStripe();

  const subscription = await db.subscription.findFirst({
    where: { organizationId, provider: 'STRIPE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription?.externalId) {
    throw new Error('No Stripe subscription found for this organization');
  }

  const stripeSub = await sdk.subscriptions.retrieve(subscription.externalId);
  const customerId = typeof stripeSub.customer === 'string'
    ? stripeSub.customer
    : stripeSub.customer.id;

  return sdk.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

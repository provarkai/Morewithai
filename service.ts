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

// ─── Reader-Facing Checkout (courses, ebooks, paid newsletters) ─

/**
 * One-time payment checkout for a Product (course, ebook, etc).
 * Creates a PENDING ProductPurchase up front; the webhook flips it to
 * COMPLETED once Stripe confirms payment. Never grants access before
 * payment is confirmed.
 */
export async function createProductCheckoutSession(params: {
  productId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { productId, email, successUrl, cancelUrl } = params;
  const sdk = getStripe();

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  if (product.status !== 'PUBLISHED') throw new Error('Product is not available for purchase');
  if (product.price <= 0) throw new Error('This product is free — no checkout required');

  const subscriber = await db.subscriber.upsert({
    where: { email_siteId: { email, siteId: product.siteId } },
    update: {},
    create: { siteId: product.siteId, email, source: 'PRODUCT_PURCHASE' },
  });

  const purchase = await db.productPurchase.create({
    data: {
      siteId: product.siteId,
      productId: product.id,
      subscriberId: subscriber.id,
      email,
      amount: product.price,
      currency: product.currency,
      status: 'PENDING',
      provider: 'STRIPE',
    },
  });

  const session = await sdk.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: product.currency.toLowerCase(),
          product_data: { name: product.name, description: product.description },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      kind: 'product_purchase',
      purchaseId: purchase.id,
      productId: product.id,
    },
  });

  return session;
}

/**
 * Subscription checkout for a reader buying a paid newsletter tier.
 * Requires the Plan to have a stripePriceId (create it in Stripe first).
 */
export async function createReaderSubscriptionCheckoutSession(params: {
  siteId: string;
  planId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { siteId, planId, email, successUrl, cancelUrl } = params;
  const sdk = getStripe();

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('Newsletter tier not found');
  if (!plan.isActive) throw new Error('This tier is no longer available');
  if (!plan.stripePriceId) {
    throw new Error('This tier has no Stripe price configured yet. Add one in Settings before selling it.');
  }

  const subscriber = await db.subscriber.upsert({
    where: { email_siteId: { email, siteId } },
    update: {},
    create: { siteId, email, source: 'NEWSLETTER_TIER' },
  });

  const existing = await db.readerSubscription.findFirst({
    where: { subscriberId: subscriber.id, planId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
  });
  if (existing) throw new Error('You already have an active subscription to this tier');

  const session = await sdk.checkout.sessions.create({
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: email,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: {
      kind: 'reader_subscription',
      subscriberId: subscriber.id,
      siteId,
      planId,
    },
  });

  return session;
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
  const kind = session.metadata?.kind;

  if (kind === 'product_purchase') {
    await handleProductPurchaseComplete(session);
    return;
  }

  if (kind === 'reader_subscription') {
    await handleReaderSubscriptionCreated(session);
    return;
  }

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

async function handleProductPurchaseComplete(session: Stripe.Checkout.Session) {
  const { purchaseId, productId } = session.metadata || {};
  if (!purchaseId || !productId) return;

  const purchase = await db.productPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.status === 'COMPLETED') return; // already processed / not found

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  await db.productPurchase.update({
    where: { id: purchaseId },
    data: { status: 'COMPLETED', transactionId: paymentIntentId || session.id },
  });

  await db.product.update({
    where: { id: productId },
    data: {
      purchaseCount: { increment: 1 },
      revenueGenerated: { increment: purchase.amount },
    },
  });
}

async function handleReaderSubscriptionCreated(session: Stripe.Checkout.Session) {
  const { subscriberId, siteId, planId } = session.metadata || {};
  if (!subscriberId || !siteId || !planId) return;

  const sdk = getStripe();
  const subId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;
  if (!subId) return;

  const stripeSub = await sdk.subscriptions.retrieve(subId);

  const existing = await db.readerSubscription.findFirst({
    where: { subscriberId, planId },
  });

  const data = {
    status: stripeSub.status.toUpperCase(),
    externalId: stripeSub.id,
    provider: 'STRIPE',
    currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
    currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
    canceledAt: (stripeSub as any).canceled_at
      ? new Date((stripeSub as any).canceled_at * 1000)
      : null,
  };

  if (existing) {
    await db.readerSubscription.update({ where: { id: existing.id }, data });
  } else {
    await db.readerSubscription.create({ data: { subscriberId, siteId, planId, ...data } });
  }
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
    return;
  }

  const readerSub = await db.readerSubscription.findFirst({
    where: { externalId: stripeSub.id },
  });
  if (readerSub) {
    await db.readerSubscription.update({
      where: { id: readerSub.id },
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
    return;
  }

  const readerSub = await db.readerSubscription.findFirst({
    where: { externalId: stripeSub.id },
  });
  if (readerSub) {
    await db.readerSubscription.update({
      where: { id: readerSub.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  if (!invoiceAny.subscription) return;
  const subId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id;

  const subscription = await db.subscription.findFirst({ where: { externalId: subId } });
  if (subscription) {
    await db.subscription.update({ where: { id: subscription.id }, data: { status: 'PAST_DUE' } });
    return;
  }

  const readerSub = await db.readerSubscription.findFirst({ where: { externalId: subId } });
  if (readerSub) {
    await db.readerSubscription.update({ where: { id: readerSub.id }, data: { status: 'PAST_DUE' } });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  if (!invoiceAny.subscription) return;
  const subId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id;

  const subscription = await db.subscription.findFirst({ where: { externalId: subId } });
  if (subscription) {
    await db.subscription.update({ where: { id: subscription.id }, data: { status: 'ACTIVE' } });
    return;
  }

  const readerSub = await db.readerSubscription.findFirst({ where: { externalId: subId } });
  if (readerSub) {
    await db.readerSubscription.update({ where: { id: readerSub.id }, data: { status: 'ACTIVE' } });
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

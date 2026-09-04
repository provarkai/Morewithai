import { db } from '@/lib/db';
import { createReaderSubscriptionCheckoutSession } from '@/lib/stripe/service';

// ─── Types ──────────────────────────────────────────────────

export interface NewsletterTier {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  features: string[];
  stripePriceId: string | null;
  subscriberCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface PremiumNewsletter {
  id: string;
  siteId: string;
  title: string;
  content: string;
  excerpt: string;
  tierRequired: string;
  publishedAt: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  openRate: number;
  clickRate: number;
}

export interface NewsletterAnalytics {
  totalSubscribers: number;
  paidSubscribers: number;
  freeSubscribers: number;
  monthlyRevenue: number;
  churnRate: number;
  avgOpenRate: number;
  tiers: { name: string; subscribers: number; revenue: number }[];
}

// ─── Tier Management ────────────────────────────────────────

export async function createNewsletterTier(
  siteId: string,
  data: {
    name: string;
    description: string;
    price: number;
    interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
    features: string[];
  },
): Promise<NewsletterTier> {
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const plan = await db.plan.create({
    data: {
      name: data.name,
      slug: `newsletter-${siteId}-${slug}`,
      description: data.description,
      price: data.price,
      currency: 'NGN',
      interval: data.interval,
      limits: JSON.stringify({}),
      features: JSON.stringify(data.features),
      isActive: true,
    },
  });

  return {
    id: plan.id,
    siteId,
    name: plan.name,
    slug: plan.slug,
    description: plan.description || '',
    price: plan.price,
    currency: plan.currency,
    interval: data.interval,
    features: data.features,
    stripePriceId: plan.stripePriceId,
    subscriberCount: 0,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
  };
}

export async function getNewsletterTiers(siteId: string): Promise<NewsletterTier[]> {
  const plans = await db.plan.findMany({
    where: { slug: { startsWith: `newsletter-${siteId}-` } },
    include: {
      _count: { select: { readerSubscriptions: true } },
    },
  });

  return plans.map((p) => ({
    id: p.id,
    siteId,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: p.price,
    currency: p.currency,
    interval: p.interval as NewsletterTier['interval'],
    features: (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })(),
    stripePriceId: p.stripePriceId,
    subscriberCount: p._count.readerSubscriptions,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }));
}

// ─── Checkout ────────────────────────────────────────────────

/**
 * Starts a real Stripe subscription checkout for a reader buying this tier.
 * The Plan needs a stripePriceId configured first (create the Price in Stripe,
 * save its id on the Plan). Access is only granted once the webhook confirms
 * the subscription was actually created.
 */
export async function createNewsletterCheckoutSession(
  siteId: string,
  tierId: string,
  email: string,
  successUrl: string,
  cancelUrl: string,
) {
  return createReaderSubscriptionCheckoutSession({ siteId, planId: tierId, email, successUrl, cancelUrl });
}

// ─── Subscriber Management ──────────────────────────────────

export async function getPremiumSubscribers(siteId: string): Promise<{
  email: string;
  firstName: string | null;
  tier: string;
  subscribedAt: string;
  status: string;
}[]> {
  const subs = await db.readerSubscription.findMany({
    where: { siteId, status: 'ACTIVE' },
    include: { plan: true, subscriber: true },
    orderBy: { createdAt: 'desc' },
  });

  return subs.map((s) => ({
    email: s.subscriber.email,
    firstName: s.subscriber.firstName,
    tier: s.plan.name,
    subscribedAt: s.createdAt.toISOString(),
    status: s.status,
  }));
}

/**
 * Whether this email has active paid access to the given tier (Plan id).
 * Filters by subscriber + plan explicitly — this used to check for *any*
 * active subscription anywhere on the platform, which was a real access bug.
 */
export async function checkPremiumAccess(
  siteId: string,
  email: string,
  requiredPlanId: string,
): Promise<boolean> {
  const subscriber = await db.subscriber.findFirst({
    where: { siteId, email, status: 'SUBSCRIBED' },
  });
  if (!subscriber) return false;

  const subscription = await db.readerSubscription.findFirst({
    where: { subscriberId: subscriber.id, planId: requiredPlanId, status: 'ACTIVE' },
    include: { plan: true },
  });
  if (!subscription) return false;

  if (subscription.plan.interval === 'LIFETIME') return true;

  return !!(subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date());
}

// ─── Newsletter Analytics ───────────────────────────────────

export async function getNewsletterAnalytics(siteId: string): Promise<NewsletterAnalytics> {
  const totalSubscribers = await db.subscriber.count({ where: { siteId } });
  const activeSubscriptions = await db.readerSubscription.count({ where: { siteId, status: 'ACTIVE' } });

  const tiers = await getNewsletterTiers(siteId);

  return {
    totalSubscribers,
    paidSubscribers: activeSubscriptions,
    freeSubscribers: Math.max(0, totalSubscribers - activeSubscriptions),
    monthlyRevenue: tiers.reduce((s, t) => s + (t.price * t.subscriberCount), 0),
    churnRate: 0,
    avgOpenRate: 0,
    tiers: tiers.map((t) => ({ name: t.name, subscribers: t.subscriberCount, revenue: t.price * t.subscriberCount })),
  };
}

// ─── Content Gating ─────────────────────────────────────────

export async function getGatedContent(
  articleId: string,
  siteId: string,
  email?: string,
): Promise<{
  isGated: boolean;
  tierRequired: string | null;
  hasAccess: boolean;
  teaserContent: string;
  fullContent: string | null;
}> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      id: true,
      title: true,
      rewrittenContent: true,
      originalContent: true,
      excerpt: true,
      seoDescription: true,
      premiumTierId: true,
    },
  });

  if (!article) throw new Error('Article not found');

  const content = article.rewrittenContent || article.originalContent || '';
  const teaserContent = content.slice(0, 500) + '...';

  const tierRequired = article.premiumTierId;

  if (!tierRequired) {
    return { isGated: false, tierRequired: null, hasAccess: true, teaserContent: content, fullContent: content };
  }

  const hasAccess = email ? await checkPremiumAccess(siteId, email, tierRequired) : false;

  return {
    isGated: true,
    tierRequired,
    hasAccess,
    teaserContent,
    fullContent: hasAccess ? content : null,
  };
}

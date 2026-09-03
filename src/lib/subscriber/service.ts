import { db } from '@/lib/db';
import { SUBSCRIBER_STATUS, SUBSCRIBER_SOURCE, type CreateSubscriberInput, type SubscriberWithStats } from './types';

export async function createSubscriber(data: CreateSubscriberInput) {
  const { siteId, email, firstName, source } = data;

  const existing = await db.subscriber.findUnique({
    where: { email_siteId: { email, siteId } },
  });

  if (existing) {
    if (existing.status === SUBSCRIBER_STATUS.BOUNCED) {
      throw new Error('Cannot resubscribe a bounced email address');
    }
    if (existing.status === SUBSCRIBER_STATUS.SUPPRESSED) {
      throw new Error('Cannot resubscribe a suppressed email address');
    }
    if (existing.status === SUBSCRIBER_STATUS.UNSUBSCRIBED) {
      return db.subscriber.update({
        where: { id: existing.id },
        data: {
          status: SUBSCRIBER_STATUS.SUBSCRIBED,
          consentAt: new Date(),
          unsubscribedAt: null,
          firstName: firstName ?? existing.firstName,
          source: source ?? existing.source,
        },
      });
    }
    // Already subscribed
    return existing;
  }

  return db.subscriber.create({
    data: {
      siteId,
      email: email.toLowerCase(),
      firstName: firstName ?? null,
      status: SUBSCRIBER_STATUS.SUBSCRIBED,
      source: source ?? SUBSCRIBER_SOURCE.ARTICLE,
      consentAt: new Date(),
    },
  });
}

export async function listSubscribers(
  siteId: string,
  filters?: {
    status?: string;
    source?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const where: Record<string, unknown> = { siteId };

  if (filters?.status) where.status = filters.status;
  if (filters?.source) where.source = filters.source;
  if (filters?.search) {
    where.OR = [
      { email: { contains: filters.search } },
      { firstName: { contains: filters.search } },
    ];
  }

  const [subscribers, total] = await Promise.all([
    db.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            leads: true,
            emailEvents: true,
            productPurchases: true,
            affiliateClicks: true,
            conversionEvents: true,
          },
        },
      },
    }),
    db.subscriber.count({ where }),
  ]);

  return { subscribers: subscribers as unknown as SubscriberWithStats[], total, page, limit };
}

export async function getSubscriberStats(siteId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, subscribed, unsubscribed, bounced, suppressed, newThisMonth, unsubscribedThisMonth] =
    await Promise.all([
      db.subscriber.count({ where: { siteId } }),
      db.subscriber.count({ where: { siteId, status: SUBSCRIBER_STATUS.SUBSCRIBED } }),
      db.subscriber.count({ where: { siteId, status: SUBSCRIBER_STATUS.UNSUBSCRIBED } }),
      db.subscriber.count({ where: { siteId, status: SUBSCRIBER_STATUS.BOUNCED } }),
      db.subscriber.count({ where: { siteId, status: SUBSCRIBER_STATUS.SUPPRESSED } }),
      db.subscriber.count({
        where: { siteId, status: SUBSCRIBER_STATUS.SUBSCRIBED, createdAt: { gte: monthStart } },
      }),
      db.subscriber.count({
        where: { siteId, status: SUBSCRIBER_STATUS.UNSUBSCRIBED, unsubscribedAt: { gte: monthStart } },
      }),
    ]);

  return {
    total,
    byStatus: { subscribed, unsubscribed, bounced, suppressed },
    newThisMonth,
    unsubscribedThisMonth,
  };
}

export async function unsubscribeSubscriber(id: string, siteId: string) {
  const existing = await db.subscriber.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Subscriber not found');

  return db.subscriber.update({
    where: { id },
    data: {
      status: SUBSCRIBER_STATUS.UNSUBSCRIBED,
      unsubscribedAt: new Date(),
    },
  });
}

export async function deleteSubscriber(id: string, siteId: string) {
  const existing = await db.subscriber.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Subscriber not found');

  return db.subscriber.update({
    where: { id },
    data: {
      status: SUBSCRIBER_STATUS.SUPPRESSED,
    },
  });
}

export async function exportSubscribers(siteId: string) {
  return db.subscriber.findMany({
    where: { siteId, status: SUBSCRIBER_STATUS.SUBSCRIBED },
    orderBy: { createdAt: 'desc' },
    select: {
      email: true,
      firstName: true,
      status: true,
      source: true,
      consentAt: true,
      createdAt: true,
    },
  });
}

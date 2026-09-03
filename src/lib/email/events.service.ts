import { db } from '@/lib/db';
import { EVENT_TYPE } from './types';

export async function trackEvent(data: {
  siteId: string;
  campaignId?: string;
  subscriberId: string;
  type: string;
  metadata?: unknown;
}) {
  const { siteId, campaignId, subscriberId, type, metadata } = data;

  // Validate event type
  const validTypes = Object.values(EVENT_TYPE);
  if (!validTypes.includes(type as never)) {
    throw new Error(`Invalid event type: ${type}`);
  }

  return db.emailEvent.create({
    data: {
      siteId,
      campaignId: campaignId ?? null,
      subscriberId,
      type,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function updateCampaignCounts(campaignId: string) {
  const [sent, delivered, opened, clicked, bounced, unsubscribed, complained] = await Promise.all([
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.SENT } }),
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.DELIVERED } }),
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.OPENED } }),
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.CLICKED } }),
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.BOUNCED } }),
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.UNSUBSCRIBED } }),
    db.emailEvent.count({ where: { campaignId, type: EVENT_TYPE.COMPLAINED } }),
  ]);

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: {
      subscriberCount: sent,
      openCount: opened,
      clickCount: clicked,
      bounceCount: bounced,
      unsubscribeCount: unsubscribed,
    },
  });

  return { sent, delivered, opened, clicked, bounced, unsubscribed, complained };
}

export async function getEventStats(
  siteId: string,
  filters?: {
    campaignId?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  const where: Record<string, unknown> = { siteId };

  if (filters?.campaignId) where.campaignId = filters.campaignId;

  if (filters?.startDate || filters?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filters?.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters?.endDate) dateFilter.lte = new Date(filters.endDate);
    where.createdAt = dateFilter;
  }

  const [total, sent, delivered, opened, clicked, bounced, unsubscribed, complained] =
    await Promise.all([
      db.emailEvent.count({ where }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.SENT } }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.DELIVERED } }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.OPENED } }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.CLICKED } }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.BOUNCED } }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.UNSUBSCRIBED } }),
      db.emailEvent.count({ where: { ...where, type: EVENT_TYPE.COMPLAINED } }),
    ]);

  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';
  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0.0';
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : '0.0';

  return {
    total,
    byType: { sent, delivered, opened, clicked, bounced, unsubscribed, complained },
    rates: {
      openRate: Number(openRate),
      clickRate: Number(clickRate),
      bounceRate: Number(bounceRate),
    },
  };
}

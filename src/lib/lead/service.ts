import { db } from '@/lib/db';
import { createSubscriber } from '@/lib/subscriber/service';
import { SUBSCRIBER_SOURCE } from '@/lib/subscriber/types';

const LEAD_SOURCE = {
  ARTICLE: 'ARTICLE',
  POPUP: 'POPUP',
  LEAD_MAGNET: 'LEAD_MAGNET',
  LANDING_PAGE: 'LANDING_PAGE',
  CHECKOUT: 'CHECKOUT',
  MANUAL: 'MANUAL',
  OTHER: 'OTHER',
} as const;

const LEAD_STATUS = {
  CAPTURED: 'CAPTURED',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
} as const;

export interface CaptureLeadInput {
  siteId: string;
  email: string;
  firstName?: string;
  articleId?: string;
  leadMagnetId?: string;
  source?: string;
}

export async function captureLead(data: CaptureLeadInput) {
  const { siteId, email, firstName, articleId, leadMagnetId, source } = data;

  // Find or create subscriber
  let subscriber = await db.subscriber.findUnique({
    where: { email_siteId: { email: email.toLowerCase(), siteId } },
  });

  if (!subscriber) {
    subscriber = await createSubscriber({
      siteId,
      email,
      firstName,
      source: (source as never) || (leadMagnetId ? SUBSCRIBER_SOURCE.LEAD_MAGNET : SUBSCRIBER_SOURCE.ARTICLE),
    });
  }

  // Create the lead record
  const lead = await db.lead.create({
    data: {
      siteId,
      subscriberId: subscriber.id,
      articleId: articleId ?? null,
      leadMagnetId: leadMagnetId ?? null,
      email: email.toLowerCase(),
      firstName: firstName ?? null,
      status: LEAD_STATUS.CAPTURED,
      source: source || LEAD_STATUS.CAPTURED === 'CAPTURED' ? (source || 'ARTICLE') : 'ARTICLE',
    },
  });

  // Increment lead magnet delivery count if applicable
  if (leadMagnetId) {
    await db.leadMagnet.update({
      where: { id: leadMagnetId },
      data: { deliveryCount: { increment: 1 } },
    });
  }

  return lead;
}

export async function listLeads(
  siteId: string,
  filters?: {
    articleId?: string;
    leadMagnetId?: string;
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const where: Record<string, unknown> = { siteId };

  if (filters?.articleId) where.articleId = filters.articleId;
  if (filters?.leadMagnetId) where.leadMagnetId = filters.leadMagnetId;
  if (filters?.status) where.status = filters.status;
  if (filters?.source) where.source = filters.source;

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        article: { select: { id: true, title: true } },
        leadMagnet: { select: { id: true, name: true, title: true } },
        subscriber: { select: { id: true, email: true, status: true } },
      },
    }),
    db.lead.count({ where }),
  ]);

  return { leads, total, page, limit };
}

export async function getLeadStats(siteId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, thisMonth, bySource, byStatus] = await Promise.all([
    db.lead.count({ where: { siteId } }),
    db.lead.count({ where: { siteId, createdAt: { gte: monthStart } } }),
    db.lead.groupBy({
      by: ['source'],
      where: { siteId },
      _count: true,
    }),
    db.lead.groupBy({
      by: ['status'],
      where: { siteId },
      _count: true,
    }),
  ]);

  return {
    total,
    thisMonth,
    bySource: Object.fromEntries(bySource.map((s) => [s.source, s._count])),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  };
}

export async function updateLeadStatus(id: string, siteId: string, status: string) {
  const existing = await db.lead.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Lead not found');

  const validStatuses = Object.values(LEAD_STATUS);
  if (!validStatuses.includes(status as never)) {
    throw new Error('Invalid lead status');
  }

  return db.lead.update({
    where: { id },
    data: { status },
  });
}

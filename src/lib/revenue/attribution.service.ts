import { db } from '@/lib/db';

// ─── Record Attribution ──────────────────────────────────────

export interface AttributionInput {
  organizationId: string;
  siteId?: string;
  visitorId?: string;
  sessionId?: string;
  articleId?: string;
  eventId?: string;
  leadId?: string;
  subscriberId?: string;
  offerType?: string;
  offerId?: string;
  conversionId?: string;
  revenueId?: string;
  attributedAmount: number;
  currency?: string;
  attributionModel?: string;
  occurredAt?: Date;
}

export async function recordAttribution(input: AttributionInput) {
  return db.revenueAttribution.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      visitorId: input.visitorId ?? null,
      sessionId: input.sessionId ?? null,
      articleId: input.articleId ?? null,
      eventId: input.eventId ?? null,
      leadId: input.leadId ?? null,
      subscriberId: input.subscriberId ?? null,
      offerType: input.offerType ?? null,
      offerId: input.offerId ?? null,
      conversionId: input.conversionId ?? null,
      revenueId: input.revenueId ?? null,
      attributedAmount: input.attributedAmount,
      currency: input.currency ?? 'NGN',
      attributionModel: input.attributionModel ?? 'LAST_TOUCH',
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

// ─── Query Attributions ──────────────────────────────────────

export interface AttributionFilters {
  organizationId: string;
  siteId?: string;
  articleId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export async function getAttributions(filters: AttributionFilters) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    organizationId: filters.organizationId,
  };
  if (filters.siteId) where.siteId = filters.siteId;
  if (filters.articleId) where.articleId = filters.articleId;
  if (filters.startDate || filters.endDate) {
    where.occurredAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {}),
    };
  }

  const [attributions, total] = await Promise.all([
    db.revenueAttribution.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit,
      include: {
        article: { select: { id: true, title: true, slug: true } },
      },
    }),
    db.revenueAttribution.count({ where }),
  ]);

  return {
    attributions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getArticleAttributionSummary(
  organizationId: string,
  siteId?: string,
  days = 30,
) {
  const startDate = new Date(Date.now() - days * 86400000);
  const where: Record<string, unknown> = {
    organizationId,
    occurredAt: { gte: startDate },
    articleId: { not: null },
  };
  if (siteId) where.siteId = siteId;

  const attributions = await db.revenueAttribution.groupBy({
    by: ['articleId'],
    where,
    _sum: { attributedAmount: true },
    _count: true,
    orderBy: { _sum: { attributedAmount: 'desc' } },
  });

  const articleIds = attributions
    .map((a) => a.articleId)
    .filter((id): id is string => id !== null);

  const articles = await db.article.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, title: true, slug: true },
  });

  const articleMap = new Map(articles.map((a) => [a.id, a]));

  return attributions.map((attr) => ({
    articleId: attr.articleId,
    article: attr.articleId ? articleMap.get(attr.articleId) ?? null : null,
    totalAttributed: attr._sum.attributedAmount ?? 0,
    attributionCount: attr._count,
  }));
}

export async function getAttributionByModel(organizationId: string, days = 30) {
  const startDate = new Date(Date.now() - days * 86400000);

  const results = await db.revenueAttribution.groupBy({
    by: ['attributionModel'],
    where: {
      organizationId,
      occurredAt: { gte: startDate },
    },
    _sum: { attributedAmount: true },
    _count: true,
  });

  return results.map((r) => ({
    model: r.attributionModel,
    totalAttributed: r._sum.attributedAmount ?? 0,
    count: r._count,
  }));
}

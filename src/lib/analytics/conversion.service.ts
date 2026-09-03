import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────

export interface TrackConversionInput {
  siteId: string;
  articleId?: string;
  subscriberId?: string;
  eventType: string;
  sourceType: string;
  sourceId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface PeriodFilter {
  startDate?: Date;
  endDate?: Date;
}

// ─── Track Conversion ─────────────────────────────────────────

export async function trackConversion(data: TrackConversionInput) {
  return db.conversionEvent.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId ?? null,
      subscriberId: data.subscriberId ?? null,
      eventType: data.eventType,
      sourceType: data.sourceType,
      sourceId: data.sourceId ?? null,
      value: data.value ?? 0,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}

// ─── Get Conversion Stats ─────────────────────────────────────

export async function getConversionStats(siteId: string, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, undefined, period);

  const [total, events, valueResult] = await Promise.all([
    db.conversionEvent.count({ where }),
    db.conversionEvent.findMany({ where }),
    db.conversionEvent.aggregate({
      where,
      _sum: { value: true },
    }),
  ]);

  // By event type
  const byEventType = new Map<string, number>();
  const bySourceType = new Map<string, number>();

  for (const e of events) {
    byEventType.set(e.eventType, (byEventType.get(e.eventType) || 0) + 1);
    bySourceType.set(e.sourceType, (bySourceType.get(e.sourceType) || 0) + 1);
  }

  return {
    totalConversions: total,
    totalValue: valueResult._sum.value || 0,
    byEventType: mapToSortedArray(byEventType),
    bySourceType: mapToSortedArray(bySourceType),
  };
}

// ─── Get Article Conversions ──────────────────────────────────

export async function getArticleConversions(articleId: string, siteId: string, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, articleId, period);

  const [total, events, valueResult] = await Promise.all([
    db.conversionEvent.count({ where }),
    db.conversionEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }),
    db.conversionEvent.aggregate({
      where,
      _sum: { value: true },
    }),
  ]);

  const byEventType = new Map<string, number>();
  for (const e of events) {
    byEventType.set(e.eventType, (byEventType.get(e.eventType) || 0) + 1);
  }

  return {
    articleId,
    totalConversions: total,
    totalValue: valueResult._sum.value || 0,
    byEventType: mapToSortedArray(byEventType),
    recentEvents: events.slice(0, 50).map((e) => ({
      id: e.id,
      eventType: e.eventType,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      value: e.value,
      createdAt: e.createdAt,
    })),
  };
}

// ─── Get Conversion Funnel (Traffic) ──────────────────────────

export async function getConversionFunnel(siteId: string, period?: PeriodFilter) {
  const dateFilter = period?.startDate || period?.endDate
    ? { date: buildDateRange(period) } as Record<string, unknown>
    : {};

  const [trafficResult, ctaImpressions, ctaClicks, leads, purchases, revenueResult] = await Promise.all([
    // Visitors = total users from traffic metrics
    db.trafficMetric.aggregate({
      where: { siteId, ...dateFilter },
      _sum: { users: true },
    }),
    // CTA impressions
    db.conversionEvent.count({
      where: { siteId, eventType: 'CTA_IMPRESSION', ...buildDateFilterRaw(siteId, period) },
    }),
    // CTA clicks
    db.conversionEvent.count({
      where: { siteId, eventType: 'CTA_CLICK', ...buildDateFilterRaw(siteId, period) },
    }),
    // Leads (subscriber signups)
    db.conversionEvent.count({
      where: { siteId, eventType: 'LEAD_CAPTURED', ...buildDateFilterRaw(siteId, period) },
    }),
    // Purchases
    db.conversionEvent.count({
      where: { siteId, eventType: 'PURCHASE', ...buildDateFilterRaw(siteId, period) },
    }),
    // Revenue from purchases
    db.conversionEvent.aggregate({
      where: { siteId, eventType: 'PURCHASE', ...buildDateFilterRaw(siteId, period) },
      _sum: { value: true },
    }),
  ]);

  const visitors = trafficResult._sum.users || 0;

  return {
    visitors,
    ctaImpressions,
    ctaClicks,
    leads,
    purchases,
    revenue: revenueResult._sum.value || 0,
    rates: {
      impressionRate: visitors > 0 ? ctaImpressions / visitors : 0,
      clickRate: ctaImpressions > 0 ? ctaClicks / ctaImpressions : 0,
      leadRate: ctaClicks > 0 ? leads / ctaClicks : 0,
      purchaseRate: leads > 0 ? purchases / leads : 0,
      overallRate: visitors > 0 ? purchases / visitors : 0,
    },
  };
}

// ─── Get Email Conversion Funnel ──────────────────────────────

export async function getEmailConversionFunnel(siteId: string, period?: PeriodFilter) {
  const conversionWhere = buildDateFilterRaw(siteId, period);

  const [subscribers, emailDelivered, emailClicks, landingPageVisits, purchases, revenueResult] = await Promise.all([
    // Total subscribers
    db.subscriber.count({ where: { siteId } }),
    // Emails delivered (sent email events)
    db.emailEvent.count({
      where: { siteId, type: 'SENT', ...buildEmailDateFilter(period) },
    }),
    // Email clicks
    db.emailEvent.count({
      where: { siteId, type: 'CLICK', ...buildEmailDateFilter(period) },
    }),
    // Landing page visits from email
    db.conversionEvent.count({
      where: { siteId, sourceType: 'EMAIL', eventType: 'PAGE_VIEW', ...conversionWhere },
    }),
    // Purchases from email traffic
    db.conversionEvent.count({
      where: { siteId, sourceType: 'EMAIL', eventType: 'PURCHASE', ...conversionWhere },
    }),
    // Revenue from email purchases
    db.conversionEvent.aggregate({
      where: { siteId, sourceType: 'EMAIL', eventType: 'PURCHASE', ...conversionWhere },
      _sum: { value: true },
    }),
  ]);

  return {
    subscribers,
    emailsDelivered: emailDelivered,
    emailClicks,
    landingPageVisits,
    purchases,
    revenue: revenueResult._sum.value || 0,
    rates: {
      deliveryRate: subscribers > 0 ? emailDelivered / subscribers : 0,
      clickRate: emailDelivered > 0 ? emailClicks / emailDelivered : 0,
      landingRate: emailClicks > 0 ? landingPageVisits / emailClicks : 0,
      purchaseRate: landingPageVisits > 0 ? purchases / landingPageVisits : 0,
      overallRate: emailDelivered > 0 ? purchases / emailDelivered : 0,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function buildDateFilter(siteId: string, articleId?: string, period?: PeriodFilter): Prisma.ConversionEventWhereInput {
  const where: Prisma.ConversionEventWhereInput = { siteId };
  if (articleId) where.articleId = articleId;
  if (period?.startDate || period?.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.createdAt = dateFilter;
  }
  return where;
}

function buildDateFilterRaw(siteId: string, period?: PeriodFilter): Record<string, unknown> {
  const where: Record<string, unknown> = { siteId };
  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.createdAt = dateFilter;
  }
  return where;
}

function buildEmailDateFilter(period?: PeriodFilter): Record<string, unknown> {
  if (!period?.startDate && !period?.endDate) return {};
  const dateFilter: Record<string, unknown> = {};
  if (period.startDate) dateFilter.gte = period.startDate;
  if (period.endDate) dateFilter.lte = period.endDate;
  return { createdAt: dateFilter };
}

function buildDateRange(period?: PeriodFilter): Prisma.DateTimeFilter {
  const filter: Prisma.DateTimeFilter = {};
  if (period?.startDate) filter.gte = period.startDate;
  if (period?.endDate) filter.lte = period.endDate;
  return filter;
}

function mapToSortedArray(map: Map<string, number>): { name: string; value: number }[] {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

import { db } from '@/lib/db';

// ─── Track Events ────────────────────────────────────────────

export interface TrackEventInput {
  organizationId: string;
  siteId?: string;
  userId?: string;
  visitorId?: string;
  sessionId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
  source?: string;
  occurredAt?: Date;
}

export async function trackEvent(input: TrackEventInput) {
  return db.event.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      userId: input.userId ?? null,
      visitorId: input.visitorId ?? null,
      sessionId: input.sessionId ?? null,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      properties: input.properties ? JSON.stringify(input.properties) : null,
      source: input.source ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

export async function trackPageView(data: {
  organizationId: string;
  siteId: string;
  articleId?: string;
  visitorId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
}) {
  return trackEvent({
    organizationId: data.organizationId,
    siteId: data.siteId,
    visitorId: data.visitorId,
    sessionId: data.sessionId,
    eventType: 'PAGE_VIEW',
    entityType: 'ARTICLE',
    entityId: data.articleId,
    properties: data.properties,
    source: 'WEB',
  });
}

export async function trackCTAClick(data: {
  organizationId: string;
  siteId: string;
  articleId?: string;
  ctaId: string;
  visitorId?: string;
  sessionId?: string;
}) {
  return trackEvent({
    organizationId: data.organizationId,
    siteId: data.siteId,
    visitorId: data.visitorId,
    sessionId: data.sessionId,
    eventType: 'CTA_CLICK',
    entityType: 'CTA',
    entityId: data.ctaId,
    properties: { articleId: data.articleId },
    source: 'WEB',
  });
}

export async function trackConversion(data: {
  organizationId: string;
  siteId: string;
  articleId?: string;
  conversionType: string;
  value?: number;
  visitorId?: string;
  sessionId?: string;
}) {
  return trackEvent({
    organizationId: data.organizationId,
    siteId: data.siteId,
    visitorId: data.visitorId,
    sessionId: data.sessionId,
    eventType: 'CONVERSION',
    entityType: data.conversionType,
    entityId: data.articleId,
    properties: { value: data.value ?? 0 },
    source: 'WEB',
  });
}

// ─── Query Events ────────────────────────────────────────────

export interface EventFilters {
  organizationId: string;
  siteId?: string;
  eventType?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export async function queryEvents(filters: EventFilters) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    organizationId: filters.organizationId,
  };
  if (filters.siteId) where.siteId = filters.siteId;
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.startDate || filters.endDate) {
    where.occurredAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {}),
    };
  }

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit,
    }),
    db.event.count({ where }),
  ]);

  return {
    events,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getEventStats(organizationId: string, siteId?: string, days = 30) {
  const startDate = new Date(Date.now() - days * 86400000);
  const where: Record<string, unknown> = {
    organizationId,
    occurredAt: { gte: startDate },
  };
  if (siteId) where.siteId = siteId;

  const [total, byType, uniqueVisitors] = await Promise.all([
    db.event.count({ where }),
    db.event.groupBy({
      by: ['eventType'],
      where,
      _count: true,
      orderBy: { _count: { eventType: 'desc' } },
    }),
    db.event.findMany({
      where: { ...where, visitorId: { not: null } },
      select: { visitorId: true },
      distinct: ['visitorId'],
    }),
  ]);

  return {
    total,
    uniqueVisitors: uniqueVisitors.length,
    byType: byType.map((r) => ({ eventType: r.eventType, count: r._count })),
    periodDays: days,
  };
}

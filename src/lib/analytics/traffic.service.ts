import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────

export interface UpsertTrafficInput {
  siteId: string;
  articleId?: string;
  date: Date;
  pageViews: number;
  sessions: number;
  users: number;
  trafficSource?: string;
  country?: string;
  device?: string;
}

export interface PeriodFilter {
  startDate?: Date;
  endDate?: Date;
}

// ─── Upsert Traffic Metric ────────────────────────────────────

export async function upsertTrafficMetric(data: UpsertTrafficInput) {
  const { siteId, articleId, date, pageViews, sessions, users, trafficSource, country, device } = data;

  // Build same-day date range for matching
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const whereClause: Prisma.TrafficMetricWhereInput = {
    siteId,
    date: { gte: dayStart, lte: dayEnd },
    trafficSource: trafficSource ?? null,
    device: device ?? null,
  };

  if (articleId) {
    whereClause.articleId = articleId;
  } else {
    whereClause.articleId = null;
  }

  const existing = await db.trafficMetric.findFirst({ where: whereClause });

  if (existing) {
    return db.trafficMetric.update({
      where: { id: existing.id },
      data: {
        pageViews: { increment: pageViews },
        sessions: { increment: sessions },
        users: { increment: users },
        country: country || existing.country,
      },
    });
  }

  return db.trafficMetric.create({
    data: {
      siteId,
      articleId: articleId ?? null,
      date,
      pageViews,
      sessions,
      users,
      trafficSource: trafficSource ?? null,
      country: country ?? null,
      device: device ?? null,
    },
  });
}

// ─── Get Traffic Stats ────────────────────────────────────────

export async function getTrafficStats(siteId: string, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, undefined, period);

  const [aggregates, metrics] = await Promise.all([
    db.trafficMetric.aggregate({
      where,
      _sum: { pageViews: true, sessions: true, users: true },
      _count: true,
    }),
    db.trafficMetric.findMany({ where }),
  ]);

  // Top traffic sources
  const sourceMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const dailyMap = new Map<string, { date: string; pageViews: number; sessions: number; users: number }>();

  for (const m of metrics) {
    // Source aggregation
    if (m.trafficSource) {
      sourceMap.set(m.trafficSource, (sourceMap.get(m.trafficSource) || 0) + m.pageViews);
    }
    // Country aggregation
    if (m.country) {
      countryMap.set(m.country, (countryMap.get(m.country) || 0) + m.pageViews);
    }
    // Device aggregation
    if (m.device) {
      deviceMap.set(m.device, (deviceMap.get(m.device) || 0) + m.pageViews);
    }
    // Daily trend
    const dayKey = m.date.toISOString().split('T')[0];
    const existing = dailyMap.get(dayKey);
    if (existing) {
      existing.pageViews += m.pageViews;
      existing.sessions += m.sessions;
      existing.users += m.users;
    } else {
      dailyMap.set(dayKey, {
        date: dayKey,
        pageViews: m.pageViews,
        sessions: m.sessions,
        users: m.users,
      });
    }
  }

  // Sort daily trend and take last 30 days
  const dailyTrend = Array.from(dailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Sort top lists by count desc
  const topSources = sortByValue(sourceMap);
  const topCountries = sortByValue(countryMap);
  const topDevices = sortByValue(deviceMap);

  return {
    totalPageViews: aggregates._sum.pageViews || 0,
    totalSessions: aggregates._sum.sessions || 0,
    totalUsers: aggregates._sum.users || 0,
    topSources,
    topCountries,
    topDevices,
    dailyTrend,
  };
}

// ─── Get Article Traffic ──────────────────────────────────────

export async function getArticleTraffic(articleId: string, siteId: string, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, articleId, period);

  const [aggregates, metrics] = await Promise.all([
    db.trafficMetric.aggregate({
      where,
      _sum: { pageViews: true, sessions: true, users: true },
    }),
    db.trafficMetric.findMany({
      where,
      orderBy: { date: 'desc' },
    }),
  ]);

  const dailyTrend = aggregateDaily(metrics);

  return {
    articleId,
    totalPageViews: aggregates._sum.pageViews || 0,
    totalSessions: aggregates._sum.sessions || 0,
    totalUsers: aggregates._sum.users || 0,
    dailyTrend,
  };
}

// ─── Get Top Traffic Articles ─────────────────────────────────

export async function getTopTrafficArticles(siteId: string, limit: number = 10, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, undefined, period);
  where.articleId = { not: null };

  const metrics = await db.trafficMetric.groupBy({
    by: ['articleId'],
    where,
    _sum: { pageViews: true, sessions: true, users: true },
    orderBy: { _sum: { pageViews: 'desc' } },
    take: limit,
  });

  // Fetch article details for each
  const articleIds = metrics.map((m) => m.articleId).filter(Boolean) as string[];
  const articles = articleIds.length > 0
    ? await db.article.findMany({
        where: { id: { in: articleIds } },
        select: { id: true, title: true, slug: true },
      })
    : [];

  const articleMap = new Map(articles.map((a) => [a.id, a]));

  return metrics.map((m) => {
    const article = articleMap.get(m.articleId!);
    return {
      articleId: m.articleId,
      title: article?.title ?? 'Unknown',
      slug: article?.slug ?? null,
      pageViews: m._sum.pageViews || 0,
      sessions: m._sum.sessions || 0,
      users: m._sum.users || 0,
    };
  });
}

// ─── Import Traffic Data (bulk upsert) ────────────────────────

export async function importTrafficData(siteId: string, data: UpsertTrafficInput[]) {
  const results = await Promise.allSettled(
    data.map((item) => upsertTrafficMetric({ ...item, siteId }))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return { succeeded, failed, total: data.length };
}

// ─── Helpers ──────────────────────────────────────────────────

function buildDateFilter(siteId: string, articleId?: string, period?: PeriodFilter): Prisma.TrafficMetricWhereInput {
  const where: Prisma.TrafficMetricWhereInput = { siteId };
  if (articleId) where.articleId = articleId;
  if (period?.startDate || period?.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.date = dateFilter;
  }
  return where;
}

function aggregateDaily(metrics: { date: Date; pageViews: number; sessions: number; users: number }[]) {
  const map = new Map<string, { date: string; pageViews: number; sessions: number; users: number }>();
  for (const m of metrics) {
    const key = m.date.toISOString().split('T')[0];
    const existing = map.get(key);
    if (existing) {
      existing.pageViews += m.pageViews;
      existing.sessions += m.sessions;
      existing.users += m.users;
    } else {
      map.set(key, { date: key, pageViews: m.pageViews, sessions: m.sessions, users: m.users });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function sortByValue(map: Map<string, number>): { name: string; value: number }[] {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

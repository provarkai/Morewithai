import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────

export interface UpsertSearchInput {
  siteId: string;
  articleId: string;
  date: Date;
  query: string;
  impressions: number;
  clicks: number;
  ctr?: number;
  position?: number;
}

export interface PeriodFilter {
  startDate?: Date;
  endDate?: Date;
}

// ─── Upsert Search Metric ─────────────────────────────────────

export async function upsertSearchMetric(data: UpsertSearchInput) {
  const { siteId, articleId, date, query, impressions, clicks, ctr, position } = data;

  // Build same-day date range
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await db.searchMetric.findFirst({
    where: {
      siteId,
      articleId,
      date: { gte: dayStart, lte: dayEnd },
      query,
    },
  });

  if (existing) {
    const newImpressions = existing.impressions + impressions;
    const newClicks = existing.clicks + clicks;
    const computedCtr = newImpressions > 0 ? newClicks / newImpressions : 0;

    return db.searchMetric.update({
      where: { id: existing.id },
      data: {
        impressions: newImpressions,
        clicks: newClicks,
        ctr: ctr ?? computedCtr,
        position: position ?? existing.position,
      },
    });
  }

  const computedCtr = impressions > 0 ? clicks / impressions : 0;

  return db.searchMetric.create({
    data: {
      siteId,
      articleId,
      date,
      query,
      impressions,
      clicks,
      ctr: ctr ?? computedCtr,
      position: position ?? 0,
    },
  });
}

// ─── Get Search Stats ─────────────────────────────────────────

export async function getSearchStats(siteId: string, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, undefined, period);

  const [aggregates, metrics] = await Promise.all([
    db.searchMetric.aggregate({
      where,
      _sum: { impressions: true, clicks: true },
      _avg: { position: true },
      _count: true,
    }),
    db.searchMetric.findMany({ where }),
  ]);

  // Top queries by clicks
  const queryMap = new Map<string, { impressions: number; clicks: number; totalPosition: number; count: number }>();

  for (const m of metrics) {
    const existing = queryMap.get(m.query);
    if (existing) {
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.totalPosition += m.position;
      existing.count += 1;
    } else {
      queryMap.set(m.query, {
        impressions: m.impressions,
        clicks: m.clicks,
        totalPosition: m.position,
        count: 1,
      });
    }
  }

  const topQueries = Array.from(queryMap.entries())
    .map(([query, data]) => ({
      query,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
      avgPosition: data.count > 0 ? data.totalPosition / data.count : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);

  return {
    totalImpressions: aggregates._sum.impressions || 0,
    totalClicks: aggregates._sum.clicks || 0,
    avgCtr: (aggregates._avg as any).ctr || 0,
    avgPosition: aggregates._avg.position || 0,
    uniqueQueries: aggregates._count,
    topQueries,
  };
}

// ─── Get Article Search ───────────────────────────────────────

export async function getArticleSearch(articleId: string, siteId: string, period?: PeriodFilter) {
  const where = buildDateFilter(siteId, articleId, period);

  const [aggregates, metrics] = await Promise.all([
    db.searchMetric.aggregate({
      where,
      _sum: { impressions: true, clicks: true },
      _avg: { position: true },
    }),
    db.searchMetric.findMany({
      where,
      orderBy: { clicks: 'desc' },
    }),
  ]);

  return {
    articleId,
    totalImpressions: aggregates._sum.impressions || 0,
    totalClicks: aggregates._sum.clicks || 0,
    avgCtr: (aggregates._avg as any).ctr || 0,
    avgPosition: aggregates._avg.position || 0,
    queries: metrics.map((m) => ({
      query: m.query,
      impressions: m.impressions,
      clicks: m.clicks,
      ctr: m.ctr,
      position: m.position,
      date: m.date,
    })),
  };
}

// ─── Get Low CTR Articles ─────────────────────────────────────

export async function getLowCtrArticles(siteId: string, minImpressions: number = 50, threshold: number = 0.05) {
  const where: Prisma.SearchMetricWhereInput = { siteId };

  // Group by article and aggregate
  const grouped = await db.searchMetric.groupBy({
    by: ['articleId'],
    where,
    _sum: { impressions: true, clicks: true },
    _avg: { position: true },
  });

  const results: any[] = [];
  for (const g of grouped) {
    const impressions = g._sum.impressions || 0;
    const clicks = g._sum.clicks || 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;

    if (impressions >= minImpressions && ctr < threshold) {
 const article = await db.article.findUnique({
        where: { id: g.articleId },
        select: { id: true, title: true, slug: true },
      });
      if (article) {
        results.push({
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          impressions,
          clicks,
          ctr,
          avgPosition: (g._avg as any).position || 0,
        });
      }
    }
  }

  return results.sort((a: any, b: any) => a.ctr - b.ctr);
}

// ─── Get Ranking Opportunities ────────────────────────────────

export async function getRankingOpportunities(siteId: string) {
  const where: Prisma.SearchMetricWhereInput = { siteId };

  const grouped = await db.searchMetric.groupBy({
    by: ['articleId'],
    where,
    _sum: { impressions: true, clicks: true },
    _avg: { position: true },
  });

  const results: any[] = [];
  for (const g of grouped) {
    const avgPos = (g._avg as any).position || 0;
    // Articles ranking between position 5 and 20
    if (avgPos >= 5 && avgPos <= 20) {
      const article = await db.article.findUnique({
        where: { id: g.articleId },
        select: { id: true, title: true, slug: true },
      });
      if (article) {
        results.push({
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          impressions: g._sum.impressions || 0,
          clicks: g._sum.clicks || 0,
          ctr: (g._avg as any).ctr || 0,
          avgPosition: avgPos,
          gapToTop3: Math.max(0, avgPos - 3),
        });
      }
    }
  }

  return results.sort((a, b) => a.avgPosition - b.avgPosition);
}

// ─── Helpers ──────────────────────────────────────────────────

function buildDateFilter(siteId: string, articleId?: string, period?: PeriodFilter): Prisma.SearchMetricWhereInput {
  const where: Prisma.SearchMetricWhereInput = { siteId };
  if (articleId) where.articleId = articleId;
  if (period?.startDate || period?.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.date = dateFilter;
  }
  return where;
}

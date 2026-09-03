import { db } from '@/lib/db';
import type { RecordRevenueInput, CreateAdjustmentInput, RevenuePeriod, ArticleRevenueData } from './types';

// ─── Record Revenue ──────────────────────────────────────────

export async function recordRevenue(data: RecordRevenueInput) {
  const revenueEvent = await db.revenueEvent.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId ?? null,
      sourceType: data.sourceType,
      sourceId: data.sourceId ?? null,
      amount: data.amount,
      currency: data.currency ?? 'NGN',
      status: data.status ?? 'CONFIRMED',
    },
  });
  return revenueEvent;
}

// ─── Create Adjustment ───────────────────────────────────────

export async function createAdjustment(data: CreateAdjustmentInput) {
  // Verify the related event exists
  const event = await db.revenueEvent.findUnique({
    where: { id: data.relatedEventId },
  });
  if (!event) throw new Error('Revenue event not found');

  const adjustment = await db.revenueAdjustment.create({
    data: {
      siteId: data.siteId,
      relatedEventId: data.relatedEventId,
      amount: data.amount,
      reason: data.reason,
      createdBy: data.createdBy ?? null,
    },
  });

  return adjustment;
}

// ─── Article Revenue ─────────────────────────────────────────

export async function getArticleRevenue(
  articleId: string,
  siteId: string,
  period?: RevenuePeriod
) {
  const where: Record<string, unknown> = {
    articleId,
    siteId,
    status: { in: ['CONFIRMED', 'ADJUSTED'] },
  };

  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.createdAt = dateFilter;
  }

  const [events, visitorsResult] = await Promise.all([
    db.revenueEvent.findMany({ where }),
    getArticleVisitors(articleId, period),
  ]);

  const totalRevenue = events.reduce((sum, e) => sum + e.amount, 0);

  // By source type
  const bySource: Record<string, number> = {};
  for (const event of events) {
    bySource[event.sourceType] = (bySource[event.sourceType] || 0) + event.amount;
  }

  // RPM calculation
  const rpm = visitorsResult > 0 ? (totalRevenue / visitorsResult) * 1000 : 0;

  return {
    totalRevenue,
    bySource,
    visitors: visitorsResult,
    rpm,
  };
}

// ─── Site Revenue ────────────────────────────────────────────

export async function getSiteRevenue(siteId: string, period?: RevenuePeriod) {
  const where = buildDateWhere(siteId, period);

  const [events, visitorsResult] = await Promise.all([
    db.revenueEvent.findMany({
      where,
      include: { article: { select: { id: true, title: true } } },
    }),
    getSiteVisitors(siteId, period),
  ]);

  const totalRevenue = events.reduce((sum, e) => sum + e.amount, 0);

  // By source type
  const bySource: Record<string, number> = {};
  for (const event of events) {
    bySource[event.sourceType] = (bySource[event.sourceType] || 0) + event.amount;
  }

  // By article (top articles)
  const byArticle: Record<string, { title: string; revenue: number }> = {};
  for (const event of events) {
    const key = event.articleId ?? 'no-article';
    if (!byArticle[key]) {
      byArticle[key] = {
        title: event.article?.title ?? 'Unknown',
        revenue: 0,
      };
    }
    byArticle[key].revenue += event.amount;
  }
  const topArticles = Object.entries(byArticle)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([articleId, data]) => ({ articleId, ...data }));

  // Month-over-month
  const mom = await getMonthOverMonth(siteId);

  return {
    totalRevenue,
    bySource,
    topArticles,
    visitors: visitorsResult,
    monthOverMonth: mom,
  };
}

// ─── Top Money Articles ──────────────────────────────────────

export async function getTopMoneyArticles(
  siteId: string,
  limit: number = 10,
  period?: RevenuePeriod
) {
  const where = buildDateWhere(siteId, period);
  where.articleId = { not: null };

  const events = await db.revenueEvent.findMany({
    where,
    include: { article: { select: { id: true, title: true } } },
  });

  // Aggregate by article
  const articleMap = new Map<string, ArticleRevenueData>();
  for (const event of events) {
    if (!event.articleId || !event.article) continue;

    const key = event.articleId;
    if (!articleMap.has(key)) {
      articleMap.set(key, {
        articleId: key,
        articleTitle: event.article.title,
        totalRevenue: 0,
        visitors: 0,
        rpm: 0,
        conversions: 0,
        bySource: {},
      });
    }

    const data = articleMap.get(key)!;
    data.totalRevenue += event.amount;
    data.bySource[event.sourceType] = (data.bySource[event.sourceType] || 0) + event.amount;
  }

  // Enrich with visitor data and conversions
  const articles = await Promise.all(
    Array.from(articleMap.entries()).map(async ([articleId, data]) => {
      const visitors = await getArticleVisitors(articleId, period);
      const conversions = await getArticleConversions(articleId, period);

      return {
        ...data,
        visitors,
        conversions,
        rpm: visitors > 0 ? (data.totalRevenue / visitors) * 1000 : 0,
      };
    })
  );

  // Sort by revenue descending
  articles.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return articles.slice(0, limit);
}

// ─── Revenue by Source ────────────────────────────────────────

export async function getRevenueBySource(siteId: string, period?: RevenuePeriod) {
  const where = buildDateWhere(siteId, period);

  const events = await db.revenueEvent.findMany({ where });

  const bySource: Record<string, number> = {};
  let total = 0;

  for (const event of events) {
    bySource[event.sourceType] = (bySource[event.sourceType] || 0) + event.amount;
    total += event.amount;
  }

  // Add percentages
  const breakdown = Object.entries(bySource).map(([source, amount]) => ({
    source,
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }));

  breakdown.sort((a, b) => b.amount - a.amount);

  return {
    total,
    breakdown,
  };
}

// ─── Revenue Dashboard ────────────────────────────────────────

export async function getRevenueDashboard(siteId: string) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [totalEvents, thisMonthEvents, lastMonthEvents, visitors, articlesWithRevenue, conversions, affiliateConversions] =
    await Promise.all([
      db.revenueEvent.findMany({
        where: { siteId, status: { in: ['CONFIRMED', 'ADJUSTED'] } },
      }),
      db.revenueEvent.findMany({
        where: {
          siteId,
          status: { in: ['CONFIRMED', 'ADJUSTED'] },
          createdAt: { gte: thisMonthStart },
        },
      }),
      db.revenueEvent.findMany({
        where: {
          siteId,
          status: { in: ['CONFIRMED', 'ADJUSTED'] },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      getSiteVisitors(siteId),
      db.revenueEvent.groupBy({
        by: ['articleId'],
        where: { siteId, status: { in: ['CONFIRMED', 'ADJUSTED'] }, articleId: { not: null } },
      }),
      db.productPurchase.count({ where: { siteId, status: 'COMPLETED' } }),
      db.affiliateClick.count({ where: { siteId, status: 'CONVERTED' } }),
    ]);

  const totalRevenue = totalEvents.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthRevenue = thisMonthEvents.reduce((sum, e) => sum + e.amount, 0);
  const lastMonthRevenue = lastMonthEvents.reduce((sum, e) => sum + e.amount, 0);
  const momChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  const totalConversions = conversions + affiliateConversions;
  const revenuePerVisitor = visitors > 0 ? totalRevenue / visitors : 0;
  const revenuePerArticle = articlesWithRevenue.length > 0 ? totalRevenue / articlesWithRevenue.length : 0;
  const conversionRate = visitors > 0 ? (totalConversions / visitors) * 100 : 0;

  return {
    totalRevenue,
    thisMonth: thisMonthRevenue,
    lastMonth: lastMonthRevenue,
    monthOverMonthChange: momChange,
    revenuePerVisitor,
    revenuePerArticle,
    totalConversions,
    conversionRate,
    totalVisitors: visitors,
    monetizedArticles: articlesWithRevenue.length,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function buildDateWhere(siteId: string, period?: RevenuePeriod): Record<string, unknown> {
  const where: Record<string, unknown> = {
    siteId,
    status: { in: ['CONFIRMED', 'ADJUSTED'] },
  };

  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.createdAt = dateFilter;
  }

  return where;
}

async function getArticleVisitors(articleId: string, period?: RevenuePeriod): Promise<number> {
  const where: Record<string, unknown> = { articleId };
  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.date = dateFilter;
  }

  const result = await db.trafficMetric.aggregate({
    where,
    _sum: { pageViews: true },
  });
  return result._sum.pageViews ?? 0;
}

async function getSiteVisitors(siteId: string, period?: RevenuePeriod): Promise<number> {
  const where: Record<string, unknown> = { siteId };
  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.date = dateFilter;
  }

  const result = await db.trafficMetric.aggregate({
    where,
    _sum: { pageViews: true },
  });
  return result._sum.pageViews ?? 0;
}

async function getArticleConversions(articleId: string, period?: RevenuePeriod): Promise<number> {
  const where: Record<string, unknown> = { articleId, status: 'CONVERTED' };
  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.createdAt = dateFilter;
  }

  const affiliateConversions = await db.affiliateClick.count({ where });

  const purchaseWhere: Record<string, unknown> = { articleId, status: 'COMPLETED' };
  if (period?.startDate || period?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (period.startDate) dateFilter.gte = period.startDate;
    if (period.endDate) dateFilter.lte = period.endDate;
    where.createdAt = dateFilter;
    purchaseWhere.createdAt = dateFilter;
  }

  const productConversions = await db.productPurchase.count({ where: purchaseWhere });
  return affiliateConversions + productConversions;
}

async function getMonthOverMonth(siteId: string) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonthEvents, lastMonthEvents] = await Promise.all([
    db.revenueEvent.findMany({
      where: { siteId, status: { in: ['CONFIRMED', 'ADJUSTED'] }, createdAt: { gte: thisMonthStart } },
    }),
    db.revenueEvent.findMany({
      where: { siteId, status: { in: ['CONFIRMED', 'ADJUSTED'] }, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
  ]);

  const thisMonth = thisMonthEvents.reduce((sum, e) => sum + e.amount, 0);
  const lastMonth = lastMonthEvents.reduce((sum, e) => sum + e.amount, 0);
  const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  return {
    thisMonth,
    lastMonth,
    change,
  };
}

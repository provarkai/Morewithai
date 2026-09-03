import { db } from '@/lib/db';

// ─── Calculate Article Economics ─────────────────────────────

export interface EconomicsInput {
  organizationId: string;
  siteId: string;
  articleId: string;
  periodStart: Date;
  periodEnd: Date;
}

export async function calculateArticleEconomics(input: EconomicsInput) {
  const { organizationId, siteId, articleId, periodStart, periodEnd } = input;

  const [revenueData, aiCostData, promotionData] = await Promise.all([
    db.revenueEvent.aggregate({
      where: {
        siteId,
        articleId,
        createdAt: { gte: periodStart, lte: periodEnd },
        status: 'CONFIRMED',
      },
      _sum: { amount: true },
    }),
    db.costEvent.aggregate({
      where: {
        siteId,
        date: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    }),
    // Use traffic metrics as a proxy for promotion cost
    db.trafficMetric.aggregate({
      where: {
        siteId,
        articleId,
        date: { gte: periodStart, lte: periodEnd },
      },
      _sum: { pageViews: true },
    }),
  ]);

  const revenue = revenueData._sum.amount ?? 0;
  const totalCost = aiCostData._sum.amount ?? 0;
  const profit = revenue - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : revenue > 0 ? 100 : 0;

  return db.contentEconomics.upsert({
    where: {
      articleId_periodStart_periodEnd: { articleId, periodStart, periodEnd },
    },
    update: {
      revenue,
      aiCost: totalCost * 0.6,
      promotionCost: totalCost * 0.3,
      otherCost: totalCost * 0.1,
      totalCost,
      profit,
      roi,
      calculatedAt: new Date(),
    },
    create: {
      organizationId,
      siteId,
      articleId,
      periodStart,
      periodEnd,
      revenue,
      aiCost: totalCost * 0.6,
      promotionCost: totalCost * 0.3,
      otherCost: totalCost * 0.1,
      totalCost,
      profit,
      roi,
    },
  });
}

// ─── Batch Calculate ─────────────────────────────────────────

export async function batchCalculateEconomics(
  organizationId: string,
  siteId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const articles = await db.article.findMany({
    where: { siteId, status: { in: ['published', 'PUBLISHED'] } },
    select: { id: true },
    take: 200,
  });

  const results = await Promise.allSettled(
    articles.map((a) =>
      calculateArticleEconomics({
        organizationId,
        siteId,
        articleId: a.id,
        periodStart,
        periodEnd,
      }),
    ),
  );

  return {
    processed: articles.length,
    succeeded: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

// ─── Query Economics ─────────────────────────────────────────

export async function getTopEarningArticles(siteId: string, limit = 20) {
  return db.contentEconomics.findMany({
    where: { siteId },
    orderBy: { revenue: 'desc' },
    take: limit,
    include: {
      article: { select: { id: true, title: true, slug: true } },
    },
  });
}

export async function getSiteEconomicsSummary(siteId: string, periodStart: Date, periodEnd: Date) {
  const economics = await db.contentEconomics.aggregate({
    where: {
      siteId,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
    _sum: { revenue: true, totalCost: true, profit: true },
    _count: true,
  });

  const totalRevenue = economics._sum.revenue ?? 0;
  const totalCost = economics._sum.totalCost ?? 0;
  const totalProfit = economics._sum.profit ?? 0;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    roi: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
    articleCount: economics._count,
    avgRevenuePerArticle: economics._count > 0 ? totalRevenue / economics._count : 0,
  };
}

// ─── Profit Snapshots ────────────────────────────────────────

export async function generateProfitSnapshot(
  organizationId: string,
  siteId: string | null,
  periodStart: Date,
  periodEnd: Date,
) {
  const where: Record<string, unknown> = {
    createdAt: { gte: periodStart, lte: periodEnd },
    status: 'CONFIRMED',
  };
  if (siteId) where.siteId = siteId;

  const [revenueData, costData] = await Promise.all([
    db.revenueEvent.aggregate({ where, _sum: { amount: true } }),
    db.costEvent.aggregate({
      where: { ...(siteId ? { siteId } : {}), date: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = revenueData._sum.amount ?? 0;
  const costs = costData._sum.amount ?? 0;
  const profit = revenue - costs;
  const roi = costs > 0 ? (profit / costs) * 100 : 0;

  return db.profitSnapshot.upsert({
    where: {
      organizationId_siteId_periodStart_periodEnd: {
        organizationId,
        siteId: siteId ?? '',
        periodStart,
        periodEnd,
      },
    },
    update: { revenue, costs, profit, roi, calculatedAt: new Date() },
    create: { organizationId, siteId, periodStart, periodEnd, revenue, costs, profit, roi },
  });
}

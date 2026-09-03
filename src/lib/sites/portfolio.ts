import { db } from '@/lib/db';

export interface PortfolioMetrics {
  totalSites: number;
  activeSites: number;
  totalArticles: number;
  totalSubscribers: number;
  totalRevenue: number;
  averageRpm: number;
  growthRate: number;
  topSite: { id: string; name: string; revenue: number; traffic: number } | null;
  topArticle: { id: string; title: string; revenue: number } | null;
  biggestOpportunity: { type: string; description: string } | null;
  biggestRisk: { type: string; description: string } | null;
}

export async function getPortfolioMetrics(organizationId?: string): Promise<PortfolioMetrics> {
  const siteWhere: Record<string, unknown> = organizationId ? { organizationId } : {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const previousThirtyDays = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [sites, articleCounts, subscriberCounts, thisMonthRevenue, lastMonthRevenue, trafficData, topRevenueArticles, openOpportunities, contentJobs] = await Promise.all([
    db.site.findMany({ where: { ...siteWhere, isActive: true }, select: { id: true, name: true, healthScore: true } }),
    db.article.groupBy({ by: ['siteId'], where: { ...siteWhere, status: 'published' }, _count: true }),
    db.subscriber.groupBy({ by: ['siteId'], where: { ...siteWhere, status: 'SUBSCRIBED' }, _count: true }),
    db.revenueEvent.aggregate({ _sum: { amount: true }, where: { ...siteWhere, status: 'CONFIRMED', createdAt: { gte: thirtyDaysAgo } } }),
    db.revenueEvent.aggregate({ _sum: { amount: true }, where: { ...siteWhere, status: 'CONFIRMED', createdAt: { gte: previousThirtyDays, lt: thirtyDaysAgo } } }),
    db.trafficMetric.findMany({ where: { ...siteWhere, date: { gte: thirtyDaysAgo } }, select: { siteId: true, pageViews: true } }),
    // Top revenue articles this month
    db.$queryRaw`SELECT a.id, a."rewrittenTitle" as title, COALESCE(SUM(r.amount), 0) as revenue FROM "Article" a LEFT JOIN "RevenueEvent" r ON r."articleId" = a.id AND r.status = 'CONFIRMED' AND r."createdAt" >= ${thirtyDaysAgo} WHERE a.status = 'published' GROUP BY a.id ORDER BY revenue DESC LIMIT 1`,
    db.contentOpportunity.findMany({ where: { ...siteWhere, status: 'OPEN' }, orderBy: { priority: 'desc' }, take: 1, select: { type: true, title: true, description: true } }),
    db.contentJob.findMany({ where: { ...siteWhere, status: 'FAILED' }, take: 3, select: { type: true, error: true } }),
  ]);

  const totalArticles = articleCounts.reduce((s, g) => s + g._count, 0);
  const totalSubscribers = subscriberCounts.reduce((s, g) => s + g._count, 0);
  const thisMonth = thisMonthRevenue._sum.amount || 0;
  const lastMonth = lastMonthRevenue._sum.amount || 0;
  const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  const totalTraffic = trafficData.reduce((s, t) => s + t.pageViews, 0);
  const averageRpm = totalTraffic > 0 ? (thisMonth / totalTraffic) * 1000 : 0;

  // Build per-site metrics for top site
  // Use site health scores as a proxy for ranking
  const sortedSites = [...sites].sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));
  const topSiteResult = sortedSites[0] ? { id: sortedSites[0].id, name: sortedSites[0].name, revenue: 0, traffic: 0 } : null;

  // Top article from raw query
  const topArticleResult = (topRevenueArticles as any[])?.[0]
    ? { id: (topRevenueArticles as any[])[0].id, title: (topRevenueArticles as any[])[0].title || 'Untitled', revenue: Number((topRevenueArticles as any[])[0].revenue) }
    : null;

  const biggestOpportunity = openOpportunities[0] ? { type: openOpportunities[0].type, description: openOpportunities[0].title } : null;
  const biggestRisk = contentJobs.length > 0 ? { type: 'FAILED_JOBS', description: `${contentJobs.length} content jobs failing: ${contentJobs.map(j => j.type).join(', ')}` } : null;

  return {
    totalSites: sites.length,
    activeSites: sites.length,
    totalArticles,
    totalSubscribers,
    totalRevenue: thisMonth,
    averageRpm: Math.round(averageRpm * 100) / 100,
    growthRate: Math.round(growthRate * 100) / 100,
    topSite: topSiteResult,
    topArticle: topArticleResult,
    biggestOpportunity,
    biggestRisk,
  };
}

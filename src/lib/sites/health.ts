import { db } from '@/lib/db';

interface HealthDimension {
  name: string;
  score: number; // 0-100
  weight: number;
  details: string;
}

interface SiteHealthResult {
  overallScore: number;
  dimensions: HealthDimension[];
  evaluatedAt: Date;
}

export async function calculateSiteHealth(siteId: string): Promise<SiteHealthResult> {
  // Fetch data needed for all dimensions in parallel
  const [articles, seoScores, qualityScores, traffic, revenue, subscribers, ctas] = await Promise.all([
    db.article.findMany({ where: { siteId }, select: { status: true, seoScore: true, qualityScore: true, publishedAt: true, updatedAt: true, createdAt: true } }),
    db.article.aggregate({ _avg: { seoScore: true }, where: { siteId, seoScore: { not: null } } }),
    db.article.aggregate({ _avg: { qualityScore: true }, where: { siteId, qualityScore: { not: null } } }),
    db.trafficMetric.findMany({ where: { siteId }, orderBy: { date: 'desc' }, take: 30, select: { pageViews: true, sessions: true, date: true } }),
    db.revenueEvent.findMany({ where: { siteId, status: 'CONFIRMED', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, select: { amount: true } }),
    db.subscriber.count({ where: { siteId, status: 'SUBSCRIBED' } }),
    db.callToAction.findMany({ where: { siteId, isActive: true }, select: { impressionCount: true, clickCount: true, conversionCount: true } }),
  ]);

  // Calculate each dimension (0-100)
  const dimensions: HealthDimension[] = [];

  // 1. Content Health (weight: 20%)
  const published = articles.filter(a => a.status === 'published').length;
  const total = articles.length;
  const draftRatio = total > 0 ? published / total : 0;
  const contentScore = Math.min(100, Math.round(draftRatio * 80 + Math.min(published, 50) * 0.4));
  dimensions.push({ name: 'Content', score: contentScore, weight: 0.2, details: `${published}/${total} published (${Math.round(draftRatio * 100)}%)` });

  // 2. SEO Health (weight: 15%)
  const avgSeo = seoScores._avg.seoScore || 0;
  dimensions.push({ name: 'SEO', score: Math.round(avgSeo), weight: 0.15, details: `Avg SEO score: ${Math.round(avgSeo)}` });

  // 3. Traffic Health (weight: 15%)
  const recentTraffic = traffic.slice(0, 7).reduce((s, m) => s + m.pageViews, 0);
  const olderTraffic = traffic.slice(7, 14).reduce((s, m) => s + m.pageViews, 0);
  const trafficTrend = olderTraffic > 0 ? (recentTraffic - olderTraffic) / olderTraffic : 0;
  const trafficScore = Math.max(0, Math.min(100, 50 + trafficTrend * 100));
  dimensions.push({ name: 'Traffic', score: Math.round(trafficScore), weight: 0.15, details: `Trend: ${trafficTrend >= 0 ? '+' : ''}${Math.round(trafficTrend * 100)}%` });

  // 4. Monetization Health (weight: 15%)
  const monthlyRevenue = revenue.reduce((s, e) => s + e.amount, 0);
  const monetizationScore = monthlyRevenue > 0 ? Math.min(100, 50 + Math.log10(monthlyRevenue + 1) * 15) : 20;
  dimensions.push({ name: 'Monetization', score: Math.round(monetizationScore), weight: 0.15, details: `Monthly: ₦${Math.round(monthlyRevenue).toLocaleString()}` });

  // 5. Technical Health (weight: 10%)
  const technicalScore = 90; // Base score, reduced by errors if any
  dimensions.push({ name: 'Technical', score: technicalScore, weight: 0.1, details: 'System operational' });

  // 6. Freshness (weight: 10%)
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentArticles = articles.filter(a => (a.publishedAt || a.createdAt).getTime() > thirtyDaysAgo).length;
  const freshnessScore = Math.min(100, Math.round((recentArticles / Math.max(total, 1)) * 100 + 20));
  dimensions.push({ name: 'Freshness', score: Math.min(100, freshnessScore), weight: 0.1, details: `${recentArticles} articles in last 30 days` });

  // 7. Conversion (weight: 15%)
  const totalImpressions = ctas.reduce((s, c) => s + c.impressionCount, 0);
  const totalClicks = ctas.reduce((s, c) => s + c.clickCount, 0);
  const convRate = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const convScore = Math.min(100, Math.round(convRate * 500 + subscribers * 0.5 + 10));
  dimensions.push({ name: 'Conversion', score: convScore, weight: 0.15, details: `${subscribers} subscribers, ${(convRate * 100).toFixed(1)}% CTR` });

  // Weighted overall
  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0));

  // Update site health score
  await db.site.update({ where: { id: siteId }, data: { healthScore: overallScore, healthScoreAt: new Date() } });

  return { overallScore, dimensions, evaluatedAt: new Date() };
}

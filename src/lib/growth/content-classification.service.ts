import { db } from '@/lib/db';

export type ContentTier = 'STAR' | 'HIGH_POTENTIAL' | 'STABLE' | 'DECLINING' | 'LOW_VALUE';

export interface ArticleClassification {
  articleId: string;
  title: string;
  tier: ContentTier;
  score: number;
  metrics: {
    monthlyTraffic: number;
    trafficTrend: number;
    monthlyRevenue: number;
    conversionRate: number;
    avgQualityScore: number;
    daysSincePublished: number;
  };
  recommendation: string;
}

export async function classifyArticles(siteId: string): Promise<ArticleClassification[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const articles = await db.article.findMany({
    where: { siteId, status: 'published' },
    select: {
      id: true, title: true, rewrittenTitle: true, status: true, publishedAt: true, updatedAt: true,
      wordCount: true, seoScore: true, qualityScore: true,
      trafficMetrics: {
        where: { date: { gte: sixtyDaysAgo } },
        select: { pageViews: true, date: true },
      },
      revenueEvents: {
        where: { status: 'CONFIRMED', createdAt: { gte: thirtyDaysAgo } },
        select: { amount: true },
      },
      ctaPlacements: {
        where: { isActive: true },
        select: { id: true },
      },
      contentScore: {
        select: { overallScore: true },
      },
    },
  }) as any[];

  const classifications: ArticleClassification[] = [];

  for (const article of articles) {
    const recentTraffic = article.trafficMetrics
      .filter(m => m.date >= thirtyDaysAgo)
      .reduce((s, m) => s + m.pageViews, 0);
    const olderTraffic = article.trafficMetrics
      .filter(m => m.date >= sixtyDaysAgo && m.date < thirtyDaysAgo)
      .reduce((s, m) => s + m.pageViews, 0);
    const trafficTrend = olderTraffic > 0 ? (recentTraffic - olderTraffic) / olderTraffic : 0;

    const monthlyRevenue = article.revenueEvents.reduce((s, e) => s + e.amount, 0);
    const conversionRate = article.ctaPlacements.length > 0 ? article.ctaPlacements.length * 0.02 : 0; // estimated 2% per CTA
    const quality = article.contentScore?.overallScore || 50;
    const daysSincePublished = article.publishedAt
      ? (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    const metrics = {
      monthlyTraffic: recentTraffic,
      trafficTrend,
      monthlyRevenue,
      conversionRate,
      avgQualityScore: quality,
      daysSincePublished: Math.round(daysSincePublished),
    };

    // Classification logic
    let tier: ContentTier;
    let score: number;
    let recommendation: string;

    const hasTraffic = recentTraffic > 1000;
    const hasRevenue = monthlyRevenue > 0;
    const isGrowing = trafficTrend > 0.1;
    const isDeclining = trafficTrend < -0.2;
    const isHighQuality = quality >= 70;
    const isNew = daysSincePublished < 30;

    if (hasTraffic && hasRevenue && isGrowing && isHighQuality) {
      tier = 'STAR';
      score = 90 + Math.min(10, Math.round(trafficTrend * 10));
      recommendation = 'Protect and expand. Add more monetization, promote actively, build internal links from new content.';
    } else if (hasTraffic && isGrowing && (isHighQuality || hasRevenue)) {
      tier = 'HIGH_POTENTIAL';
      score = 70 + Math.round(trafficTrend * 20);
      recommendation = 'Promote aggressively. Improve quality score, add CTAs if missing, optimize for conversion.';
    } else if (hasTraffic && !isDeclining && !isNew) {
      tier = 'STABLE';
      score = 50 + Math.round(Math.abs(trafficTrend) * 10);
      recommendation = 'Maintain current performance. Schedule periodic refresh to prevent decay.';
    } else if (isDeclining && hasTraffic) {
      tier = 'DECLINING';
      score = 30 + Math.max(0, Math.round(trafficTrend * 20 + 20));
      recommendation = 'Urgent refresh needed. Analyze traffic drop cause, update content, rebuild links.';
    } else if (!hasTraffic && !isNew) {
      tier = 'LOW_VALUE';
      score = Math.max(0, Math.round(quality * 0.3 + Math.max(0, 20 - daysSincePublished / 30 * 5)));
      recommendation = 'Consider consolidation, redirect to similar content, or archive.';
    } else {
      tier = 'HIGH_POTENTIAL';
      score = 60;
      recommendation = 'New content — monitor for 30 days before classifying.';
    }

    classifications.push({
      articleId: article.id,
      title: article.rewrittenTitle || article.title,
      tier,
      score,
      metrics,
      recommendation,
    });
  }

  return classifications.sort((a, b) => b.score - a.score);
}

export function getTierSummary(classifications: ArticleClassification[]) {
  const summary: Record<ContentTier, { count: number; totalTraffic: number; totalRevenue: number }> = {
    STAR: { count: 0, totalTraffic: 0, totalRevenue: 0 },
    HIGH_POTENTIAL: { count: 0, totalTraffic: 0, totalRevenue: 0 },
    STABLE: { count: 0, totalTraffic: 0, totalRevenue: 0 },
    DECLINING: { count: 0, totalTraffic: 0, totalRevenue: 0 },
    LOW_VALUE: { count: 0, totalTraffic: 0, totalRevenue: 0 },
  };

  for (const c of classifications) {
    summary[c.tier].count++;
    summary[c.tier].totalTraffic += c.metrics.monthlyTraffic;
    summary[c.tier].totalRevenue += c.metrics.monthlyRevenue;
  }

  return summary;
}

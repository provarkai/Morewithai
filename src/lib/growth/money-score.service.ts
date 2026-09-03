import { db } from '@/lib/db';
import type { MoneyScoreBreakdown, MoneyScoreResult } from './types';

// ─── Calculate Money Opportunity Score ────────────────────────

const COMMERCIAL_KEYWORDS = [
  'best', 'review', 'vs', 'comparison', 'buy', 'cheap', 'price', 'deal',
  'discount', 'coupon', 'offer', 'top', 'recommended', 'worth', 'cost',
  'pricing', 'plan', 'subscription', 'premium', 'free trial', 'alternatives',
];

export async function calculateMoneyOpportunityScore(articleId: string, siteId: string): Promise<MoneyScoreResult> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      id: true, title: true, slug: true, seoScore: true, qualityScore: true, primaryKeyword: true,
      wordCount: true, status: true, publishedAt: true, updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  }) as any;

  if (!article) throw new Error('Article not found');

  // ── Traffic Potential (0-25) ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentViews = article.trafficMetrics
    .filter((m) => new Date(m.date) >= thirtyDaysAgo)
    .reduce((s, m) => s + m.pageViews, 0);
  const trafficPotential = Math.min(25, Math.round((recentViews / 5000) * 25));

  // ── Search Intent (0-15) ──
  const allKeywords = [
    article.primaryKeyword ?? '',
    ...(article.secondaryKeywords?.split(',').map((k) => k.trim()) ?? []),
  ].join(' ').toLowerCase();
  const commercialCount = COMMERCIAL_KEYWORDS.filter((kw) => allKeywords.includes(kw)).length;
  const searchIntent = Math.min(15, Math.round((commercialCount / 5) * 15));

  // ── Commercial Relevance (0-20) ──
  const hasCTAs = article.ctaPlacements.length > 0;
  const hasAffiliateClicks = article.affiliateClicks.length > 0;
  const hasRevenue = article.revenueEvents.length > 0;
  let commercialRelevance = 0;
  if (hasCTAs) commercialRelevance += 8;
  if (hasAffiliateClicks) commercialRelevance += 6;
  if (hasRevenue) commercialRelevance += 6;
  commercialRelevance = Math.min(20, commercialRelevance);

  // ── Conversion Potential (0-15) ──
  const ctaImpressions = article.ctaPlacements.reduce((s, p) => s + (p.cta.impressionCount ?? 0), 0);
  const ctaConversions = article.ctaPlacements.reduce((s, p) => s + (p.cta.conversionCount ?? 0), 0);
  const ctaClicks = article.ctaPlacements.reduce((s, p) => s + p.clickCount, 0);
  const ctaRate = ctaImpressions > 0 ? ctaClicks / ctaImpressions : 0;
  const convRate = ctaImpressions > 0 ? ctaConversions / ctaImpressions : 0;
  const conversionPotential = Math.min(15, Math.round(Math.max(ctaRate, convRate) * 15 * 10));

  // ── Affiliate/Product Relevance (0-15) ──
  let affiliateRelevance = 0;
  if (article.category?.name) {
    const matchingOffers = await db.affiliateOffer.count({
      where: {
        siteId,
        status: 'ACTIVE',
        category: { contains: article.category!.name },
      },
    });
    if (matchingOffers > 0) affiliateRelevance = Math.min(15, matchingOffers * 5);
  }

  // ── Existing Performance (0-10) ──
  const totalRevenue = article.revenueEvents.reduce((s, e) => s + e.amount, 0);
  const affiliateRevenue = article.affiliateClicks.reduce((s, c) => s + c.revenue, 0);
  const existingPerformance = Math.min(10, Math.round((totalRevenue + affiliateRevenue) / 100));

  const breakdown: MoneyScoreBreakdown = {
    trafficPotential,
    searchIntent,
    commercialRelevance,
    conversionPotential,
    affiliateRelevance,
    existingPerformance,
  };

  const totalScore = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return {
    articleId,
    title: article.title,
    totalScore: Math.min(100, totalScore),
    breakdown,
  };
}

// ─── Get Top Money Opportunities ──────────────────────────────

export async function getTopMoneyOpportunities(siteId: string, limit: number = 20) {
  const articles = await db.article.findMany({
    where: { siteId, status: 'published' },
    select: { id: true, title: true },
    take: 100,
  });

  const scored: MoneyScoreResult[] = [];
  for (const article of articles) {
    try {
      const result = await calculateMoneyOpportunityScore(article.id, siteId);
      scored.push(result);
    } catch {
      // Skip articles that fail scoring
    }
  }

  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored.slice(0, limit);
}

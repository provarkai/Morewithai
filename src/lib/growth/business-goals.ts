import { db } from '@/lib/db';

/**
 * Business Goals Engine — tracks goals, calculates progress, and provides
 * AI-driven business strategy recommendations.
 *
 * Phase 3 Slice 3.20: Business Goals + Goal Engine + AI Business Strategist
 */

export type GoalType =
  | 'TRAFFIC'        // Monthly page views target
  | 'REVENUE'        // Monthly revenue target
  | 'SUBSCRIBERS'    // Subscriber count target
  | 'ARTICLES'       // Published articles count
  | 'SEO_SCORE'      // Average SEO score target
  | 'QUALITY_SCORE'  // Average quality score target
  | 'CONVERSION'     // Conversion rate target
  | 'AFFILIATE';     // Affiliate revenue target

export type GoalPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface BusinessGoal {
  id?: string;
  siteId: string;
  name: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  currentValue: number;
  progress: number; // 0-100+
  status: 'ON_TRACK' | 'BEHIND' | 'AT_RISK' | 'ACHIEVED' | 'EXCEEDED';
  startDate: Date;
  endDate: Date;
  metadata?: string;
}

export interface BusinessStrategy {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendedActions: { action: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; expectedImpact: string }[];
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  healthScore: number; // 0-100
}

/**
 * Calculate current value for a goal type.
 */
async function getCurrentValue(siteId: string, type: GoalType): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  switch (type) {
    case 'TRAFFIC': {
      const metrics = await db.trafficMetric.findMany({
        where: { siteId, date: { gte: thirtyDaysAgo } },
        select: { pageViews: true },
      });
      return metrics.reduce((s, m) => s + m.pageViews, 0);
    }
    case 'REVENUE': {
      const events = await db.revenueEvent.findMany({
        where: { siteId, status: 'CONFIRMED', createdAt: { gte: thirtyDaysAgo } },
        select: { amount: true },
      });
      return events.reduce((s, e) => s + e.amount, 0);
    }
    case 'SUBSCRIBERS': {
      return db.subscriber.count({
        where: { siteId, status: 'SUBSCRIBED' },
      });
    }
    case 'ARTICLES': {
      return db.article.count({
        where: { siteId, status: 'published' },
      });
    }
    case 'SEO_SCORE': {
      const articles = await db.article.findMany({
        where: { siteId, status: 'published', seoScore: { not: null } },
        select: { seoScore: true },
      });
      if (articles.length === 0) return 0;
      return Math.round(articles.reduce((s, a) => s + (a.seoScore || 0), 0) / articles.length);
    }
    case 'QUALITY_SCORE': {
      const articles = await db.article.findMany({
        where: { siteId, status: 'published', qualityScore: { not: null } },
        select: { qualityScore: true },
      });
      if (articles.length === 0) return 0;
      return Math.round(articles.reduce((s, a) => s + (a.qualityScore || 0), 0) / articles.length);
    }
    case 'CONVERSION': {
      const ctas = await db.callToAction.findMany({
        where: { siteId, isActive: true },
        select: { impressionCount: true, clickCount: true },
      });
      const totalImpressions = ctas.reduce((s, c) => s + c.impressionCount, 0);
      const totalClicks = ctas.reduce((s, c) => s + c.clickCount, 0);
      return totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;
    }
    case 'AFFILIATE': {
      const events = await db.revenueEvent.findMany({
        where: { siteId, sourceType: 'AFFILIATE', status: 'CONFIRMED', createdAt: { gte: thirtyDaysAgo } },
        select: { amount: true },
      });
      return events.reduce((s, e) => s + e.amount, 0);
    }
    default:
      return 0;
  }
}

/**
 * Determine goal status based on progress.
 */
function getGoalStatus(progress: number): BusinessGoal['status'] {
  if (progress >= 110) return 'EXCEEDED';
  if (progress >= 100) return 'ACHIEVED';
  if (progress >= 80) return 'ON_TRACK';
  if (progress >= 50) return 'BEHIND';
  return 'AT_RISK';
}

/**
 * Evaluate all goals for a site.
 */
export async function evaluateGoals(siteId: string): Promise<BusinessGoal[]> {
  // Since we don't have a BusinessGoal model yet, generate goals from current metrics
  const goals: BusinessGoal[] = [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const goalConfigs: { name: string; type: GoalType; target: number; unit: string }[] = [
    { name: 'Monthly Traffic', type: 'TRAFFIC', target: 10000, unit: 'pageviews' },
    { name: 'Monthly Revenue', type: 'REVENUE', target: 50000, unit: 'NGN' },
    { name: 'Total Subscribers', type: 'SUBSCRIBERS', target: 500, unit: 'subscribers' },
    { name: 'Published Articles', type: 'ARTICLES', target: 50, unit: 'articles' },
    { name: 'Average SEO Score', type: 'SEO_SCORE', target: 75, unit: 'score' },
    { name: 'Average Quality Score', type: 'QUALITY_SCORE', target: 70, unit: 'score' },
  ];

  for (const config of goalConfigs) {
    const currentValue = await getCurrentValue(siteId, config.type);
    const progress = config.target > 0 ? Math.round((currentValue / config.target) * 100) : 0;
    goals.push({
      siteId,
      name: config.name,
      type: config.type,
      period: 'MONTHLY',
      targetValue: config.target,
      currentValue,
      progress,
      status: getGoalStatus(progress),
      startDate: startOfMonth,
      endDate: endOfMonth,
    });
  }

  return goals;
}

/**
 * Generate AI-driven business strategy recommendations.
 */
export async function generateBusinessStrategy(siteId: string): Promise<BusinessStrategy> {
  const goals = await evaluateGoals(siteId);
  const achieved = goals.filter(g => g.status === 'ACHIEVED' || g.status === 'EXCEEDED');
  const behind = goals.filter(g => g.status === 'BEHIND' || g.status === 'AT_RISK');
  const onTrack = goals.filter(g => g.status === 'ON_TRACK');

  // Health score: weighted average of goal progress
  const healthScore = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + Math.min(100, g.progress), 0) / goals.length)
    : 50;

  const overallHealth: BusinessStrategy['overallHealth'] =
    healthScore >= 80 ? 'EXCELLENT' :
    healthScore >= 60 ? 'GOOD' :
    healthScore >= 40 ? 'FAIR' : 'POOR';

  const strengths = achieved.map(g => `${g.name}: ${g.progress}% of target achieved`);
  const weaknesses = behind.map(g => `${g.name}: Only ${g.progress}% of target — needs attention`);

  // Get additional context
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recentArticles = await db.article.count({
    where: { siteId, createdAt: { gte: thirtyDaysAgo } },
  });
  const publishedArticles = await db.article.count({
    where: { siteId, status: 'published' },
  });
  const pendingReview = await db.article.count({
    where: { siteId, status: { in: ['AI_REVIEW', 'EDITOR_REVIEW'] } },
  });

  const opportunities: string[] = [];
  if (pendingReview > 0) {
    opportunities.push(`${pendingReview} articles awaiting review — publish to increase traffic`);
  }
  if (recentArticles === 0) {
    opportunities.push('No new content this month — create articles to maintain freshness');
  }
  if (publishedArticles < 20) {
    opportunities.push('Build content base to 20+ articles for topical authority');
  }

  // Check monetization gaps
  const hasCtas = await db.callToAction.count({ where: { siteId, isActive: true } });
  const hasAffiliates = await db.affiliateProgram.count({ where: { siteId, status: 'ACTIVE' } });
  if (hasCtas === 0) opportunities.push('No active CTAs — add newsletter signup or product promotion');
  if (hasAffiliates === 0) opportunities.push('No affiliate programs — join programs to monetize traffic');

  const recommendedActions: BusinessStrategy['recommendedActions'] = [];

  // Generate prioritized actions
  const trafficGoal = goals.find(g => g.type === 'TRAFFIC');
  if (trafficGoal && trafficGoal.progress < 80) {
    recommendedActions.push({
      action: 'Focus on SEO optimization — target 75+ SEO score on all articles',
      priority: 'HIGH',
      expectedImpact: '20-40% traffic increase within 60 days',
    });
  }

  const revenueGoal = goals.find(g => g.type === 'REVENUE');
  if (revenueGoal && revenueGoal.progress < 50) {
    recommendedActions.push({
      action: 'Add monetization: CTAs, affiliate links, and product placements',
      priority: 'HIGH',
      expectedImpact: 'Revenue increase proportional to traffic',
    });
  }

  if (pendingReview > 5) {
    recommendedActions.push({
      action: `Review and publish ${pendingReview} pending articles`,
      priority: 'MEDIUM',
      expectedImpact: 'Immediate content freshness boost',
    });
  }

  recommendedActions.push({
    action: 'Run content decay analysis and refresh stale articles',
    priority: 'LOW',
    expectedImpact: 'Maintain 10-20% traffic from existing content',
  });

  const summary = `Business health: ${overallHealth} (${healthScore}/100). ` +
    `${achieved.length}/${goals.length} goals achieved. ` +
    `${behind.length} goals need attention. ` +
    (opportunities.length > 0 ? `Top opportunity: ${opportunities[0]}` : 'All systems performing well.');

  return {
    summary,
    strengths,
    weaknesses,
    opportunities,
    recommendedActions,
    overallHealth,
    healthScore,
  };
}

/**
 * Get revenue forecast based on current trends.
 */
export async function forecastRevenue(
  siteId: string,
  monthsAhead = 3,
): Promise<{ month: string; forecasted: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }[]> {
  const forecasts: { month: string; forecasted: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }[] = [];

  // Get last 6 months of revenue data
  const monthlyRevenue: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date();
    start.setMonth(start.getMonth() - i, 1);
    const end = new Date();
    end.setMonth(end.getMonth() - i + 1, 0);

    const events = await db.revenueEvent.findMany({
      where: {
        siteId,
        status: 'CONFIRMED',
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true },
    });
    monthlyRevenue.push(events.reduce((s, e) => s + e.amount, 0));
  }

  // Simple trend extrapolation
  const recentAvg = monthlyRevenue.slice(-3).reduce((s, v) => s + v, 0) / 3;
  const olderAvg = monthlyRevenue.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
  const trendRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

  // Generate forecast
  for (let i = 1; i <= monthsAhead; i++) {
    const forecastDate = new Date();
    forecastDate.setMonth(forecastDate.getMonth() + i);
    const month = forecastDate.toISOString().slice(0, 7);

    const forecasted = Math.round(recentAvg * Math.pow(1 + trendRate, i));
    const confidence = i === 1 ? 'HIGH' : i === 2 ? 'MEDIUM' : 'LOW';

    forecasts.push({ month, forecasted, confidence });
  }

  return forecasts;
}

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export interface EngagementScore {
  visitorId: string;
  articleId: string;
  scrollDepth: number;     // 0-100 percentage
  timeOnPage: number;      // seconds
  isReturning: boolean;
  visitCount: number;
  score: number;           // 0-100
  segments: EngagementSegment[];
}

export type EngagementSegment =
  | 'BOUNCER'           // left within 10s, <25% scroll
  | 'SKIMMER'           // scrolled 25-50%, average time
  | 'READER'            // scrolled 50-75%, good time
  | 'DEEP_READER'       // scrolled 75%+, excellent time
  | 'POWER_USER'        // returning visitor, deep scroll, long time
  | 'CONTENT_JUNKIE';   // returning, multiple articles

export interface ArticleEngagement {
  articleId: string;
  totalVisitors: number;
  uniqueVisitors: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  avgEngagementScore: number;
  segmentDistribution: Record<EngagementSegment, number>;
  topReaders: EngagementScore[];
  engagementTrend: { date: string; score: number; visitors: number }[];
}

// ─── Engagement Tracking ────────────────────────────────────

/**
 * Records a page engagement event (scroll depth, time on page).
 * Called from the frontend beacon/analytics endpoint.
 */
export async function recordEngagement(params: {
  articleId: string;
  siteId: string;
  visitorId: string;
  scrollDepth: number;
  timeOnPage: number;
  sessionId?: string;
}): Promise<{ score: number; segment: EngagementSegment }> {
  const { articleId, siteId, visitorId, scrollDepth, timeOnPage } = params;

  // Check if this visitor has read other articles
  const previousReads = await db.conversionEvent.count({
    where: {
      siteId,
      sourceId: visitorId,
      articleId: { not: articleId },
    },
  });

  const visitCount = previousReads + 1;
  const isReturning = previousReads > 0;

  // Calculate engagement score
  const score = calculateEngagementScore({
    scrollDepth,
    timeOnPage,
    isReturning,
    visitCount,
  });

  const segment = classifySegment(score, scrollDepth, timeOnPage, isReturning, visitCount);

  // Store the engagement data as a conversion event
  await db.conversionEvent.create({
    data: {
      siteId,
      articleId,
      sourceType: 'ENGAGEMENT',
      sourceId: visitorId,
      eventType: 'ARTICLE_VIEW',
      value: score,
      metadata: JSON.stringify({
        scrollDepth,
        timeOnPage,
        isReturning,
        visitCount,
        segment,
      }),
    },
  });

  return { score, segment };
}

/**
 * Calculates engagement score based on behavioral signals.
 * Returns 0-100 score.
 */
function calculateEngagementScore(params: {
  scrollDepth: number;
  timeOnPage: number;
  isReturning: boolean;
  visitCount: number;
}): number {
  const { scrollDepth, timeOnPage, isReturning, visitCount } = params;

  // Scroll depth: 0-40 points
  const scrollScore = Math.min(40, (scrollDepth / 100) * 40);

  // Time on page: 0-35 points (diminishing returns after 3 min)
  const timeMinutes = timeOnPage / 60;
  const timeScore = Math.min(35, Math.sqrt(timeMinutes) * 12);

  // Returning visitor bonus: 0-15 points
  const returnScore = isReturning ? Math.min(15, 5 + visitCount * 2) : 0;

  // Multi-article bonus: 0-10 points
  const multiArticleScore = visitCount > 1 ? Math.min(10, (visitCount - 1) * 3) : 0;

  return Math.round(Math.min(100, scrollScore + timeScore + returnScore + multiArticleScore));
}

function classifySegment(
  score: number,
  scrollDepth: number,
  timeOnPage: number,
  isReturning: boolean,
  visitCount: number,
): EngagementSegment {
  if (scrollDepth < 25 && timeOnPage < 10) return 'BOUNCER';
  if (isReturning && visitCount > 3 && scrollDepth > 50) return 'CONTENT_JUNKIE';
  if (isReturning && scrollDepth > 75 && timeOnPage > 120) return 'POWER_USER';
  if (scrollDepth > 75 && timeOnPage > 180) return 'DEEP_READER';
  if (scrollDepth > 50 && timeOnPage > 60) return 'READER';
  return 'SKIMMER';
}

// ─── Article Engagement Analysis ────────────────────────────

/**
 * Get comprehensive engagement analytics for an article.
 */
export async function getArticleEngagement(
  articleId: string,
  siteId: string,
  days: number = 30,
): Promise<ArticleEngagement> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all engagement events for this article
  const events = await db.conversionEvent.findMany({
    where: {
      articleId,
      siteId,
      eventType: 'ARTICLE_VIEW',
      createdAt: { gte: since },
    },
    select: {
      sourceId: true,
      value: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Parse metadata and compute stats
  const parsed = events.map((e) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(e.metadata || '{}');
    } catch { /* ignore */ }
    return {
      visitorId: e.sourceId || 'unknown',
      score: e.value || 0,
      scrollDepth: (meta.scrollDepth as number) || 0,
      timeOnPage: (meta.timeOnPage as number) || 0,
      isReturning: (meta.isReturning as boolean) || false,
      visitCount: (meta.visitCount as number) || 1,
      segment: (meta.segment as EngagementSegment) || 'SKIMMER',
      date: e.createdAt,
    };
  });

  const uniqueVisitors = new Set(parsed.map((e) => e.visitorId)).size;
  const avgScrollDepth = parsed.length > 0
    ? Math.round(parsed.reduce((s, e) => s + e.scrollDepth, 0) / parsed.length)
    : 0;
  const avgTimeOnPage = parsed.length > 0
    ? Math.round(parsed.reduce((s, e) => s + e.timeOnPage, 0) / parsed.length)
    : 0;
  const avgEngagementScore = parsed.length > 0
    ? Math.round(parsed.reduce((s, e) => s + e.score, 0) / parsed.length)
    : 0;

  // Segment distribution
  const segmentDistribution: Record<EngagementSegment, number> = {
    BOUNCER: 0,
    SKIMMER: 0,
    READER: 0,
    DEEP_READER: 0,
    POWER_USER: 0,
    CONTENT_JUNKIE: 0,
  };
  for (const e of parsed) {
    segmentDistribution[e.segment]++;
  }

  // Top readers (highest scores)
  const visitorScores = new Map<string, EngagementScore>();
  for (const e of parsed) {
    const existing = visitorScores.get(e.visitorId);
    if (!existing || e.score > existing.score) {
      visitorScores.set(e.visitorId, {
        visitorId: e.visitorId,
        articleId,
        scrollDepth: e.scrollDepth,
        timeOnPage: e.timeOnPage,
        isReturning: e.isReturning,
        visitCount: e.visitCount,
        score: e.score,
        segments: [e.segment],
      });
    }
  }

  const topReaders = Array.from(visitorScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Engagement trend (grouped by day)
  const dailyMap = new Map<string, { scores: number[]; visitors: Set<string> }>();
  for (const e of parsed) {
    const day = e.date.toISOString().split('T')[0];
    if (!dailyMap.has(day)) {
      dailyMap.set(day, { scores: [], visitors: new Set() });
    }
    const d = dailyMap.get(day)!;
    d.scores.push(e.score);
    d.visitors.add(e.visitorId);
  }

  const engagementTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      score: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      visitors: data.visitors.size,
    }));

  return {
    articleId,
    totalVisitors: events.length,
    uniqueVisitors,
    avgScrollDepth,
    avgTimeOnPage,
    avgEngagementScore,
    segmentDistribution,
    topReaders,
    engagementTrend,
  };
}

/**
 * Get engagement scores across all articles for the site.
 */
export async function getSiteEngagementSummary(
  siteId: string,
  days: number = 30,
): Promise<{
  totalArticles: number;
  avgEngagementScore: number;
  bestPerforming: { articleId: string; title: string; score: number }[];
  segmentOverview: Record<EngagementSegment, number>;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const articles = await db.article.findMany({
    where: { siteId, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      rewrittenTitle: true,
    },
    take: 50,
  });

  const results: { articleId: string; title: string; score: number }[] = [];
  const segmentOverview: Record<EngagementSegment, number> = {
    BOUNCER: 0,
    SKIMMER: 0,
    READER: 0,
    DEEP_READER: 0,
    POWER_USER: 0,
    CONTENT_JUNKIE: 0,
  };

  for (const article of articles) {
    const events = await db.conversionEvent.findMany({
      where: {
        articleId: article.id,
        siteId,
        eventType: 'ARTICLE_VIEW',
        createdAt: { gte: since },
      },
      select: { value: true },
    });

    if (events.length > 0) {
      const avg = events.reduce((s, e) => s + (e.value || 0), 0) / events.length;
      results.push({
        articleId: article.id,
        title: article.rewrittenTitle || article.title,
        score: Math.round(avg),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return {
    totalArticles: articles.length,
    avgEngagementScore: results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0,
    bestPerforming: results.slice(0, 10),
    segmentOverview,
  };
}

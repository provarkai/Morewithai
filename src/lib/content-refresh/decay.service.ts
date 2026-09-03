import { db } from '@/lib/db';

export interface DecayScore {
  articleId: string;
  title: string;
  slug: string | null;
  status: string;
  publishedAt: Date | null;
  updatedAt: Date;
  decayScore: number; // 0-100, higher = more decayed
  decayFactors: {
    age: number;       // 0-30 points
    seo: number;       // 0-25 points
    quality: number;   // 0-20 points
    engagement: number; // 0-15 points
    freshness: number;  // 0-10 points
  };
  freshnessStatus: 'FRESH' | 'AGING' | 'STALE' | 'OUTDATED';
  recommendedAction: 'NONE' | 'REVIEW' | 'UPDATE' | 'MERGE' | 'ARCHIVE';
}

/**
 * Calculate a decay score for an article based on multiple signals.
 * Higher score = more decayed = more urgent to refresh.
 */
function calculateDecayScore(article: {
  publishedAt: Date | null;
  updatedAt: Date;
  seoScore: number | null;
  qualityScore: number | null;
  wordCount: number | null;
  adsenseEnabled: boolean;
  _count: { linkRecommendations: number; versions: number };
}): { decayScore: number; decayFactors: DecayScore['decayFactors']; freshnessStatus: DecayScore['freshnessStatus'] } {
  const now = Date.now();
  const msPerDay = 86400000;

  const daysSincePublish = article.publishedAt
    ? Math.floor((now - new Date(article.publishedAt).getTime()) / msPerDay)
    : 999;
  const daysSinceUpdate = Math.floor((now - new Date(article.updatedAt).getTime()) / msPerDay);

  // Age factor (0-30): older = more decayed
  let age = 0;
  if (daysSinceUpdate > 180) age = 30;
  else if (daysSinceUpdate > 120) age = 25;
  else if (daysSinceUpdate > 90) age = 20;
  else if (daysSinceUpdate > 60) age = 15;
  else if (daysSinceUpdate > 30) age = 10;
  else if (daysSinceUpdate > 14) age = 5;

  // SEO factor (0-25): low SEO score = more decayed
  let seo = 0;
  if (article.seoScore === null) seo = 15;
  else if (article.seoScore < 30) seo = 25;
  else if (article.seoScore < 50) seo = 20;
  else if (article.seoScore < 70) seo = 10;
  else if (article.seoScore < 85) seo = 5;

  // Quality factor (0-20): low quality = more decayed
  let quality = 0;
  if (article.qualityScore === null) quality = 10;
  else if (article.qualityScore < 30) quality = 20;
  else if (article.qualityScore < 50) quality = 15;
  else if (article.qualityScore < 70) quality = 10;
  else if (article.qualityScore < 85) quality = 5;

  // Engagement factor (0-15): no internal links + thin content = more decayed
  let engagement = 0;
  if (article._count.linkRecommendations === 0) engagement += 8;
  if (article.wordCount !== null && article.wordCount < 500) engagement += 7;
  else if (article.wordCount !== null && article.wordCount < 800) engagement += 3;
  if (article._count.versions <= 1) engagement += 2;

  // Freshness factor (0-10): never updated after publish = more decayed
  let freshness = 0;
  if (daysSincePublish > 0 && article.publishedAt && article.updatedAt <= article.publishedAt) {
    freshness = 10;
  } else if (daysSinceUpdate > 60) {
    freshness = 5;
  }

  const decayScore = Math.min(100, age + seo + quality + engagement + freshness);

  let freshnessStatus: DecayScore['freshnessStatus'] = 'FRESH';
  if (daysSinceUpdate > 120) freshnessStatus = 'OUTDATED';
  else if (daysSinceUpdate > 60) freshnessStatus = 'STALE';
  else if (daysSinceUpdate > 30 || decayScore > 40) freshnessStatus = 'AGING';

  return { decayScore, decayFactors: { age, seo, quality, engagement, freshness }, freshnessStatus };
}

/**
 * Get recommended action based on decay score and article state.
 */
function getRecommendedAction(
  decayScore: number,
  freshnessStatus: string,
  daysSinceUpdate: number,
  seoScore: number | null,
): DecayScore['recommendedAction'] {
  if (decayScore >= 75 || freshnessStatus === 'OUTDATED') return 'ARCHIVE';
  if (decayScore >= 55 || (freshnessStatus === 'STALE' && (seoScore ?? 0) < 40)) return 'MERGE';
  if (decayScore >= 35 || freshnessStatus === 'STALE') return 'UPDATE';
  if (decayScore >= 15 || freshnessStatus === 'AGING') return 'REVIEW';
  return 'NONE';
}

/**
 * Get decay scores for all published articles on a site, ranked by decay severity.
 */
export async function getContentDecayScores(siteId: string, limit = 50): Promise<DecayScore[]> {
  const articles = await db.article.findMany({
    where: {
      siteId,
      status: { in: ['PUBLISHED', 'published', 'UPDATED', 'UPDATING'] },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      seoScore: true,
      qualityScore: true,
      wordCount: true,
      adsenseEnabled: true,
      _count: {
        select: {
          linkRecommendations: true,
          versions: true,
        },
      },
    },
  });

  const scored = articles.map((article) => {
    const { decayScore, decayFactors, freshnessStatus } = calculateDecayScore(article);
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(article.updatedAt).getTime()) / 86400000
    );
    const recommendedAction = getRecommendedAction(
      decayScore,
      freshnessStatus,
      daysSinceUpdate,
      article.seoScore
    );

    return {
      articleId: article.id,
      title: article.title,
      slug: article.slug,
      status: article.status,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      decayScore,
      decayFactors,
      freshnessStatus,
      recommendedAction,
    };
  });

  return scored
    .sort((a, b) => b.decayScore - a.decayScore)
    .slice(0, limit);
}

/**
 * Get a summary of content health across the site.
 */
export async function getContentHealthSummary(siteId: string) {
  const scores = await getContentDecayScores(siteId, 500);

  const summary = {
    total: scores.length,
    FRESH: 0,
    AGING: 0,
    STALE: 0,
    OUTDATED: 0,
    avgDecayScore: 0,
    actionBreakdown: { NONE: 0, REVIEW: 0, UPDATE: 0, MERGE: 0, ARCHIVE: 0 } as Record<string, number>,
    topDecayed: scores.slice(0, 10),
  };

  for (const s of scores) {
    if (s.freshnessStatus in summary) (summary as any)[s.freshnessStatus]++;
    summary.actionBreakdown[s.recommendedAction]++;
  }

  summary.avgDecayScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.decayScore, 0) / scores.length)
    : 0;

  return summary;
}

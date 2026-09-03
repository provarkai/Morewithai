import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { AGE_THRESHOLDS_DAYS, SCORE_THRESHOLDS, REFRESH_REASONS, type RefreshCandidate } from './types';

/**
 * Detect articles that need content refresh based on age, scores, and nextReviewAt.
 */
export async function detectRefreshCandidates(siteId: string, limit = 50): Promise<RefreshCandidate[]> {
  const now = new Date();
  const candidates: RefreshCandidate[] = [];

  // 1. Articles with nextReviewAt in the past
  const scheduledForReview = await db.article.findMany({
    where: {
      siteId,
      status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
      nextReviewAt: { lte: now },
    },
    select: {
      id: true, title: true, status: true, publishedAt: true, updatedAt: true,
      seoScore: true, qualityScore: true, nextReviewAt: true, wordCount: true,
    },
    orderBy: { nextReviewAt: 'asc' },
    take: limit,
  });

  for (const a of scheduledForReview) {
    candidates.push({
      ...a,
      freshnessStatus: 'STALE',
      suggestedReason: 'SCHEDULED',
      daysSincePublish: a.publishedAt ? Math.floor((now.getTime() - new Date(a.publishedAt).getTime()) / 86400000) : null,
      daysSinceUpdate: Math.floor((now.getTime() - new Date(a.updatedAt).getTime()) / 86400000),
    });
  }

  // 2. Articles flagged by age or low scores (excluding already-scheduled ones)
  const candidateIds = new Set(candidates.map((c) => c.id));
  const publishedArticles = await db.article.findMany({
    where: {
      siteId,
      status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
      id: { notIn: [...candidateIds] },
    },
    select: {
      id: true, title: true, status: true, publishedAt: true, updatedAt: true,
      seoScore: true, qualityScore: true, nextReviewAt: true, wordCount: true,
    },
    orderBy: { updatedAt: 'asc' },
  });

  for (const a of publishedArticles) {
    const daysSinceUpdate = Math.floor((now.getTime() - new Date(a.updatedAt).getTime()) / 86400000);
    const daysSincePublish = a.publishedAt ? Math.floor((now.getTime() - new Date(a.publishedAt).getTime()) / 86400000) : null;

    let freshnessStatus = 'FRESH';
    let suggestedReason: string | null = null;

    // Check age thresholds (from longest to shortest — pick worst)
    for (const threshold of [...AGE_THRESHOLDS_DAYS].reverse()) {
      if (daysSinceUpdate >= threshold.days) {
        freshnessStatus = threshold.freshness;
        if (!suggestedReason) suggestedReason = threshold.reason;
      }
    }

    // Check score thresholds
    if ((a.seoScore !== null && a.seoScore < SCORE_THRESHOLDS.SEO) && freshnessStatus === 'FRESH') {
      freshnessStatus = 'AGING';
      suggestedReason = 'LOW_SEO';
    }
    if ((a.qualityScore !== null && a.qualityScore < SCORE_THRESHOLDS.QUALITY) && freshnessStatus === 'FRESH') {
      freshnessStatus = 'AGING';
      suggestedReason = 'LOW_QUALITY';
    }

    // Only include articles that need attention
    if (freshnessStatus !== 'FRESH') {
      candidates.push({
        ...a,
        freshnessStatus,
        suggestedReason: suggestedReason || 'AGE_90',
        daysSincePublish,
        daysSinceUpdate,
      });
    }

    if (candidates.length >= limit) break;
  }

  return candidates.slice(0, limit);
}

/**
 * Get count summary of articles needing refresh by freshness status.
 */
export async function getRefreshSummary(siteId: string) {
  const candidates = await detectRefreshCandidates(siteId, 200);
  const summary = { FRESH: 0, AGING: 0, STALE: 0, OUTDATED: 0, total: candidates.length };
  for (const c of candidates) {
    if (c.freshnessStatus in summary) {
      (summary as any)[c.freshnessStatus]++;
    }
  }
  return summary;
}

/**
 * Get articles explicitly due for refresh (nextReviewAt past or due today).
 */
export async function getDueRefreshArticles(siteId: string) {
  const now = new Date();
  return db.article.findMany({
    where: {
      siteId,
      status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
      nextReviewAt: { lte: now },
    },
    select: { id: true, title: true, nextReviewAt: true },
    orderBy: { nextReviewAt: 'asc' },
    take: 20,
  });
}

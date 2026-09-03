import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { detectRefreshCandidates } from '@/lib/content-refresh/detector';
import { getJobStats } from '@/lib/ai/job.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const site = await db.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const [
      totalFeeds,
      activeFeeds,
      totalArticles,
      draftArticles,
      scheduledArticles,
      publishedArticles,
      needsReview,
      avgSeoResult,
      avgQualityResult,
      recentArticles,
      recentLogs,
      refreshCandidates,
    ] = await Promise.all([
      db.rssFeed.count({ where: { siteId } }),
      db.rssFeed.count({ where: { isActive: true, siteId } }),
      db.article.count({ where: { siteId } }),
      db.article.count({ where: { siteId, status: { in: ['DRAFT', 'AI_REVIEW', 'EDITOR_REVIEW'] } } }),
      db.article.count({ where: { siteId, status: { in: ['scheduled', 'SCHEDULED'] } } }),
      db.article.count({ where: { siteId, status: { in: ['PUBLISHED', 'published', 'UPDATED'] } } }),
      db.article.count({ where: { siteId, status: { in: ['APPROVED', 'UPDATED'] } } }),
      db.article.aggregate({
        where: { siteId, status: { in: ['PUBLISHED', 'published', 'UPDATED'] }, seoScore: { not: null } },
        _avg: { seoScore: true },
      }),
      db.article.aggregate({
        where: { siteId, status: { in: ['PUBLISHED', 'published', 'UPDATED'] }, qualityScore: { not: null } },
        _avg: { qualityScore: true },
      }),
      db.article.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { feed: { select: { name: true } } },
      }),
      db.automationLog.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      detectRefreshCandidates(siteId, 10).catch(() => []),
    ]);

    // AI Job stats (non-blocking)
    let aiJobStats: any = null;
    try {
      aiJobStats = await getJobStats(siteId);
    } catch {}

    // Build status breakdown using new statuses
    const statusGroups = await db.article.groupBy({
      by: ['status'],
      where: { siteId },
      _count: { status: true },
    });

    const statusLabels: Record<string, string> = {
      IDEA: 'Idea', FETCHED: 'Fetched', RESEARCHING: 'Researching', OUTLINE: 'Outline',
      DRAFT: 'Draft', AI_REVIEW: 'AI Review', EDITOR_REVIEW: 'Review', APPROVED: 'Approved',
      SCHEDULED: 'Scheduled', PUBLISHED: 'Published', UPDATING: 'Updating', UPDATED: 'Updated',
      ARCHIVED: 'Archived', FAILED: 'Failed',
      fetched: 'Fetched', rewriting: 'Rewriting', rewritten: 'Rewritten',
      approved: 'Approved', rejected: 'Rejected', publishing: 'Publishing', published: 'Published',
    };

    const statusBreakdown = statusGroups
      .map((g) => ({
        status: statusLabels[g.status] || g.status,
        count: g._count.status,
      }))
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      site: { id: site.id, name: site.name, slug: site.slug },
      totalFeeds,
      activeFeeds,
      totalArticles,
      draftArticles,
      scheduledArticles,
      publishedArticles,
      needsReview,
      needsRefresh: refreshCandidates.length,
      avgSeoScore: avgSeoResult._avg.seoScore ? Math.round(avgSeoResult._avg.seoScore) : null,
      avgQualityScore: avgQualityResult._avg.qualityScore ? Math.round(avgQualityResult._avg.qualityScore) : null,
      statusBreakdown,
      recentArticles,
      recentLogs,
      refreshCandidates: refreshCandidates.map((c) => ({
        id: c.id,
        title: c.title,
        freshnessStatus: c.freshnessStatus,
        daysSinceUpdate: c.daysSinceUpdate,
        suggestedReason: c.suggestedReason,
      })),
      aiJobStats,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
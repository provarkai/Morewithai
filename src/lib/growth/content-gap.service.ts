import { db } from '@/lib/db';

export interface ContentGap {
  topic: string;
  type: 'MISSING_TOPIC' | 'WEAK_SUBTOPIC' | 'UNCOVERED_INTENT' | 'MISSING_COMPARISON' | 'MISSING_COMMERCIAL' | 'MISSING_SUPPORTING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedValue: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedArticles: string[];
  suggestedKeywords: string[];
  reason: string;
}

export async function analyzeContentGaps(siteId: string): Promise<ContentGap[]> {
  // Get all published articles with their keywords and categories
  const articles = await db.article.findMany({
    where: { siteId, status: 'published' },
    select: {
      id: true,
      primaryKeyword: true,
      secondaryKeywords: true,
      categoryId: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const gaps: ContentGap[] = [];

  // 1. Find categories with few articles
  const categories = await db.category.findMany({
    where: { siteId },
    include: { _count: { select: { articles: { where: { status: 'published' } } } } },
  });

  for (const cat of categories) {
    if (cat._count.articles < 3) {
      gaps.push({
        topic: cat.name,
        type: 'WEAK_SUBTOPIC',
        priority: cat._count.articles === 0 ? 'HIGH' : 'MEDIUM',
        expectedValue: 'MEDIUM',
        relatedArticles: [],
        suggestedKeywords: [cat.name, `${cat.name} guide`, `${cat.name} tools`, `${cat.name} best practices`],
        reason: `Category "${cat.name}" has only ${cat._count.articles} published article(s). Aim for 5-10 for topical authority.`,
      });
    }
  }

  // 2. Find tags with very few articles
  const tags = await db.tag.findMany({
    where: { siteId },
    include: { _count: { select: { articles: true } } },
  });

  const lowCountTags = tags.filter(t => t._count.articles >= 1 && t._count.articles <= 2);
  for (const tag of lowCountTags.slice(0, 10)) {
    gaps.push({
      topic: tag.name,
      type: 'MISSING_SUPPORTING',
      priority: 'MEDIUM',
      expectedValue: 'MEDIUM',
      relatedArticles: [],
      suggestedKeywords: [`${tag.name} explained`, `${tag.name} tutorial`, `${tag.name} examples`],
      reason: `Tag "${tag.name}" has only ${tag._count.articles} article(s). Create supporting content.`,
    });
  }

  // 3. Articles with high traffic but no monetization
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const highTrafficArticles = await db.article.findMany({
    where: { siteId, status: 'published' },
    include: {
      trafficMetrics: { where: { date: { gte: thirtyDaysAgo } }, select: { pageViews: true } },
      ctaPlacements: { where: { isActive: true }, select: { id: true } },
      affiliateClicks: { select: { id: true } },
    },
  });

  for (const article of highTrafficArticles) {
    const traffic = article.trafficMetrics.reduce((s, m) => s + m.pageViews, 0);
    const hasMonetization = article.ctaPlacements.length > 0 || article.affiliateClicks.length > 0;
    if (traffic > 500 && !hasMonetization) {
      gaps.push({
        topic: article.rewrittenTitle || article.title,
        type: 'MISSING_COMMERCIAL',
        priority: traffic > 2000 ? 'HIGH' : 'MEDIUM',
        expectedValue: 'HIGH',
        relatedArticles: [article.id],
        suggestedKeywords: [article.primaryKeyword || ''].filter(Boolean),
        reason: `Article has ${traffic} monthly pageviews but no monetization. Add affiliate links or product CTAs.`,
      });
    }
  }

  // Sort by priority
  gaps.sort((a, b) => {
    const p = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (p[b.priority] || 0) - (p[a.priority] || 0);
  });

  return gaps.slice(0, 20); // Top 20 gaps
}

export async function saveGapsAsOpportunities(siteId: string, gaps: ContentGap[]) {
  let created = 0;
  for (const gap of gaps) {
    const existing = await db.contentOpportunity.findFirst({
      where: { siteId, type: gap.type, title: gap.topic },
    });
    if (!existing) {
      await db.contentOpportunity.create({
        data: {
          siteId,
          type: gap.type,
          title: gap.topic,
          description: gap.reason,
          priority: gap.priority,
          metadata: JSON.stringify({
            suggestedKeywords: gap.suggestedKeywords,
            expectedValue: gap.expectedValue,
          }),
        },
      });
      created++;
    }
  }
  return created;
}

import { db } from '@/lib/db';
import type { AffiliateRecommendation } from './types';

// ─── Get Recommended Offers ───────────────────────────────────

export async function getRecommendedOffers(
  articleId: string,
  siteId: string,
  limit: number = 3
): Promise<AffiliateRecommendation[]> {
  // 1. Get article's category and tags
  const article = await db.article.findUnique({
    where: { id: articleId, siteId },
    select: {
      categoryId: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (!article) return [];

  const articleCategory = article.categoryId;
  const articleTagNames = article.tags.map((t) => t.tag.name.toLowerCase());

  // Get the article's category name
  let articleCategoryName: string | null = null;
  if (articleCategory) {
    const category = await db.category.findUnique({
      where: { id: articleCategory },
      select: { name: true },
    });
    articleCategoryName = category?.name ?? null;
  }

  // 2. Find all active offers for the site
  const offers = await db.affiliateOffer.findMany({
    where: { siteId, status: 'ACTIVE' },
    include: { program: true },
  });

  if (offers.length === 0) return [];

  const maxCommission = Math.max(...offers.map((o) => o.commission ?? 0), 1);

  // 3. Score each offer
  const scored = offers.map((offer) => {
    const breakdown = {
      relevance: 0,
      commission: 0,
      conversionHistory: 0,
      editorPriority: 0,
    };

    const offerName = offer.name.toLowerCase();
    const offerDesc = (offer.description ?? '').toLowerCase();
    const offerCategory = (offer.category ?? '').toLowerCase();
    const offerText = `${offerName} ${offerDesc} ${offerCategory}`;

    // Category match = 50 points
    if (articleCategoryName && offerCategory) {
      if (offerCategory.includes(articleCategoryName.toLowerCase())) {
        breakdown.relevance += 50;
      }
    }

    // Tag match = 20 points each
    let tagMatchCount = 0;
    for (const tagName of articleTagNames) {
      if (offerText.includes(tagName)) {
        tagMatchCount++;
      }
    }
    breakdown.relevance += tagMatchCount * 20;

    // Keyword in name = 10 points
    for (const tagName of articleTagNames) {
      if (offerName.includes(tagName)) {
        breakdown.relevance += 10;
        break; // Only once for name match
      }
    }

    // Commission scoring (normalized 0-20)
    breakdown.commission = offer.commission
      ? Math.round((offer.commission / maxCommission) * 20)
      : 0;

    // Conversion history (conversionCount * 5, capped at 20)
    breakdown.conversionHistory = Math.min((offer.conversionCount ?? 0) * 5, 20);

    // Editor priority (priority * 2, capped at 10)
    breakdown.editorPriority = Math.min((offer.priority ?? 0) * 2, 10);

    const score =
      breakdown.relevance +
      breakdown.commission +
      breakdown.conversionHistory +
      breakdown.editorPriority;

    return {
      offer: offer as unknown as Record<string, unknown>,
      score,
      scoreBreakdown: breakdown,
    };
  });

  // 4. Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

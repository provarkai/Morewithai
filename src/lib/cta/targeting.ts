import { db } from '@/lib/db';
import type { CtaRenderContext, CtaWithStats } from './types';

// ─── Get Targeted CTAs ───────────────────────────────────────
// Returns up to 3 CTAs that match the given render context,
// sorted by clickCount descending (best performers first).

export async function getTargetedCtas(siteId: string, context: CtaRenderContext): Promise<CtaWithStats[]> {
  const where: Record<string, unknown> = {
    siteId,
    isActive: true,
  };

  // Match by targetPlacement — if null, the CTA applies to all placements
  // so we only filter if the CTA has a specific targetPlacement set
  if (context.placement) {
    where.OR = [
      { targetPlacement: context.placement },
      // CTAs with no specific placement target also match (they are global)
    ];
  }

  const allCtas = await db.callToAction.findMany({
    where,
    include: {
      _count: { select: { placements: true, experiments: true } },
    },
  });

  // Apply additional targeting filters in-memory
  const matched = allCtas.filter((cta) => {
    // If CTA targets a specific article, only match that article
    if (cta.targetArticleId && cta.targetArticleId !== context.articleId) {
      return false;
    }

    // If CTA targets a specific category, only match that category
    if (cta.targetCategoryId && cta.targetCategoryId !== context.categoryId) {
      return false;
    }

    // If CTA targets a specific tag, check if the article has that tag
    if (cta.targetTagId && context.tags && !context.tags.includes(cta.targetTagId)) {
      return false;
    }

    return true;
  });

  // Sort by clickCount descending (best performers first)
  matched.sort((a, b) => b.clickCount - a.clickCount);

  // Return top 3
  const top3 = matched.slice(0, 3);

  return top3.map((c) => ({
    ...c,
    ctr: c.impressionCount > 0 ? c.clickCount / c.impressionCount : 0,
    conversionRate: c.impressionCount > 0 ? c.conversionCount / c.impressionCount : 0,
  })) as CtaWithStats[];
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { recommendInternalLinks } from '@/lib/linking/recommender';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const { articleId, siteId } = await req.json();
    if (!articleId || !siteId) return NextResponse.json({ error: 'articleId and siteId required' }, { status: 400 });

    const recommendations = await recommendInternalLinks(articleId, siteId);

    // Store recommendations in DB
    for (const rec of recommendations) {
      await db.internalLinkRecommendation.upsert({
        where: { id: `${articleId}-${rec.targetArticleId}` },
        create: {
          articleId,
          targetArticleId: rec.targetArticleId,
          relevanceScore: rec.relevanceScore,
          suggestedAnchor: rec.suggestedAnchor,
          reason: rec.reason,
        },
        update: {
          relevanceScore: rec.relevanceScore,
          suggestedAnchor: rec.suggestedAnchor,
          reason: rec.reason,
        },
      }).catch(() => {});
    }

    return NextResponse.json(recommendations);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Link analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

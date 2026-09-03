import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getRecommendedOffers } from '@/lib/affiliate/recommendation.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('affiliate.read');
    const body = await req.json();
    const { siteId, articleId, limit } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });

    const recommendations = await getRecommendedOffers(articleId, siteId, limit);
    return NextResponse.json(recommendations);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

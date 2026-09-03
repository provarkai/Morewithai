import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getPlacementsForArticle, assignPlacement } from '@/lib/cta/placement.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('cta.read');
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');
    if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });

    const placements = await getPlacementsForArticle(articleId);
    return NextResponse.json(placements);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('cta.write');
    const body = await req.json();
    const { ctaId, articleId, placement, position, isActive, frequencyCap } = body;

    if (!ctaId) return NextResponse.json({ error: 'ctaId required' }, { status: 400 });

    const result = await assignPlacement({
      ctaId,
      articleId: articleId || undefined,
      placement: placement || undefined,
      position: position ?? undefined,
      isActive: isActive ?? undefined,
      frequencyCap: frequencyCap ?? undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

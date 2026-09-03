import { NextRequest, NextResponse } from 'next/server';
import { recordAdEvent } from '@/lib/ad/service';

// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteId, placementId, type } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!placementId) return NextResponse.json({ error: 'placementId required' }, { status: 400 });
    if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });

    const event = await recordAdEvent({
      siteId,
      placementId,
      articleId: body.articleId || undefined,
      type,
      metadata: body.metadata || undefined,
      estimatedRevenue: body.estimatedRevenue || undefined,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

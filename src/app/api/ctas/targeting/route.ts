import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getTargetedCtas } from '@/lib/cta/targeting';
import type { CtaRenderContext } from '@/lib/cta/types';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('cta.read');
    const body = await req.json();
    const { siteId, articleId, categoryId, tagId, tags, source, device, placement } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const context: CtaRenderContext = {
      articleId: articleId || undefined,
      categoryId: categoryId || undefined,
      tags: tagId ? [tagId] : tags || undefined,
      source: source || undefined,
      device: device || undefined,
      placement: placement || undefined,
    };

    const ctas = await getTargetedCtas(siteId, context);

    return NextResponse.json(ctas);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

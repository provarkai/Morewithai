import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createPlacement, listPlacements } from '@/lib/ad/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ad.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const placement = searchParams.get('placement') || undefined;
    const enabledParam = searchParams.get('enabled');
    const enabled = enabledParam !== null ? enabledParam === 'true' : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listPlacements(siteId, { placement, enabled, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('ad.write');
    const body = await req.json();
    const { siteId, name } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const placement = await createPlacement({
      siteId,
      name,
      placement: body.placement || undefined,
      provider: body.provider || undefined,
      adUnitId: body.adUnitId || undefined,
      enabled: body.enabled !== undefined ? body.enabled : undefined,
      articleId: body.articleId || undefined,
      categoryId: body.categoryId || undefined,
      priority: body.priority || undefined,
    });

    return NextResponse.json(placement, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

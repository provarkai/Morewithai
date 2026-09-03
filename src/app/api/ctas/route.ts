import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createCta, listCtas, getCtaStats } from '@/lib/cta/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('cta.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getCtaStats(siteId);
      return NextResponse.json(stats);
    }

    const type = searchParams.get('type') || undefined;
    const placement = searchParams.get('placement') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listCtas(siteId, { type, placement, isActive, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('cta.write');
    const body = await req.json();
    const { siteId, name, type, headline, description, buttonText, buttonUrl, targetPlacement, targetArticleId, targetCategoryId, targetTagId, leadMagnetId, affiliateOfferId, productId, isActive } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!headline) return NextResponse.json({ error: 'headline required' }, { status: 400 });
    if (!buttonText) return NextResponse.json({ error: 'buttonText required' }, { status: 400 });

    const cta = await createCta({
      siteId,
      name,
      type: type || undefined,
      headline,
      description: description || undefined,
      buttonText,
      buttonUrl: buttonUrl || undefined,
      targetPlacement: targetPlacement || undefined,
      targetArticleId: targetArticleId || undefined,
      targetCategoryId: targetCategoryId || undefined,
      targetTagId: targetTagId || undefined,
      leadMagnetId: leadMagnetId || undefined,
      affiliateOfferId: affiliateOfferId || undefined,
      productId: productId || undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    });

    return NextResponse.json(cta, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

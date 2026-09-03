import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const landingPage = await db.landingPage.findFirst({
      where: { id, siteId },
      include: {
        site: { select: { id: true, name: true } },
        leadMagnet: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!landingPage) return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    return NextResponse.json(landingPage);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch landing page';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { title, slug, headline, subheadline, content, ctaText, ctaUrl, leadMagnetId, productId, status } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (headline !== undefined) updateData.headline = headline;
    if (subheadline !== undefined) updateData.subheadline = subheadline || null;
    if (content !== undefined) updateData.content = content;
    if (ctaText !== undefined) updateData.ctaText = ctaText || null;
    if (ctaUrl !== undefined) updateData.ctaUrl = ctaUrl || null;
    if (leadMagnetId !== undefined) updateData.leadMagnetId = leadMagnetId || null;
    if (productId !== undefined) updateData.productId = productId || null;

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'PUBLISHED') {
        const existing = await db.landingPage.findFirst({
          where: { id },
          select: { publishedAt: true },
        });
        if (!existing?.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }
    }

    const landingPage = await db.landingPage.update({
      where: { id },
      data: updateData,
      include: {
        leadMagnet: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(landingPage);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update landing page';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;

    await db.landingPage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete landing page';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

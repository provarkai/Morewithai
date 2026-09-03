import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const [total, published, draft, viewsResult, conversionsResult] = await Promise.all([
        db.landingPage.count({ where: { siteId } }),
        db.landingPage.count({ where: { siteId, status: 'PUBLISHED' } }),
        db.landingPage.count({ where: { siteId, status: 'DRAFT' } }),
        db.landingPage.aggregate({ _sum: { viewCount: true }, where: { siteId } }),
        db.landingPage.aggregate({ _sum: { conversionCount: true }, where: { siteId } }),
      ]);

      return NextResponse.json({
        total,
        published,
        draft,
        totalViews: viewsResult._sum.viewCount || 0,
        totalConversions: conversionsResult._sum.conversionCount || 0,
      });
    }

    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { siteId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { headline: { contains: search } },
      ];
    }

    const [landingPages, total] = await Promise.all([
      db.landingPage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          leadMagnet: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
        },
      }),
      db.landingPage.count({ where }),
    ]);

    return NextResponse.json({
      data: landingPages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch landing pages';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      siteId,
      title,
      slug,
      headline,
      subheadline,
      content,
      ctaText,
      ctaUrl,
      leadMagnetId,
      productId,
    } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!headline) return NextResponse.json({ error: 'headline is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    const finalSlug = slug || generateSlug(title);

    const landingPage = await db.landingPage.create({
      data: {
        siteId,
        title,
        slug: finalSlug,
        headline,
        subheadline: subheadline || null,
        content,
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        leadMagnetId: leadMagnetId || null,
        productId: productId || null,
      },
      include: {
        leadMagnet: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(landingPage, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create landing page';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

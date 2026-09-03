import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';

// POST /api/articles/:id/refresh — Trigger a content refresh for an article
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('article.edit');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const article = await db.article.findFirst({ where: { id, siteId } });
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    // Create a ContentRefresh record to track this refresh attempt
    const refresh = await db.contentRefresh.create({
      data: {
        articleId: id,
        reason: 'MANUAL',
        status: 'PENDING',
        triggeredAt: new Date(),
      },
    });

    // Update article status to indicate refresh is in progress
    await db.article.update({
      where: { id },
      data: { status: 'UPDATING' },
    });

    return NextResponse.json({
      refreshId: refresh.id,
      message: 'Content refresh initiated',
      articleId: id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to trigger refresh';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/articles/:id/refresh — Get refresh history for an article
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('article.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const article = await db.article.findFirst({ where: { id, siteId } });
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    const refreshes = await db.contentRefresh.findMany({
      where: { articleId: id },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(refreshes);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch refreshes';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

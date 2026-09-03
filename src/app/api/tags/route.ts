import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('site.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const tags = await db.tag.findMany({
      where: { siteId },
      include: { _count: { select: { articles: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(tags);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tags';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.create');
    const data = await req.json();
    if (!data.name || !data.siteId) return NextResponse.json({ error: 'name and siteId required' }, { status: 400 });
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const tag = await db.tag.create({
      data: { siteId: data.siteId, name: data.name, slug, description: data.description || null },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create tag';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

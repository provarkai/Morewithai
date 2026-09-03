import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('site.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const categories = await db.category.findMany({
      where: { siteId },
      include: { _count: { select: { articles: true, children: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.create');
    const data = await req.json();
    if (!data.name || !data.siteId) return NextResponse.json({ error: 'name and siteId required' }, { status: 400 });
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const category = await db.category.create({
      data: {
        siteId: data.siteId, name: data.name, slug,
        description: data.description || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('site.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const authors = await db.author.findMany({
      where: { siteId },
      include: { _count: { select: { articles: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(authors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch authors';
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('user.write');
    const data = await req.json();
    if (!data.name || !data.siteId) return NextResponse.json({ error: 'name and siteId required' }, { status: 400 });
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const author = await db.author.create({
      data: {
        siteId: data.siteId,
        name: data.name,
        slug,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
        website: data.website || null,
        socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : null,
        userId: data.userId || null,
      },
    });
    return NextResponse.json(author, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create author';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

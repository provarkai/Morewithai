import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getVersions, createVersion } from '@/lib/articles/versioning';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('article.read');
    const { id } = await params;
    const versions = await getVersions(id);
    return NextResponse.json(versions);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch versions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('article.edit');
    const { id } = await params;
    const body = await req.json();

    const article = await db.article.findUnique({ where: { id } });
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    const version = await createVersion({
      articleId: id,
      title: body.title || article.rewrittenTitle || article.title,
      content: body.content || article.rewrittenContent || article.originalContent,
      excerpt: body.excerpt ?? article.excerpt,
      changeReason: body.changeReason || undefined,
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create version';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

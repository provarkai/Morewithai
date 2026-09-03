import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { addArticleToCluster, removeArticleFromCluster } from '@/lib/growth/cluster.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.write');
    const { id: clusterId } = await params;
    const body = await req.json();
    const { articleId, role, position } = body;
    if (!articleId) return NextResponse.json({ error: 'articleId is required' }, { status: 400 });

    const clusterArticle = await addArticleToCluster(clusterId, articleId, role, position);
    return NextResponse.json(clusterArticle, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to add article';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.write');
    const { id: clusterId } = await params;
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');
    if (!articleId) return NextResponse.json({ error: 'articleId is required' }, { status: 400 });

    await removeArticleFromCluster(clusterId, articleId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to remove article';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

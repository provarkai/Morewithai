import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createCluster, listClusters } from '@/lib/growth/cluster.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const result = await listClusters(siteId, {
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list clusters';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const body = await req.json();
    const { siteId, name, slug, description, pillarArticleId } = body;
    if (!siteId || !name || !slug) {
      return NextResponse.json({ error: 'siteId, name, and slug are required' }, { status: 400 });
    }

    const cluster = await createCluster({ siteId, name, slug, description, pillarArticleId });
    return NextResponse.json(cluster, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create cluster';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

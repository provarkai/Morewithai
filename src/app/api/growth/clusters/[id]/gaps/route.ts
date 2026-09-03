import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getClusterGaps } from '@/lib/growth/cluster.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.write');
    const { id: clusterId } = await params;
    const body = await req.json();
    const { siteId } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const gaps = await getClusterGaps(siteId, clusterId);
    return NextResponse.json({ gaps });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to analyze gaps';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

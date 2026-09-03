import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { updateClusterMetrics } from '@/lib/growth/cluster.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.write');
    const { id: clusterId } = await params;

    const cluster = await updateClusterMetrics(clusterId);
    return NextResponse.json(cluster);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update metrics';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

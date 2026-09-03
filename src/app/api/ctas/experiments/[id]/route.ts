import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  getExperiment,
  pauseExperiment,
  completeExperiment,
  cancelExperiment,
} from '@/lib/cta/ab-testing.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('cta.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const experiment = await getExperiment(id, siteId);
    if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });

    return NextResponse.json(experiment);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('cta.write');
    const { id } = await params;
    const body = await req.json();
    const { siteId, action } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

    const validActions = ['pause', 'complete', 'cancel'] as const;
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: pause, complete, or cancel' }, { status: 400 });
    }

    switch (action) {
      case 'pause':
        return NextResponse.json(await pauseExperiment(id, siteId));
      case 'complete':
        return NextResponse.json(await completeExperiment(id, siteId));
      case 'cancel':
        return NextResponse.json(await cancelExperiment(id, siteId));
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

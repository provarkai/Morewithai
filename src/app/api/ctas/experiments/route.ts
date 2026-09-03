import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createExperiment, listExperiments, getExperimentStats } from '@/lib/cta/ab-testing.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('cta.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getExperimentStats(siteId);
      return NextResponse.json(stats);
    }

    const status = searchParams.get('status') || undefined;
    const experiments = await listExperiments(siteId, { status });
    return NextResponse.json(experiments);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('cta.write');
    const body = await req.json();
    const { siteId, name, ctaId, variants } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!ctaId) return NextResponse.json({ error: 'ctaId required' }, { status: 400 });
    if (!variants || variants.length < 2) {
      return NextResponse.json({ error: 'At least 2 variants required' }, { status: 400 });
    }

    const experiment = await createExperiment({ siteId, name, ctaId, variants });
    return NextResponse.json(experiment, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { recordHealthScores, getLatestHealthScores } from '@/lib/command-center/health.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('analytics.read');
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

    const siteId = searchParams.get('siteId') || undefined;
    const scores = await getLatestHealthScores(organizationId, siteId);
    return NextResponse.json(scores);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('analytics.write');
    const body = await req.json();
    const { organizationId, siteId, periodStart, periodEnd } = body;
    if (!organizationId || !siteId || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'organizationId, siteId, periodStart, periodEnd required' }, { status: 400 });
    }
    const scores = await recordHealthScores(
      organizationId,
      siteId,
      new Date(periodStart),
      new Date(periodEnd),
    );
    return NextResponse.json(scores, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

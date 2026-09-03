import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  createCompetitor,
  listCompetitors,
  getCompetitor,
  deleteCompetitor,
  upsertCompetitorPage,
  getRecentChanges,
  getCompetitorStats,
} from '@/lib/competitor/competitor.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('analytics.read');
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

    const action = searchParams.get('action') || 'list';
    const siteId = searchParams.get('siteId') || undefined;

    if (action === 'stats') {
      const stats = await getCompetitorStats(organizationId);
      return NextResponse.json(stats);
    }
    if (action === 'changes') {
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const changes = await getRecentChanges(organizationId, limit);
      return NextResponse.json(changes);
    }
    if (action === 'detail') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const competitor = await getCompetitor(id);
      if (!competitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(competitor);
    }

    const competitors = await listCompetitors(organizationId, siteId);
    return NextResponse.json(competitors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('analytics.write');
    const body = await req.json();
    const { action } = body;

    if (action === 'page') {
      const page = await upsertCompetitorPage(body);
      return NextResponse.json(page, { status: 201 });
    }

    const competitor = await createCompetitor(body);
    return NextResponse.json(competitor, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission('analytics.write');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await deleteCompetitor(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

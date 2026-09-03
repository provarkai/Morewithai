import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { trackEvent, trackPageView, trackCTAClick, queryEvents, getEventStats } from '@/lib/events/event.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('analytics.read');
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const siteId = searchParams.get('siteId') || undefined;
    if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

    const action = searchParams.get('action') || 'stats';
    if (action === 'stats') {
      const days = parseInt(searchParams.get('days') || '30', 10);
      const stats = await getEventStats(organizationId, siteId, days);
      return NextResponse.json(stats);
    }

    const result = await queryEvents({
      organizationId,
      siteId,
      eventType: searchParams.get('eventType') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
    });
    return NextResponse.json(result);
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

    if (action === 'pageview') {
      const event = await trackPageView(body);
      return NextResponse.json(event, { status: 201 });
    }
    if (action === 'cta_click') {
      const event = await trackCTAClick(body);
      return NextResponse.json(event, { status: 201 });
    }

    const event = await trackEvent(body);
    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createEvent, listEvents, generateCalendarSuggestions } from '@/lib/calendar/service';
import type { CalendarEventType } from '@/lib/growth/types';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const result = await listEvents(siteId, {
      eventType: searchParams.get('eventType') as CalendarEventType | undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list events';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'suggestions') {
      const body = await req.json();
      const { siteId } = body;
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

      const events = await generateCalendarSuggestions(siteId);
      return NextResponse.json({ events, count: events.length });
    }

    // Standard create
    const body = await req.json();
    const { siteId, ...data } = body;
    if (!siteId || !data.eventType || !data.title || !data.scheduledDate) {
      return NextResponse.json({ error: 'siteId, eventType, title, and scheduledDate are required' }, { status: 400 });
    }

    const event = await createEvent({ siteId, ...data });
    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create event';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

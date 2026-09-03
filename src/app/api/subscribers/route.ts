import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createSubscriber, listSubscribers, getSubscriberStats, exportSubscribers } from '@/lib/subscriber/service';
import { SUBSCRIBER_STATUS, SUBSCRIBER_SOURCE } from '@/lib/subscriber/types';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('subscriber.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getSubscriberStats(siteId);
      return NextResponse.json(stats);
    }

    if (action === 'export') {
      const data = await exportSubscribers(siteId);
      return NextResponse.json(data);
    }

    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await listSubscribers(siteId, { status, source, search, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('subscriber.write');
    const body = await req.json();
    const { siteId, email, firstName, source } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const validSource = source && Object.values(SUBSCRIBER_SOURCE).includes(source as never) ? source : undefined;

    const subscriber = await createSubscriber({
      siteId,
      email,
      firstName: firstName || undefined,
      source: validSource,
    });

    return NextResponse.json(subscriber, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

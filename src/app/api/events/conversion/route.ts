import { NextRequest, NextResponse } from 'next/server';
import { trackConversion } from '@/lib/analytics/conversion.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteId, articleId, subscriberId, eventType, sourceType, sourceId, value, metadata } = body;

    if (!siteId || !eventType || !sourceType) {
      return NextResponse.json(
        { error: 'siteId, eventType, and sourceType are required' },
        { status: 400 }
      );
    }

    const event = await trackConversion({
      siteId,
      articleId: articleId || undefined,
      subscriberId: subscriberId || undefined,
      eventType,
      sourceType,
      sourceId: sourceId || undefined,
      value: value ?? 0,
      metadata,
    });

    return NextResponse.json({ success: true, id: event.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track conversion';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

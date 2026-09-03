import { NextRequest, NextResponse } from 'next/server';
import { trackClick } from '@/lib/affiliate/tracking.service';
import { trackConversion } from '@/lib/analytics/conversion.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteId, offerId, articleId, sessionIdentifier } = body;

    if (!siteId || !offerId) {
      return NextResponse.json({ error: 'siteId and offerId are required' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const referrer = req.headers.get('referer') || undefined;

    const result = await trackClick({
      siteId,
      offerId,
      articleId: articleId || undefined,
      sessionIdentifier: sessionIdentifier || undefined,
      userAgent,
      referrer,
    });

    // Also track as a conversion event
    await trackConversion({
      siteId,
      articleId: articleId || undefined,
      eventType: 'AFFILIATE_CLICK',
      sourceType: 'AFFILIATE',
      sourceId: offerId,
      metadata: { clickId: result.clickId, sessionIdentifier },
    });

    return NextResponse.json({ success: true, redirectUrl: result.redirectUrl, clickId: result.clickId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track affiliate click';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

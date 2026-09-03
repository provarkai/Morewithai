import { NextRequest, NextResponse } from 'next/server';
import { trackClick } from '@/lib/affiliate/tracking.service';

// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteId, offerId } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!offerId) return NextResponse.json({ error: 'offerId required' }, { status: 400 });

    const result = await trackClick({
      siteId,
      offerId,
      articleId: body.articleId || undefined,
      subscriberId: body.subscriberId || undefined,
      sessionIdentifier: body.sessionIdentifier || undefined,
      ip: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      referrer: req.headers.get('referer') || undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

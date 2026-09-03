import { NextRequest, NextResponse } from 'next/server';
import { upsertTrafficMetric } from '@/lib/analytics/traffic.service';
import { trackConversion } from '@/lib/analytics/conversion.service';

const BOT_PATTERNS = /bot|crawl|spider|slurp/i;

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get('user-agent') || '';

    // Bot detection
    if (BOT_PATTERNS.test(userAgent)) {
      return NextResponse.json({ ignored: true, reason: 'bot_detected' });
    }

    const body = await req.json();
    const { siteId, articleId, path, referrer, source, device } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const now = new Date();

    // Determine traffic source from referrer or explicit source
    let trafficSource = source || 'direct';
    if (!source && referrer) {
      if (referrer.includes('google') || referrer.includes('bing') || referrer.includes('yahoo')) {
        trafficSource = 'organic_search';
      } else if (referrer.includes('facebook') || referrer.includes('twitter') || referrer.includes('x.com') || referrer.includes('linkedin')) {
        trafficSource = 'social';
      } else {
        trafficSource = 'referral';
      }
    }

    // Detect device from user agent if not provided
    let detectedDevice = device;
    if (!detectedDevice) {
      if (/mobile|android|iphone|ipod/i.test(userAgent)) {
        detectedDevice = 'mobile';
      } else if (/tablet|ipad/i.test(userAgent)) {
        detectedDevice = 'tablet';
      } else {
        detectedDevice = 'desktop';
      }
    }

    // Upsert traffic metric and track conversion event in parallel
    const [trafficResult] = await Promise.all([
      upsertTrafficMetric({
        siteId,
        articleId: articleId || undefined,
        date: now,
        pageViews: 1,
        sessions: 1,
        users: 1,
        trafficSource,
        device: detectedDevice,
      }),
      trackConversion({
        siteId,
        articleId: articleId || undefined,
        eventType: 'PAGE_VIEW',
        sourceType: 'TRAFFIC',
        metadata: { path, referrer, userAgent },
      }),
    ]);

    return NextResponse.json({ success: true, id: trafficResult.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track pageview';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

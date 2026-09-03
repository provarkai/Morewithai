import { NextRequest, NextResponse } from 'next/server';
import { recordCtaImpression, recordCtaClick } from '@/lib/cta/service';
import { trackConversion } from '@/lib/analytics/conversion.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteId, ctaId, articleId, variantId, subscriberId, action } = body;

    if (!siteId || !ctaId) {
      return NextResponse.json({ error: 'siteId and ctaId are required' }, { status: 400 });
    }

    const effectiveAction = action || 'click';

    if (effectiveAction === 'impression') {
      await recordCtaImpression(ctaId);
      await trackConversion({
        siteId,
        articleId: articleId || undefined,
        eventType: 'CTA_IMPRESSION',
        sourceType: 'CTA',
        sourceId: ctaId,
        metadata: variantId ? { variantId } : undefined,
      });
      return NextResponse.json({ success: true, action: 'impression' });
    }

    if (effectiveAction === 'click') {
      await recordCtaClick(ctaId);
      await trackConversion({
        siteId,
        articleId: articleId || undefined,
        subscriberId: subscriberId || undefined,
        eventType: 'CTA_CLICK',
        sourceType: 'CTA',
        sourceId: ctaId,
        metadata: variantId ? { variantId } : undefined,
      });
      return NextResponse.json({ success: true, action: 'click' });
    }

    return NextResponse.json({ error: 'Invalid action. Use: impression or click' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track CTA event';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

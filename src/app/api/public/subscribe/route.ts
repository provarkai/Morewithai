import { NextRequest, NextResponse } from 'next/server';
import { captureLead } from '@/lib/lead/service';
import { createSubscriber } from '@/lib/subscriber/service';
import { SUBSCRIBER_SOURCE } from '@/lib/subscriber/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteId, email, firstName, leadMagnetId, articleId, source } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (leadMagnetId) {
      // Lead magnet flow: capture lead (creates subscriber as side effect)
      const lead = await captureLead({
        siteId,
        email,
        firstName: firstName || undefined,
        leadMagnetId,
        articleId: articleId || undefined,
        source: source || 'LEAD_MAGNET',
      });
      return NextResponse.json({ success: true, message: 'Lead captured successfully', leadId: lead.id });
    }

    // Simple newsletter subscribe
    const subscriber = await createSubscriber({
      siteId,
      email,
      firstName: firstName || undefined,
      source: (source as never) || SUBSCRIBER_SOURCE.OTHER,
    });
    return NextResponse.json({ success: true, message: 'Successfully subscribed', subscriberId: subscriber.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createAdjustment } from '@/lib/revenue/service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('revenue.write');
    const body = await req.json();
    const { siteId, relatedEventId, amount, reason } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!relatedEventId) return NextResponse.json({ error: 'relatedEventId required' }, { status: 400 });
    if (amount === undefined || amount === null) return NextResponse.json({ error: 'amount required' }, { status: 400 });
    if (!reason) return NextResponse.json({ error: 'reason required' }, { status: 400 });

    const adjustment = await createAdjustment({
      siteId,
      relatedEventId,
      amount,
      reason,
      createdBy: body.createdBy || undefined,
    });

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

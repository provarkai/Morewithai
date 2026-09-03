import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { getProfitMetrics } from '@/lib/revenue/profit.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const metrics = await getProfitMetrics(siteId);
    return NextResponse.json(metrics);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

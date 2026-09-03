import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { forecastRevenue } from '@/lib/growth/business-goals';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const months = parseInt(searchParams.get('months') || '3', 10);

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const forecast = await forecastRevenue(siteId, Math.min(months, 12));
    return NextResponse.json({ forecast });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

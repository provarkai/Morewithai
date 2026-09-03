import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getTopMoneyOpportunities } from '@/lib/growth/money-score.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const results = await getTopMoneyOpportunities(siteId, limit);

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to calculate money scores';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

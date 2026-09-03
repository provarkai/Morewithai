import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  batchCalculateEconomics,
  getTopEarningArticles,
  getSiteEconomicsSummary,
  generateProfitSnapshot,
} from '@/lib/command-center/economics.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('revenue.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action') || 'summary';
    const periodStart = searchParams.get('periodStart') ? new Date(searchParams.get('periodStart')!) : new Date(Date.now() - 30 * 86400000);
    const periodEnd = searchParams.get('periodEnd') ? new Date(searchParams.get('periodEnd')!) : new Date();

    if (action === 'top-earning') {
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const articles = await getTopEarningArticles(siteId, limit);
      return NextResponse.json(articles);
    }

    const summary = await getSiteEconomicsSummary(siteId, periodStart, periodEnd);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('revenue.write');
    const body = await req.json();
    const { action } = body;

    if (action === 'profit-snapshot') {
      const snapshot = await generateProfitSnapshot(
        body.organizationId,
        body.siteId,
        new Date(body.periodStart),
        new Date(body.periodEnd),
      );
      return NextResponse.json(snapshot, { status: 201 });
    }

    const result = await batchCalculateEconomics(
      body.organizationId,
      body.siteId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

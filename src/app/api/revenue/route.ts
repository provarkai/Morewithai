import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getRevenueDashboard, getRevenueBySource, getTopMoneyArticles } from '@/lib/revenue/service';
import type { RevenuePeriod } from '@/lib/revenue/types';

function parsePeriod(searchParams: URLSearchParams): RevenuePeriod | undefined {
  const start = searchParams.get('startDate');
  const end = searchParams.get('endDate');
  if (!start && !end) return undefined;
  return {
    startDate: start ? new Date(start) : undefined,
    endDate: end ? new Date(end) : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission('revenue.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action') || 'dashboard';
    const period = parsePeriod(searchParams);

    switch (action) {
      case 'dashboard': {
        const dashboard = await getRevenueDashboard(siteId);
        return NextResponse.json(dashboard);
      }
      case 'sources': {
        const sources = await getRevenueBySource(siteId, period);
        return NextResponse.json(sources);
      }
      case 'articles': {
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const articles = await getTopMoneyArticles(siteId, limit, period);
        return NextResponse.json(articles);
      }
      default:
        return NextResponse.json({ error: 'Invalid action. Use: dashboard, sources, articles' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

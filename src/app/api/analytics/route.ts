import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getTrafficStats } from '@/lib/analytics/traffic.service';
import { getSearchStats } from '@/lib/analytics/search.service';
import { getConversionStats, getConversionFunnel, getEmailConversionFunnel } from '@/lib/analytics/conversion.service';

function parsePeriod(searchParams: URLSearchParams) {
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
    await requirePermission('analytics.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const action = searchParams.get('action') || 'overview';
    const period = parsePeriod(searchParams);

    if (action !== 'overview') {
      return NextResponse.json({ error: 'Invalid action. Use: overview' }, { status: 400 });
    }

    const [traffic, search, conversions, trafficFunnel, emailFunnel] = await Promise.all([
      getTrafficStats(siteId, period),
      getSearchStats(siteId, period),
      getConversionStats(siteId, period),
      getConversionFunnel(siteId, period),
      getEmailConversionFunnel(siteId, period),
    ]);

    return NextResponse.json({
      traffic,
      search,
      conversions,
      trafficFunnel,
      emailFunnel,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch analytics overview';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

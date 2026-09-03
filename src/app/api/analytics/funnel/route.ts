import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getConversionFunnel, getEmailConversionFunnel } from '@/lib/analytics/conversion.service';

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

    const type = searchParams.get('type') || 'traffic';
    const period = parsePeriod(searchParams);

    if (type === 'email') {
      const data = await getEmailConversionFunnel(siteId, period);
      return NextResponse.json(data);
    }

    const data = await getConversionFunnel(siteId, period);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch funnel data';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

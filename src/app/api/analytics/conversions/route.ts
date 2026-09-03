import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getConversionStats, getArticleConversions, getConversionFunnel, getEmailConversionFunnel } from '@/lib/analytics/conversion.service';

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

    const action = searchParams.get('action') || 'stats';
    const period = parsePeriod(searchParams);

    switch (action) {
      case 'article': {
        const articleId = searchParams.get('articleId');
        if (!articleId) return NextResponse.json({ error: 'articleId is required for article action' }, { status: 400 });
        const data = await getArticleConversions(articleId, siteId, period);
        return NextResponse.json(data);
      }
      case 'funnel': {
        const data = await getConversionFunnel(siteId, period);
        return NextResponse.json(data);
      }
      case 'email-funnel': {
        const data = await getEmailConversionFunnel(siteId, period);
        return NextResponse.json(data);
      }
      case 'stats':
      default: {
        const data = await getConversionStats(siteId, period);
        return NextResponse.json(data);
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch conversion analytics';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

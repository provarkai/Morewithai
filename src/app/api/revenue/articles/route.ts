import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getTopMoneyArticles, getArticleRevenue } from '@/lib/revenue/service';
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

    const articleId = searchParams.get('articleId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const period = parsePeriod(searchParams);

    // If articleId is provided, return revenue for a single article
    if (articleId) {
      const revenue = await getArticleRevenue(articleId, siteId, period);
      return NextResponse.json(revenue);
    }

    // Otherwise, return top money articles
    const articles = await getTopMoneyArticles(siteId, limit, period);
    return NextResponse.json(articles);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

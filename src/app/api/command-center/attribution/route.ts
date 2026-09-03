import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  recordAttribution,
  getAttributions,
  getArticleAttributionSummary,
  getAttributionByModel,
} from '@/lib/revenue/attribution.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('revenue.read');
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

    const action = searchParams.get('action') || 'list';
    const siteId = searchParams.get('siteId') || undefined;

    if (action === 'by-article') {
      const days = parseInt(searchParams.get('days') || '30', 10);
      const summary = await getArticleAttributionSummary(organizationId, siteId, days);
      return NextResponse.json(summary);
    }
    if (action === 'by-model') {
      const days = parseInt(searchParams.get('days') || '30', 10);
      const modelBreakdown = await getAttributionByModel(organizationId, days);
      return NextResponse.json(modelBreakdown);
    }

    const result = await getAttributions({
      organizationId,
      siteId,
      articleId: searchParams.get('articleId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('revenue.write');
    const body = await req.json();
    const attribution = await recordAttribution(body);
    return NextResponse.json(attribution, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

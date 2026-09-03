import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { analyzeContentGaps, saveGapsAsOpportunities } from '@/lib/growth/content-gap.service';
import { classifyArticles, getTierSummary } from '@/lib/growth/content-classification.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'gaps') {
      const gaps = await analyzeContentGaps(siteId);
      return NextResponse.json({ gaps, count: gaps.length });
    }

    if (action === 'classify') {
      const classifications = await classifyArticles(siteId);
      const summary = getTierSummary(classifications);
      return NextResponse.json({ classifications, summary });
    }

    return NextResponse.json({ error: 'Specify action: gaps or classify' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (body.action === 'save-gaps') {
      const created = await saveGapsAsOpportunities(body.siteId, body.gaps);
      return NextResponse.json({ created });
    }

    return NextResponse.json({ error: 'Specify action: save-gaps' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

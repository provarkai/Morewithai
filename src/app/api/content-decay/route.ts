import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getContentDecayScores, getContentHealthSummary } from '@/lib/content-refresh/decay.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (action === 'summary') {
      const summary = await getContentHealthSummary(siteId);
      return NextResponse.json(summary);
    }

    const scores = await getContentDecayScores(siteId, limit);
    return NextResponse.json({ scores, total: scores.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

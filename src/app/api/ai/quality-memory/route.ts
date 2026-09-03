import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { getPromptPerformance, getQualityTrend, getBestModel } from '@/lib/ai/quality-memory';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'performance') {
      const jobType = searchParams.get('jobType') || undefined;
      const performance = await getPromptPerformance(siteId, jobType);
      return NextResponse.json({ performance });
    }

    if (action === 'trend') {
      const jobType = searchParams.get('jobType') || undefined;
      const days = parseInt(searchParams.get('days') || '30', 10);
      const trend = await getQualityTrend(siteId, jobType, days);
      return NextResponse.json({ trend });
    }

    if (action === 'best-model') {
      const jobType = searchParams.get('jobType') || 'GENERATE';
      const best = await getBestModel(siteId, jobType);
      return NextResponse.json({ bestModel: best });
    }

    // Default: return performance overview
    const performance = await getPromptPerformance(siteId);
    const trend = await getQualityTrend(siteId, undefined, 30);
    return NextResponse.json({ performance, trend });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

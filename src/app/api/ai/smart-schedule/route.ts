import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { analyzeOptimalPublishTime, suggestSchedule } from '@/lib/ai/smart-scheduler.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const articleId = req.nextUrl.searchParams.get('articleId') || undefined;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    const recommendation = await analyzeOptimalPublishTime(siteId, articleId || undefined);
    return NextResponse.json(recommendation);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const body = await req.json();
    const { siteId, articleId } = body;

    if (!siteId || !articleId) {
      return NextResponse.json({ error: 'siteId and articleId required' }, { status: 400 });
    }

    const schedule = await suggestSchedule(siteId, articleId);
    return NextResponse.json(schedule);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Scheduling failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

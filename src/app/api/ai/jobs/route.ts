import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { listJobs, getJobStats } from '@/lib/ai/job.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    // Stats endpoint
    if (action === 'stats') {
      const stats = await getJobStats(siteId);
      return NextResponse.json(stats);
    }

    // List endpoint
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const articleId = searchParams.get('articleId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listJobs({ siteId, type, status, articleId, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('401')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch AI jobs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { listJobs, getJobStats, createJob, createPipeline } from '@/lib/orchestrator/queue.service';
import { orchestrateSite, getOrchestratorStatus } from '@/lib/orchestrator/orchestrator.service';
import { batchPrioritize } from '@/lib/orchestrator/priority.service';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'stats') {
      const stats = await getJobStats(siteId);
      return NextResponse.json(stats);
    }
    if (action === 'orchestrate') {
      const result = await orchestrateSite(siteId);
      return NextResponse.json(result);
    }
    if (action === 'status') {
      const status = await getOrchestratorStatus(siteId);
      return NextResponse.json(status);
    }
    if (action === 'prioritize') {
      const results = await batchPrioritize(siteId);
      return NextResponse.json({ prioritized: results.length, results });
    }

    // Default: list jobs
    const jobs = await listJobs(siteId, {
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      articleId: searchParams.get('articleId') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    });
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('Unauthorized') || message.includes('Authentication') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (body.action === 'pipeline') {
      const jobs = await createPipeline(body.siteId, body.articleId, body.options);
      return NextResponse.json({ created: jobs.length, jobs }, { status: 201 });
    }

    if (body.action === 'orchestrate') {
      const result = await orchestrateSite(body.siteId);
      return NextResponse.json(result);
    }

    // Single job creation
    const job = await createJob({
      siteId: body.siteId,
      articleId: body.articleId,
      type: body.type,
      priority: body.priority,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      input: body.input,
    });
    return NextResponse.json(job, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('Unauthorized') || message.includes('Authentication') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

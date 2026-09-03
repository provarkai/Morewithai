import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { retryJob, cancelJob } from '@/lib/ai/job.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('ai.analyze');
    const { id } = await params;
    const { action } = await req.json();

    if (action === 'retry') {
      const job = await retryJob(id);
      return NextResponse.json({ success: true, job });
    }

    if (action === 'cancel') {
      const job = await cancelJob(id);
      return NextResponse.json({ success: true, job });
    }

    return NextResponse.json({ error: 'Invalid action. Use "retry" or "cancel".' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Job operation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
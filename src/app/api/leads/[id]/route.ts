import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { updateLeadStatus } from '@/lib/lead/service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('subscriber.write');
    const { id } = await params;
    const body = await req.json();
    const { status, siteId } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

    const lead = await updateLeadStatus(id, siteId, status);
    return NextResponse.json(lead);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

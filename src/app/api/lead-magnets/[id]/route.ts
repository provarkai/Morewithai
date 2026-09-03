import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getLeadMagnet, updateLeadMagnet, deleteLeadMagnet } from '@/lib/lead-magnet/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('subscriber.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const magnet = await getLeadMagnet(id, siteId);
    if (!magnet) return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 });
    return NextResponse.json(magnet);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('subscriber.write');
    const { id } = await params;
    const body = await req.json();
    const { siteId, ...updateData } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const magnet = await updateLeadMagnet(id, siteId, updateData);
    return NextResponse.json(magnet);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('subscriber.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const magnet = await deleteLeadMagnet(id, siteId);
    return NextResponse.json(magnet);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getOpportunity, updateOpportunity, deleteOpportunity } from '@/lib/growth/opportunity.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const opportunity = await getOpportunity(id, siteId);
    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

    return NextResponse.json(opportunity);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.write');
    const { id } = await params;
    const body = await req.json();
    const { siteId, ...data } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const opportunity = await updateOpportunity(id, siteId, data);
    return NextResponse.json(opportunity);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('growth.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    await deleteOpportunity(id, siteId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getOffer, updateOffer, deleteOffer } from '@/lib/affiliate/offer.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('affiliate.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const offer = await getOffer(id, siteId);
    if (!offer) return NextResponse.json({ error: 'Affiliate offer not found' }, { status: 404 });

    return NextResponse.json(offer);
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
    await requirePermission('affiliate.write');
    const { id } = await params;
    const body = await req.json();
    const { siteId, ...data } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const offer = await updateOffer(id, siteId, data);
    return NextResponse.json(offer);
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
    await requirePermission('affiliate.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    await deleteOffer(id, siteId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

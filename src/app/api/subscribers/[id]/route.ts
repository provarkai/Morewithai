import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { unsubscribeSubscriber, deleteSubscriber } from '@/lib/subscriber/service';

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

    const subscriber = await db.subscriber.findFirst({
      where: { id, siteId },
      include: {
        _count: {
          select: {
            leads: true,
            emailEvents: true,
            productPurchases: true,
            affiliateClicks: true,
            conversionEvents: true,
          },
        },
      },
    });

    if (!subscriber) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    return NextResponse.json(subscriber);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('subscriber.write');
    const { id } = await params;
    const body = await req.json();
    const { action, siteId } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'unsubscribe') {
      const subscriber = await unsubscribeSubscriber(id, siteId);
      return NextResponse.json(subscriber);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
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

    const subscriber = await deleteSubscriber(id, siteId);
    return NextResponse.json(subscriber);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

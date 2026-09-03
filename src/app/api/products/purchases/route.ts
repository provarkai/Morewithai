import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { recordPurchase, listPurchases } from '@/lib/product/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('product.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const productId = searchParams.get('productId') || undefined;
    const articleId = searchParams.get('articleId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listPurchases(siteId, { productId, articleId, status, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('product.write');
    const body = await req.json();
    const { siteId, productId, email, amount } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (amount === undefined || amount === null) return NextResponse.json({ error: 'amount required' }, { status: 400 });

    const purchase = await recordPurchase({
      siteId,
      productId,
      articleId: body.articleId || undefined,
      subscriberId: body.subscriberId || undefined,
      email,
      amount,
      currency: body.currency || undefined,
      transactionId: body.transactionId || undefined,
      provider: body.provider || undefined,
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

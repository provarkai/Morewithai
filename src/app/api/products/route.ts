import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createProduct, listProducts, getProductStats } from '@/lib/product/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('product.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');
    if (action === 'stats') {
      const stats = await getProductStats(siteId);
      return NextResponse.json(stats);
    }

    const productType = searchParams.get('productType') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listProducts(siteId, { productType, status, page, limit });
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
    const { siteId, name, slug, description, price } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
    if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });
    if (price === undefined || price === null) return NextResponse.json({ error: 'price required' }, { status: 400 });

    const product = await createProduct({
      siteId,
      name,
      slug,
      description,
      price,
      currency: body.currency || undefined,
      productType: body.productType || undefined,
      checkoutUrl: body.checkoutUrl || undefined,
      imageUrl: body.imageUrl || undefined,
      authorId: body.authorId || undefined,
      status: body.status || undefined,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

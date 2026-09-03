import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { executeBulkAction, getBulkOperation, listBulkOperations, selectArticlesForBulk } from '@/lib/bulk/bulk-operations.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const action = req.nextUrl.searchParams.get('action');
    const operationId = req.nextUrl.searchParams.get('operationId');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (operationId) {
      const op = getBulkOperation(operationId);
      return NextResponse.json(op || { error: 'Operation not found' });
    }

    if (action === 'select') {
      const status = req.nextUrl.searchParams.get('status') || undefined;
      const categoryId = req.nextUrl.searchParams.get('categoryId') || undefined;
      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
      const articles = await selectArticlesForBulk({ siteId, status, categoryId, limit });
      return NextResponse.json({ articles, total: articles.length });
    }

    const ops = listBulkOperations(siteId);
    return NextResponse.json({ operations: ops });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { siteId, action, articleIds, params } = body;
    if (!siteId || !action || !articleIds?.length) {
      return NextResponse.json({ error: 'siteId, action, articleIds required' }, { status: 400 });
    }
    const operation = await executeBulkAction(siteId, action, articleIds, params || {});
    return NextResponse.json(operation);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

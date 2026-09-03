import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createProgram, listPrograms, getProgramStats } from '@/lib/affiliate/program.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('affiliate.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');
    if (action === 'stats') {
      const stats = await getProgramStats(siteId);
      return NextResponse.json(stats);
    }

    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listPrograms(siteId, { status, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('affiliate.write');
    const body = await req.json();
    const { siteId, name } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const program = await createProgram({
      siteId,
      name,
      network: body.network || undefined,
      website: body.website || undefined,
      commissionType: body.commissionType || undefined,
      commissionValue: body.commissionValue || undefined,
      cookieDuration: body.cookieDuration || undefined,
      terms: body.terms || undefined,
      status: body.status || undefined,
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

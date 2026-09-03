import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { captureLead, listLeads, getLeadStats } from '@/lib/lead/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('subscriber.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getLeadStats(siteId);
      return NextResponse.json(stats);
    }

    const articleId = searchParams.get('articleId') || undefined;
    const leadMagnetId = searchParams.get('leadMagnetId') || undefined;
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await listLeads(siteId, { articleId, leadMagnetId, status, source, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('subscriber.write');
    const body = await req.json();
    const { siteId, email, firstName, articleId, leadMagnetId, source } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const lead = await captureLead({
      siteId,
      email,
      firstName: firstName || undefined,
      articleId: articleId || undefined,
      leadMagnetId: leadMagnetId || undefined,
      source: source || undefined,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

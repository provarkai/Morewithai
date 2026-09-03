import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createOpportunity, listOpportunities, analyzeOpportunities } from '@/lib/growth/opportunity.service';
import type { OpportunityType, Priority, OpportunityStatus } from '@/lib/growth/types';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const result = await listOpportunities(siteId, {
      type: searchParams.get('type') as OpportunityType | undefined,
      priority: searchParams.get('priority') as Priority | undefined,
      status: searchParams.get('status') as OpportunityStatus | undefined,
      aiGenerated: searchParams.get('aiGenerated') === 'true' ? true : searchParams.get('aiGenerated') === 'false' ? false : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list opportunities';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'analyze') {
      const body = await req.json();
      const { siteId } = body;
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

      const opportunities = await analyzeOpportunities(siteId);
      return NextResponse.json({ opportunities, count: opportunities.length });
    }

    // Standard create
    const body = await req.json();
    const { siteId, ...data } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    if (!data.type || !data.title || !data.description) {
      return NextResponse.json({ error: 'type, title, and description are required' }, { status: 400 });
    }

    const opportunity = await createOpportunity({ siteId, ...data });
    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create opportunity';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { evaluateRules } from '@/lib/growth/automation.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const body = await req.json();
    const { siteId, context } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const results = await evaluateRules(siteId, context);
    const triggered = results.filter((r) => r.triggered);

    return NextResponse.json({
      results,
      totalRules: results.length,
      triggeredCount: triggered.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to evaluate rules';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

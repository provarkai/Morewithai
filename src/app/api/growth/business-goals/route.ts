import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { evaluateGoals, generateBusinessStrategy } from '@/lib/growth/business-goals';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'strategy') {
      const strategy = await generateBusinessStrategy(siteId);
      return NextResponse.json(strategy);
    }

    const goals = await evaluateGoals(siteId);
    return NextResponse.json({ goals });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

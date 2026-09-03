import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { getPortfolioMetrics } from '@/lib/sites/portfolio';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const organizationId = searchParams.get('organizationId') || undefined;

    const metrics = await getPortfolioMetrics(organizationId);

    return NextResponse.json(metrics);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch portfolio metrics' }, { status: 500 });
  }
}

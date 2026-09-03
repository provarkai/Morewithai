import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { calculateSiteHealth } from '@/lib/sites/health';
import { db } from '@/lib/db';

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Fetch current site health data
    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { id: true, healthScore: true, healthScoreAt: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Determine if we need to recalculate
    const forceCalculate = action === 'calculate';
    const isStale =
      !site.healthScoreAt ||
      Date.now() - new Date(site.healthScoreAt).getTime() > ONE_HOUR_MS;

    if (forceCalculate || isStale) {
      const healthResult = await calculateSiteHealth(siteId);
      return NextResponse.json({
        healthScore: healthResult.overallScore,
        healthScoreAt: healthResult.evaluatedAt,
        dimensions: healthResult.dimensions,
      });
    }

    // Return cached data plus fresh dimensions
    const healthResult = await calculateSiteHealth(siteId);

    return NextResponse.json({
      healthScore: site.healthScore,
      healthScoreAt: site.healthScoreAt,
      dimensions: healthResult.dimensions,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const err = error as { status: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to fetch site health' }, { status: 500 });
  }
}

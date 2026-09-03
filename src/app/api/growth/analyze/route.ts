import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { analyzeOpportunities } from '@/lib/growth/opportunity.service';
import { generateRecommendations } from '@/lib/growth/recommendation.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const body = await req.json();
    const { siteId } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const opportunities = await analyzeOpportunities(siteId);
    const recommendations = await generateRecommendations(siteId);

    return NextResponse.json({
      opportunities,
      opportunityCount: opportunities.length,
      recommendations,
      recommendationCount: recommendations.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Comprehensive analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

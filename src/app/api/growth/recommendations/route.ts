import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createRecommendation, listRecommendations, generateRecommendations } from '@/lib/growth/recommendation.service';
import type { Priority, RecommendationStatus } from '@/lib/growth/types';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const result = await listRecommendations(siteId, {
      priority: searchParams.get('priority') as Priority | undefined,
      status: searchParams.get('status') as RecommendationStatus | undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list recommendations';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'generate') {
      const body = await req.json();
      const { siteId } = body;
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

      const recommendations = await generateRecommendations(siteId);
      return NextResponse.json({ recommendations, count: recommendations.length });
    }

    // Standard create
    const body = await req.json();
    const { siteId, ...data } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    if (!data.problem || !data.opportunity || !data.recommendedAction) {
      return NextResponse.json({ error: 'problem, opportunity, and recommendedAction are required' }, { status: 400 });
    }

    const recommendation = await createRecommendation({ siteId, ...data });
    return NextResponse.json(recommendation, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create recommendation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  recordEngagement,
  getArticleEngagement,
  getSiteEngagementSummary,
} from '@/lib/ai/engagement-scoring.service';

export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    const articleId = req.nextUrl.searchParams.get('articleId');
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    // Article-level engagement (requires auth)
    if (articleId) {
      await requirePermission('ai.analyze');
      const engagement = await getArticleEngagement(articleId, siteId, days);
      return NextResponse.json(engagement);
    }

    // Site-wide summary (requires auth)
    await requirePermission('ai.analyze');
    const summary = await getSiteEngagementSummary(siteId, days);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Record engagement event (public endpoint for frontend beacon)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articleId, siteId, visitorId, scrollDepth, timeOnPage, sessionId } = body;

    if (!articleId || !siteId || !visitorId) {
      return NextResponse.json({ error: 'articleId, siteId, visitorId required' }, { status: 400 });
    }

    const result = await recordEngagement({
      articleId,
      siteId,
      visitorId,
      scrollDepth: Math.min(100, Math.max(0, scrollDepth || 0)),
      timeOnPage: Math.max(0, timeOnPage || 0),
      sessionId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

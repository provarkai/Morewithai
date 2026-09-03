import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { repurposeArticleToFormats, getDistributionScores } from '@/lib/content-refresh/repurpose.service';

// GET — distribution scores for all articles
export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const scores = await getDistributionScores(siteId);
    return NextResponse.json({ scores, total: scores.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — repurpose a specific article into multiple formats
export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.edit');
    const body = await req.json();
    const { articleId, siteId } = body;

    if (!articleId || !siteId) {
      return NextResponse.json({ error: 'articleId and siteId are required' }, { status: 400 });
    }

    const result = await repurposeArticleToFormats(articleId, siteId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Repurposing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

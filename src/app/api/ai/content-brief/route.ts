import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { generateContentBrief, generateBriefFromArticle } from '@/lib/ai/content-brief.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const topic = req.nextUrl.searchParams.get('topic');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const articleId = req.nextUrl.searchParams.get('articleId');

    if (articleId && siteId) {
      const brief = await generateBriefFromArticle(articleId, siteId);
      return NextResponse.json(brief);
    }

    return NextResponse.json({ message: 'POST with topic, or GET with articleId+siteId' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { topic, siteId, targetAudience, brandVoice, niche } = body;
    if (!topic || !siteId) {
      return NextResponse.json({ error: 'topic and siteId required' }, { status: 400 });
    }
    const brief = await generateContentBrief(topic, siteId, { targetAudience, brandVoice, niche });
    return NextResponse.json(brief);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

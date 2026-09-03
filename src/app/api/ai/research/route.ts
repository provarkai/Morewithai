import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { researchArticle } from '@/lib/ai/editorial.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('ai.analyze');
    const { articleId, siteId } = await req.json();
    if (!articleId || !siteId) return NextResponse.json({ error: 'articleId and siteId required' }, { status: 400 });
    const result = await researchArticle(articleId, siteId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Research failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
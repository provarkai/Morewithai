import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { translateArticle, batchTranslate, getSupportedLanguages } from '@/lib/ai/translation.service';

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action');
    if (action === 'languages') {
      return NextResponse.json(getSupportedLanguages());
    }
    return NextResponse.json(getSupportedLanguages());
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, articleId, siteId, targetLanguage, targetLanguages } = body;
    if (!articleId || !siteId) {
      return NextResponse.json({ error: 'articleId and siteId required' }, { status: 400 });
    }

    if (action === 'batch' && Array.isArray(targetLanguages)) {
      const results = await batchTranslate(articleId, siteId, targetLanguages);
      return NextResponse.json({ translations: results });
    }

    if (!targetLanguage) {
      return NextResponse.json({ error: 'targetLanguage required' }, { status: 400 });
    }

    const translation = await translateArticle(articleId, siteId, targetLanguage);
    return NextResponse.json(translation);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

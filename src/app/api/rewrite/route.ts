import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { rewriteArticleWithSEO, batchRewriteWithSEO } from '@/lib/services/rewrite.service';

export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.edit');
    const body = await req.json();
    const { articleId, rewriteAll, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (rewriteAll) {
      const articles = await db.article.findMany({ where: { status: 'fetched', siteId } });

      if (articles.length === 0) {
        return NextResponse.json({ message: 'No fetched articles to rewrite', success: 0, failed: 0 });
      }

      const result = await batchRewriteWithSEO(
        articles.map((a) => ({
          id: a.id,
          originalTitle: a.originalTitle,
          originalContent: a.originalContent,
        })),
      );

      return NextResponse.json({
        message: `Rewrote ${result.success} articles, ${result.failed} failed`,
        success: result.success,
        failed: result.failed,
      });
    }

    if (!articleId) {
      return NextResponse.json({ error: 'articleId or rewriteAll is required' }, { status: 400 });
    }

    const article = await db.article.findFirst({ where: { id: articleId, siteId } });
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    const result = await rewriteArticleWithSEO(article.id, article.originalTitle, article.originalContent);
    if (result) return NextResponse.json({ message: 'Article rewritten successfully with SEO metadata' });
    return NextResponse.json({ error: 'Failed to rewrite article' }, { status: 500 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to rewrite';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message.includes('401') ? 401 : 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { fetchAllFeeds } from '@/lib/services/fetch.service';
import { batchRewriteWithSEO } from '@/lib/services/rewrite.service';
import { batchPublishArticles } from '@/lib/services/publish.service';

// GET automation logs for a site
export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const logs = await db.automationLog.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message.includes('401') ? 401 : 500 });
  }
}

// POST run automation pipeline using shared services
export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.edit');
    const body = await req.json();
    const { step, siteId } = body; // 'all', 'fetch', 'rewrite', 'publish'

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const results: Record<string, string> = {};

    if (step === 'all' || step === 'fetch') {
      const fetchResult = await fetchAllFeeds(siteId);
      const status = fetchResult.errors === 0 ? 'success' : 'partial';
      const message = `Fetched ${fetchResult.totalFetched} articles from ${fetchResult.feedCount} feeds${fetchResult.errors > 0 ? `, ${fetchResult.errors} errors` : ''}`;

      await db.automationLog.create({
        data: { action: 'fetch', status, message, siteId },
      });
      results.fetch = message;
    }

    if (step === 'all' || step === 'rewrite') {
      const articles = await db.article.findMany({ where: { status: 'fetched', siteId } });

      if (articles.length === 0) {
        results.rewrite = 'No fetched articles to rewrite';
      } else {
        const rewriteResult = await batchRewriteWithSEO(
          articles.map((a) => ({
            id: a.id,
            originalTitle: a.originalTitle,
            originalContent: a.originalContent,
          })),
        );
        const status = rewriteResult.failed === 0 ? 'success' : 'partial';
        const message = `Rewrote ${rewriteResult.success} articles${rewriteResult.failed > 0 ? `, ${rewriteResult.failed} failed` : ''}`;

        await db.automationLog.create({
          data: { action: 'rewrite', status, message, siteId },
        });
        results.rewrite = message;
      }
    }

    if (step === 'all' || step === 'publish') {
      const articles = await db.article.findMany({ where: { status: 'approved', siteId } });

      if (articles.length === 0) {
        results.publish = 'No approved articles to publish';
      } else {
        const articleIds = articles.map((a) => a.id);
        const publishResult = await batchPublishArticles(articleIds);
        const status = publishResult.failed === 0 ? 'success' : 'partial';
        const message = `Published ${publishResult.success} articles${publishResult.failed > 0 ? `, ${publishResult.failed} failed` : ''}`;

        await db.automationLog.create({
          data: { action: 'publish', status, message, siteId },
        });
        results.publish = message;
      }
    }

    return NextResponse.json({ message: `Automation ${step} completed`, results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Automation failed';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message.includes('401') ? 401 : 500 });
  }
}

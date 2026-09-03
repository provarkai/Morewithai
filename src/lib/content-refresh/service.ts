import { db } from '@/lib/db';
import { refreshArticleContent } from '@/lib/ai/refresh.service';
import { getDueRefreshArticles } from './detector';

/**
 * Execute refresh for a single article (manual trigger).
 */
export async function executeRefresh(articleId: string, siteId: string, reason = 'MANUAL') {
  return refreshArticleContent(articleId, siteId, reason);
}

/**
 * Run the scheduled refresh check — find due articles and refresh them.
 * Designed to be called by the cron scheduler.
 */
export async function runScheduledRefreshCheck(siteId?: string) {
  const sites = siteId
    ? [{ id: siteId }]
    : await db.site.findMany({ where: { isActive: true }, select: { id: true } });

  const results = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  for (const site of sites) {
    const dueArticles = await getDueRefreshArticles(site.id);
    for (const article of dueArticles) {
      results.processed++;
      try {
        const result = await refreshArticleContent(article.id, site.id, 'SCHEDULED');
        if (result.updated) {
          results.succeeded++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.failed++;
        console.error(`[Refresh] Failed for article ${article.id}:`, error);
      }
    }
  }

  return results;
}

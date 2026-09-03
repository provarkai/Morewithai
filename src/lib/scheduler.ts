import cron from 'node-cron';
import { db } from '@/lib/db';
import { publishArticle } from '@/lib/services/publish.service';
import { fetchAllFeeds } from '@/lib/services/fetch.service';
import { runScheduledRefreshCheck } from '@/lib/content-refresh/service';
import { runDailyGrowthReview } from '@/lib/growth/automation.service';
import { log } from '@/lib/logger';

let scheduled = false;

export function startScheduler() {
  if (scheduled) return;
  scheduled = true;
  log.info('[Scheduler] Starting background scheduler...');

  // Every 5 minutes: publish due scheduled articles across all sites
  cron.schedule('*/5 * * * *', async () => {
    try {
      const dueArticles = await db.article.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: { lte: new Date() },
        },
      });

      if (dueArticles.length === 0) return;

      let success = 0;
      let failed = 0;

      for (const article of dueArticles) {
        const result = await publishArticle(article.id);
        if (result) success++;
        else failed++;
      }

      // Group by siteId for logging
      const siteGroups = new Map<string, { success: number; failed: number }>();
      for (const article of dueArticles) {
        const existing = siteGroups.get(article.siteId) || { success: 0, failed: 0 };
        siteGroups.set(article.siteId, existing);
      }

      // Log per site
      for (const [siteId] of siteGroups) {
        await db.automationLog.create({
          data: {
            action: 'scheduled-publish',
            status: failed === 0 ? 'success' : 'partial',
            message: `Auto-published ${success} scheduled articles${failed > 0 ? `, ${failed} failed` : ''}`,
            siteId,
          },
        });
      }

      log.info(`[Scheduler] Done: ${success} published, ${failed} failed`);
    } catch (error) {
      // Logged via automation log, not console
    }
  });

  // Daily at 3 AM: check articles due for content refresh
  cron.schedule('0 3 * * *', async () => {
    try {
      const results = await runScheduledRefreshCheck();
      log.info(`[Scheduler] Refresh check: ${results.succeeded} refreshed, ${results.skipped} skipped, ${results.failed} failed`);
    } catch {
      // Non-blocking — will retry next day
    }
  });

  // Daily at 4 AM: run daily growth review across all active sites
  cron.schedule('0 4 * * *', async () => {
    try {
      const results = await runDailyGrowthReview();
      log.info(`[Scheduler] Growth review: ${results.length} sites processed`);
    } catch {
      // Non-blocking — will retry next day
    }
  });

  // Every 6 hours: auto-fetch RSS feeds for all active sites
  cron.schedule('0 */6 * * *', async () => {
    try {
      const sites = await db.site.findMany({ where: { isActive: true } });
      let totalFetched = 0;
      let errors = 0;

      for (const site of sites) {
        try {
          const result = await fetchAllFeeds(site.id);
          totalFetched += result.totalFetched;
          errors += result.errors;

          if (result.totalFetched > 0) {
            await db.automationLog.create({
              data: {
                action: 'auto-fetch',
                status: result.errors === 0 ? 'success' : 'partial',
                message: `Auto-fetched ${result.totalFetched} articles from ${result.feedCount} feeds${result.errors > 0 ? `, ${result.errors} errors` : ''}`,
                siteId: site.id,
              },
            });
          }
        } catch {
          errors++;
        }
      }

      if (totalFetched > 0 || errors > 0) {
        log.info(`[Scheduler] Auto-fetch: ${totalFetched} articles, ${errors} errors across ${sites.length} sites`);
      }
    } catch {
      // Non-blocking — will retry on next cycle
    }
  });

  log.info('[Scheduler] Background scheduler active (publish: 5min, auto-fetch: 6hr, refresh: daily 3AM, growth: daily 4AM)');
}
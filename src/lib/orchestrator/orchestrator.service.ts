import { db } from '@/lib/db';
import { createJob, startJob, completeJob, failJob, getJobStats, type JobType } from './queue.service';

/**
 * The orchestrator is the central coordinator for the content pipeline.
 * In production, this would be driven by a worker process.
 * For now, it provides the logic that can be called from API routes or cron.
 */

export async function orchestrateSite(siteId: string): Promise<{ jobsCreated: number; actions: string[] }> {
  const actions: string[] = [];
  let jobsCreated = 0;

  // 1. Find articles that need processing
  const needsResearch = await db.article.findMany({
    where: { siteId, status: 'fetched', originalContent: { not: '' } },
    take: 5,
    select: { id: true },
  });

  for (const article of needsResearch) {
    const existingJob = await db.contentJob.findFirst({
      where: { articleId: article.id, type: 'RESEARCH', status: { in: ['QUEUED', 'RUNNING'] } },
    });
    if (!existingJob) {
      await createJob({ siteId, articleId: article.id, type: 'RESEARCH', priority: 3 });
      jobsCreated++;
    }
  }
  actions.push(`Found ${needsResearch.length} articles needing research`);

  // 2. Find articles ready for publishing
  const readyToPublish = await db.article.findMany({
    where: { siteId, status: 'approved' },
    take: 5,
    select: { id: true },
  });

  for (const article of readyToPublish) {
    await createJob({ siteId, articleId: article.id, type: 'PUBLISH', priority: 2 });
    jobsCreated++;
  }
  if (readyToPublish.length > 0) actions.push(`Queued ${readyToPublish.length} articles for publishing`);

  // 3. Find articles needing refresh
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const needsRefresh = await db.article.findMany({
    where: {
      siteId, status: 'published',
      publishedAt: { lt: thirtyDaysAgo },
      refreshRecords: { none: { status: { in: ['PENDING', 'IN_PROGRESS'] } } },
    },
    take: 3,
    select: { id: true },
  });

  for (const article of needsRefresh) {
    await createJob({ siteId, articleId: article.id, type: 'REFRESH', priority: 6 });
    jobsCreated++;
  }
  if (needsRefresh.length > 0) actions.push(`Queued ${needsRefresh.length} articles for refresh`);

  return { jobsCreated, actions };
}

export async function getNextJobs(siteId: string, limit: number = 5) {
  return db.contentJob.findMany({
    where: { siteId, status: 'QUEUED', scheduledAt: { lte: new Date() } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    include: { article: { select: { id: true, title: true, rewrittenTitle: true, status: true } } },
  });
}

export async function getOrchestratorStatus(siteId: string) {
  const stats = await getJobStats(siteId);
  const recentJobs = await db.contentJob.findMany({
    where: { siteId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: { id: true, type: true, status: true, priority: true, createdAt: true, completedAt: true, article: { select: { title: true, rewrittenTitle: true } } },
  });

  return { stats, recentJobs };
}

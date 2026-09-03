import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type JobType = 'RESEARCH' | 'OUTLINE' | 'GENERATE' | 'SEO' | 'QUALITY' | 'INTERNAL_LINKS' | 'TAXONOMY' | 'REFRESH_ANALYSIS' | 'REFRESH_GENERATE';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface JobListParams {
  siteId: string;
  type?: string;
  status?: string;
  articleId?: string;
  page?: number;
  limit?: number;
}

interface JobStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costByType: Record<string, number>;
  recentFailures: Array<{ id: string; type: string; error: string | null; createdAt: string }>;
}

/**
 * List AI jobs with filtering and pagination.
 */
export async function listJobs(params: JobListParams) {
  const { siteId, type, status, articleId, page = 1, limit = 20 } = params;
  const where: Prisma.AiJobWhereInput = { siteId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (articleId) where.articleId = articleId;

  const [jobs, total] = await Promise.all([
    db.aiJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        article: { select: { id: true, title: true } },
      },
    }),
    db.aiJob.count({ where }),
  ]);

  return { jobs, total, page, limit };
}

/**
 * Get aggregated AI job statistics for a site.
 */
export async function getJobStats(siteId: string): Promise<JobStats> {
  const where = { siteId };

  const [
    totalJobs,
    completedJobs,
    failedJobs,
    runningJobs,
    costAgg,
    recentFailures,
    costByTypeRaw,
  ] = await Promise.all([
    db.aiJob.count({ where }),
    db.aiJob.count({ where: { ...where, status: 'COMPLETED' } }),
    db.aiJob.count({ where: { ...where, status: 'FAILED' } }),
    db.aiJob.count({ where: { ...where, status: 'RUNNING' } }),
    db.aiJob.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
    }),
    db.aiJob.findMany({
      where: { ...where, status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, type: true, error: true, createdAt: true },
    }),
    db.aiJob.groupBy({
      by: ['type'],
      where: { ...where, status: 'COMPLETED' },
      _sum: { estimatedCost: true },
    }),
  ]);

  const costByType: Record<string, number> = {};
  for (const row of costByTypeRaw) {
    costByType[row.type] = row._sum.estimatedCost || 0;
  }

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    runningJobs,
    totalCost: costAgg._sum.estimatedCost || 0,
    totalInputTokens: costAgg._sum.inputTokens || 0,
    totalOutputTokens: costAgg._sum.outputTokens || 0,
    costByType,
    recentFailures: recentFailures.map((f) => ({
      id: f.id,
      type: f.type,
      error: f.error,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

/**
 * Retry a failed AI job. Max 3 total attempts (original + 2 retries).
 */
export async function retryJob(jobId: string) {
  const job = await db.aiJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (job.status !== 'FAILED') throw new Error('Only failed jobs can be retried');
  if (job.retryCount >= 3) throw new Error('Job has reached maximum retry limit (3)');

  const updated = await db.aiJob.update({
    where: { id: jobId },
    data: {
      status: 'QUEUED',
      retryCount: job.retryCount + 1,
      error: null,
      startedAt: null,
      completedAt: null,
    },
  });

  return updated;
}

/**
 * Cancel a queued or running job.
 */
export async function cancelJob(jobId: string) {
  const job = await db.aiJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (job.status !== 'QUEUED' && job.status !== 'RUNNING') {
    throw new Error('Only queued or running jobs can be cancelled');
  }

  return db.aiJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });
}
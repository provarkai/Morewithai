import { db } from '@/lib/db';

export type JobType = 'RESEARCH' | 'OUTLINE' | 'GENERATE' | 'SEO' | 'QUALITY' | 'LINK' | 'MONETIZATION' | 'PUBLISH' | 'PROMOTE' | 'REFRESH' | 'ANALYZE';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface CreateJobInput {
  siteId: string;
  articleId?: string;
  type: JobType;
  priority?: number;
  scheduledAt?: Date;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createJob(data: CreateJobInput) {
  return db.contentJob.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId,
      type: data.type,
      priority: data.priority ?? 5,
      scheduledAt: data.scheduledAt,
      input: data.input ? JSON.stringify(data.input) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      status: 'QUEUED',
    },
  });
}

export async function createPipeline(siteId: string, articleId: string, options?: { startAt?: JobType; skipTypes?: JobType[] }) {
  const defaultPipeline: JobType[] = ['RESEARCH', 'OUTLINE', 'GENERATE', 'SEO', 'QUALITY', 'LINK', 'MONETIZATION', 'PUBLISH', 'PROMOTE'];
  let pipeline = defaultPipeline;
  if (options?.startAt) pipeline = pipeline.slice(pipeline.indexOf(options.startAt));
  if (options?.skipTypes) pipeline = pipeline.filter(t => !options.skipTypes!.includes(t));

  const jobs: any[] = [];
  for (let i = 0; i < pipeline.length; i++) {
    const job = await (db as any).contentJob.create({
      data: {
        siteId,
        articleId,
        type: pipeline[i],
        priority: Math.max(1, 5 - i),
        status: 'QUEUED',
        metadata: JSON.stringify({ pipelineIndex: i, pipelineTotal: pipeline.length, pipeline }),
      },
    });
    jobs.push(job);
  }
  return jobs;
}

export async function listJobs(siteId: string, filters?: { status?: string; type?: string; articleId?: string; page?: number; limit?: number }) {
  const where: Record<string, unknown> = { siteId };
  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;
  if (filters?.articleId) where.articleId = filters.articleId;

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    db.contentJob.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true, rewrittenTitle: true } } },
    }),
    db.contentJob.count({ where }),
  ]);

  return { jobs, total, page, limit };
}

export async function startJob(jobId: string, siteId: string) {
  return (db as any).contentJob.update({
    where: { id: jobId, siteId, status: 'QUEUED' },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
}

export async function completeJob(jobId: string, siteId: string, output?: Record<string, unknown>) {
  const job = await db.contentJob.findFirst({ where: { id: jobId, siteId } });
  if (!job) throw new Error('Job not found');

  return (db as any).contentJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      output: output ? JSON.stringify(output) : null,
      durationMs: job.startedAt ? Date.now() - job.startedAt.getTime() : null,
    },
  });
}

export async function failJob(jobId: string, siteId: string, error: string) {
  const job = await db.contentJob.findFirst({ where: { id: jobId, siteId } });
  if (!job) throw new Error('Job not found');

  const newRetryCount = job.retryCount + 1;
  const shouldRetry = newRetryCount <= job.maxRetries;

  const updated = await db.contentJob.update({
    where: { id: jobId },
    data: {
      status: shouldRetry ? 'QUEUED' : 'FAILED',
      retryCount: newRetryCount,
      error,
      completedAt: shouldRetry ? undefined : new Date(),
      durationMs: job.startedAt ? Date.now() - job.startedAt.getTime() : null,
    },
  });

  return { ...updated, willRetry: shouldRetry };
}

export async function cancelJob(jobId: string, siteId: string) {
  return (db as any).contentJob.update({
    where: { id: jobId, siteId },
    data: { status: 'CANCELLED' },
  });
}

export async function getJobStats(siteId: string) {
  const [queued, running, completed, failed, cancelled, byType] = await Promise.all([
    db.contentJob.count({ where: { siteId, status: 'QUEUED' } }),
    db.contentJob.count({ where: { siteId, status: 'RUNNING' } }),
    db.contentJob.count({ where: { siteId, status: 'COMPLETED' } }),
    db.contentJob.count({ where: { siteId, status: 'FAILED' } }),
    db.contentJob.count({ where: { siteId, status: 'CANCELLED' } }),
    db.contentJob.groupBy({ by: ['type'], where: { siteId }, _count: true }),
  ]);

  return { queued, running, completed, failed, cancelled, total: queued + running + completed + failed + cancelled, byType };
}

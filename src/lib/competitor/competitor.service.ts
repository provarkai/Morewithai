import { db } from '@/lib/db';

// ─── CRUD ────────────────────────────────────────────────────

export interface CreateCompetitorInput {
  organizationId: string;
  siteId: string;
  name: string;
  domain: string;
}

export async function createCompetitor(input: CreateCompetitorInput) {
  return db.competitor.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId,
      name: input.name,
      domain: input.domain,
    },
  });
}

export async function listCompetitors(organizationId: string, siteId?: string) {
  return db.competitor.findMany({
    where: {
      organizationId,
      ...(siteId ? { siteId } : {}),
      status: 'ACTIVE',
    },
    include: {
      _count: { select: { pages: true, competitorChanges: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getCompetitor(id: string) {
  return db.competitor.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { updatedAt: 'desc' }, take: 50 },
      _count: { select: { pages: true, competitorChanges: true } },
    },
  });
}

export async function deleteCompetitor(id: string) {
  return db.competitor.delete({ where: { id } });
}

// ─── Pages ───────────────────────────────────────────────────

export interface UpsertCompetitorPageInput {
  competitorId: string;
  url: string;
  title?: string;
  topic?: string;
  metadata?: Record<string, unknown>;
}

export async function upsertCompetitorPage(input: UpsertCompetitorPageInput) {
  return db.competitorPage.upsert({
    where: { competitorId_url: { competitorId: input.competitorId, url: input.url } },
    update: {
      title: input.title,
      topic: input.topic,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      lastCheckedAt: new Date(),
    },
    create: {
      competitorId: input.competitorId,
      url: input.url,
      title: input.title,
      topic: input.topic,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      lastCheckedAt: new Date(),
    },
  });
}

// ─── Changes ─────────────────────────────────────────────────

export interface RecordChangeInput {
  competitorId: string;
  pageId: string;
  changeType: string;
  metadata?: Record<string, unknown>;
}

export async function recordCompetitorChange(input: RecordChangeInput) {
  return db.competitorChange.create({
    data: {
      competitorId: input.competitorId,
      pageId: input.pageId,
      changeType: input.changeType,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    },
  });
}

export async function getRecentChanges(organizationId: string, limit = 20) {
  return db.competitorChange.findMany({
    where: { competitor: { organizationId } },
    orderBy: { detectedAt: 'desc' },
    take: limit,
    include: {
      competitor: { select: { id: true, name: true, domain: true } },
      page: { select: { id: true, url: true, title: true } },
    },
  });
}

// ─── Stats ───────────────────────────────────────────────────

export async function getCompetitorStats(organizationId: string) {
  const [competitors, totalPages, recentChanges] = await Promise.all([
    db.competitor.count({ where: { organizationId, status: 'ACTIVE' } }),
    db.competitorPage.count({ where: { competitor: { organizationId } } }),
    db.competitorChange.count({
      where: {
        competitor: { organizationId },
        detectedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
  ]);

  return { competitors, totalPages, recentChanges };
}

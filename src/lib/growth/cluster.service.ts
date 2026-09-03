import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';
import type { CreateClusterInput, UpdateClusterInput, ClusterFilters } from './types';

// ─── CRUD ─────────────────────────────────────────────────────

export async function createCluster(data: CreateClusterInput) {
  return db.$transaction(async (tx) => {
    const cluster = await tx.topicCluster.create({
      data: {
        siteId: data.siteId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        pillarArticleId: data.pillarArticleId ?? null,
      },
    });

    if (data.pillarArticleId) {
      await tx.clusterArticle.create({
        data: {
          clusterId: cluster.id,
          articleId: data.pillarArticleId,
          role: 'PILLAR',
          position: 0,
        },
      });
      await tx.topicCluster.update({
        where: { id: cluster.id },
        data: { articleCount: 1 },
      });
    }

    return cluster;
  });
}

export async function listClusters(siteId: string, filters?: ClusterFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.status) where.status = filters.status;

  const [data, total] = await Promise.all([
    db.topicCluster.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        pillarArticle: { select: { id: true, title: true } },
        _count: { select: { clusterArticles: true } },
      },
    }),
    db.topicCluster.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCluster(id: string, siteId: string) {
  return db.topicCluster.findFirst({
    where: { id, siteId },
    include: {
      pillarArticle: { select: { id: true, title: true, slug: true } },
      clusterArticles: {
        orderBy: { position: 'asc' },
        include: { article: { select: { id: true, title: true, slug: true, status: true } } },
      },
    },
  });
}

export async function updateCluster(id: string, siteId: string, data: UpdateClusterInput) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.pillarArticleId !== undefined) {
    updateData.pillarArticleId = data.pillarArticleId;
  }

  return db.topicCluster.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteCluster(id: string, siteId: string) {
  return db.$transaction(async (tx) => {
    await tx.clusterArticle.deleteMany({ where: { clusterId: id } });
    return tx.topicCluster.delete({ where: { id, siteId } });
  });
}

// ─── Cluster Articles ─────────────────────────────────────────

export async function addArticleToCluster(
  clusterId: string,
  articleId: string,
  role: string = 'SUPPORTING',
  position?: number
) {
  const cluster = await db.topicCluster.findUnique({ where: { id: clusterId } });
  if (!cluster) throw new Error('Cluster not found');

  const existing = await db.clusterArticle.findUnique({
    where: { clusterId_articleId: { clusterId, articleId } },
  });
  if (existing) throw new Error('Article already in cluster');

  const pos = position ?? (await db.clusterArticle.count({ where: { clusterId } }));

  const clusterArticle = await db.clusterArticle.create({
    data: { clusterId, articleId, role, position: pos },
  });

  await db.topicCluster.update({
    where: { id: clusterId },
    data: { articleCount: { increment: 1 } },
  });

  return clusterArticle;
}

export async function removeArticleFromCluster(clusterId: string, articleId: string) {
  const deleted = await db.clusterArticle.delete({
    where: { clusterId_articleId: { clusterId, articleId } },
  });

  await db.topicCluster.update({
    where: { id: clusterId },
    data: { articleCount: { decrement: 1 } },
  });

  return deleted;
}

// ─── Metrics ──────────────────────────────────────────────────

export async function updateClusterMetrics(clusterId: string) {
  const cluster = await db.topicCluster.findUnique({ where: { id: clusterId } });
  if (!cluster) throw new Error('Cluster not found');

  const clusterArticles = await db.clusterArticle.findMany({
    where: { clusterId },
    include: {
      article: {
        include: {
          trafficMetrics: { select: { pageViews: true } },
          searchMetrics: { select: { position: true } },
        },
      },
    },
  });

  // Total traffic
  const totalTraffic = clusterArticles.reduce((sum, ca) => {
    return sum + ca.article.trafficMetrics.reduce((s, m) => s + m.pageViews, 0);
  }, 0);

  // Average position
  const allPositions: number[] = [];
  for (const ca of clusterArticles) {
    for (const sm of ca.article.searchMetrics) {
      if (sm.position > 0) allPositions.push(sm.position);
    }
  }
  const avgPosition = allPositions.length > 0
    ? allPositions.reduce((s, p) => s + p, 0) / allPositions.length
    : 0;

  // Authority score
  const authorityScore = await calculateAuthorityScore(clusterId);

  return db.topicCluster.update({
    where: { id: clusterId },
    data: {
      articleCount: clusterArticles.length,
      totalTraffic,
      avgPosition,
      authorityScore,
    },
  });
}

// ─── Authority Score ──────────────────────────────────────────

export async function calculateAuthorityScore(clusterId: string): Promise<number> {
  const clusterArticles = await db.clusterArticle.findMany({
    where: { clusterId },
    include: {
      article: {
        select: {
          id: true, wordCount: true, qualityScore: true,
          searchMetrics: { select: { position: true, impressions: true } },
          contentScore: { select: { overallScore: true, depthScore: true } },
        },
      },
    },
  });

  if (clusterArticles.length === 0) return 0;

  // Coverage (0-25): based on number of articles (estimate ~10 is ideal)
  const coverage = Math.min(25, Math.round((clusterArticles.length / 10) * 25));

  // Depth (0-25): avg word count / quality
  const avgWordCount = clusterArticles.reduce((s, ca) => s + (ca.article.wordCount ?? 0), 0) / clusterArticles.length;
  const avgQuality = clusterArticles.reduce((s, ca) => s + (ca.article.qualityScore ?? 0), 0) / clusterArticles.length;
  const depthScore = Math.min(25, Math.round(((avgWordCount / 2000) * 0.5 + (avgQuality / 100) * 0.5) * 25));

  // Internal linking (0-25): hard to compute exactly without content analysis, use article count as proxy
  const linkingScore = Math.min(25, Math.round((clusterArticles.length / 8) * 25));

  // Search visibility (0-25): avg position, lower is better
  const allPositions: number[] = [];
  for (const ca of clusterArticles) {
    for (const sm of ca.article.searchMetrics) {
      if (sm.position > 0) allPositions.push(sm.position);
    }
  }
  const avgPos = allPositions.length > 0 ? allPositions.reduce((s, p) => s + p, 0) / allPositions.length : 50;
  const visibilityScore = Math.max(0, Math.round((1 - avgPos / 50) * 25));

  return Math.min(100, coverage + depthScore + linkingScore + visibilityScore);
}

// ─── Cluster Gaps (AI) ────────────────────────────────────────

export async function getClusterGaps(siteId: string, clusterId: string) {
  const cluster = await db.topicCluster.findUnique({
    where: { id: clusterId, siteId },
    include: {
      clusterArticles: {
        include: { article: { select: { id: true, title: true, primaryKeyword: true, secondaryKeywords: true } } },
      },
    },
  });

  if (!cluster) throw new Error('Cluster not found');

  const existingTopics = cluster.clusterArticles.map((ca) => ({
    title: ca.article.title,
    keywords: [ca.article.primaryKeyword, ca.article.secondaryKeywords].filter(Boolean).join(', '),
  }));

  const response = await callAI({
    siteId,
    jobType: 'CLUSTER_GAP_ANALYSIS',
    systemPrompt:
      'You are a content strategist. Based on the cluster name, description, and existing articles, identify 3-5 missing topic gaps that would strengthen this topic cluster. Return ONLY a valid JSON array with objects having "title" (string, suggested article title), "keywords" (string, suggested target keywords), "reason" (string, why this is needed) fields.',
    userPrompt: `Cluster: "${cluster.name}"
Description: ${cluster.description ?? 'N/A'}

Existing articles:
${JSON.stringify(existingTopics, null, 2)}`,
  });

  try {
    return JSON.parse(cleanAIResponse(response.content)) as Array<{
      title: string;
      keywords: string;
      reason: string;
    }>;
  } catch {
    return [];
  }
}

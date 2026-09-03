import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';
import type { CreateRecommendationInput, UpdateRecommendationInput, RecommendationFilters } from './types';

// ─── CRUD ─────────────────────────────────────────────────────

export async function createRecommendation(data: CreateRecommendationInput) {
  return db.growthRecommendation.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId ?? null,
      problem: data.problem,
      opportunity: data.opportunity,
      recommendedAction: data.recommendedAction,
      expectedImpact: data.expectedImpact ?? null,
      priority: data.priority ?? 'MEDIUM',
      aiGenerated: data.aiGenerated ?? false,
      metadata: data.metadata ?? null,
    },
  });
}

export async function listRecommendations(siteId: string, filters?: RecommendationFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.status) where.status = filters.status;

  const priorityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

  const [data, total] = await Promise.all([
    db.growthRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true, slug: true } } },
    }),
    db.growthRecommendation.count({ where }),
  ]);

  // Sort by priority desc then createdAt desc in JS since Prisma can't do custom enum ordering
  const sorted = data.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 0;
    const pb = priorityOrder[b.priority] ?? 0;
    if (pb !== pa) return pb - pa;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    data: sorted,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getRecommendation(id: string, siteId: string) {
  return db.growthRecommendation.findFirst({
    where: { id, siteId },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
}

export async function updateRecommendation(id: string, siteId: string, data: UpdateRecommendationInput) {
  const updateData: Record<string, unknown> = {};
  if (data.problem !== undefined) updateData.problem = data.problem;
  if (data.opportunity !== undefined) updateData.opportunity = data.opportunity;
  if (data.recommendedAction !== undefined) updateData.recommendedAction = data.recommendedAction;
  if (data.expectedImpact !== undefined) updateData.expectedImpact = data.expectedImpact;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  return db.growthRecommendation.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteRecommendation(id: string, siteId: string) {
  return db.growthRecommendation.delete({ where: { id, siteId } });
}

// ─── AI Recommendation Generation ─────────────────────────────

export async function generateRecommendations(siteId: string) {
  // 1. Get open ContentOpportunities
  const opportunities = await db.contentOpportunity.findMany({
    where: { siteId, status: 'OPEN' },
    orderBy: { priority: 'desc' },
    take: 20,
    include: { article: { select: { id: true, title: true } } },
  });

  if (opportunities.length === 0) {
    return [];
  }

  // 2. Get site metrics
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [trafficStats, conversionStats, revenueStats] = await Promise.all([
    db.trafficMetric.aggregate({
      where: { siteId, date: { gte: thirtyDaysAgo } },
      _sum: { pageViews: true, sessions: true, users: true },
    }),
    db.conversionEvent.aggregate({
      where: { siteId, createdAt: { gte: thirtyDaysAgo } },
      _count: true,
      _sum: { value: true },
    }),
    db.revenueEvent.aggregate({
      where: { siteId, createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
  ]);

  const metricsContext = {
    last30Days: {
      totalPageViews: trafficStats._sum.pageViews ?? 0,
      totalSessions: trafficStats._sum.sessions ?? 0,
      totalConversions: conversionStats._count,
      totalRevenue: revenueStats._sum.amount ?? 0,
    },
    openOpportunities: opportunities.map((o) => ({
      type: o.type,
      title: o.title,
      priority: o.priority,
      articleTitle: o.article?.title,
    })),
  };

  // 3. Call AI
  const response = await callAI({
    siteId,
    jobType: 'RECOMMENDATION_GENERATION',
    systemPrompt:
      'You are a content growth strategist. Based on the provided content opportunities and site metrics, generate the top 5 growth recommendations. For each recommendation provide: problem, opportunity, recommendedAction, expectedImpact, and priority (LOW/MEDIUM/HIGH/CRITICAL). Return ONLY a valid JSON array with exactly these fields.',
    userPrompt: `Here are the current content opportunities and site metrics:\n\n${JSON.stringify(metricsContext, null, 2)}`,
  });

  // 4. Parse AI response
  let recommendations: Array<{
    problem: string;
    opportunity: string;
    recommendedAction: string;
    expectedImpact?: string;
    priority: string;
  }>;

  try {
    const parsed = JSON.parse(cleanAIResponse(response.content));
    recommendations = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    recommendations = [];
  }

  // 5. Create GrowthRecommendation records
  const created = await Promise.all(
    recommendations.map((rec) =>
      createRecommendation({
        siteId,
        problem: rec.problem,
        opportunity: rec.opportunity,
        recommendedAction: rec.recommendedAction,
        expectedImpact: rec.expectedImpact,
        priority: (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rec.priority) ? rec.priority : 'MEDIUM') as any,
        aiGenerated: true,
      })
    )
  );

  return created;
}

import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';
import type { CreateOpportunityInput, UpdateOpportunityInput, OpportunityFilters, Priority } from './types';

// ─── CRUD ─────────────────────────────────────────────────────

export async function createOpportunity(data: CreateOpportunityInput) {
  return db.contentOpportunity.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId ?? null,
      type: data.type,
      title: data.title,
      description: data.description,
      expectedImpact: data.expectedImpact ?? null,
      priority: data.priority ?? 'MEDIUM',
      aiGenerated: data.aiGenerated ?? false,
      metadata: data.metadata ?? null,
    },
  });
}

export async function listOpportunities(siteId: string, filters?: OpportunityFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.type) where.type = filters.type;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.status) where.status = filters.status;
  if (filters?.aiGenerated !== undefined) where.aiGenerated = filters.aiGenerated;

  const [data, total] = await Promise.all([
    db.contentOpportunity.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true, slug: true } } },
    }),
    db.contentOpportunity.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getOpportunity(id: string, siteId: string) {
  return db.contentOpportunity.findFirst({
    where: { id, siteId },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
}

export async function updateOpportunity(id: string, siteId: string, data: UpdateOpportunityInput) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.expectedImpact !== undefined) updateData.expectedImpact = data.expectedImpact;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  return db.contentOpportunity.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteOpportunity(id: string, siteId: string) {
  return db.contentOpportunity.delete({ where: { id, siteId } });
}

// ─── AI Opportunity Analysis ──────────────────────────────────

interface RuleOpportunity {
  articleId: string;
  articleTitle: string;
  type: string;
  title: string;
  priority: Priority;
  context: Record<string, unknown>;
}

export async function analyzeOpportunities(siteId: string) {
  // 1. Get all published articles with metrics
  const articles = await db.article.findMany({
    where: { siteId, status: 'published' },
    include: {
      trafficMetrics: { select: { pageViews: true, date: true } },
      searchMetrics: { select: { position: true, ctr: true, impressions: true, clicks: true, date: true } },
      ctaPlacements: { select: { id: true, ctaId: true, isActive: true } },
      revenueEvents: { select: { amount: true, sourceType: true } },
      conversionEvents: { select: { eventType: true, value: true } },
      category: { select: { id: true, name: true } },
      affiliateClicks: { select: { id: true } },
    },
  });

  // Get affiliate offers for monetization matching
  const affiliateOffers = await db.affiliateOffer.findMany({
    where: { siteId, status: 'ACTIVE' },
    select: { id: true, category: true, name: true },
  });

  const now = new Date();
  const ruleOpportunities: RuleOpportunity[] = [];

  for (const article of articles) {
    // Aggregate traffic (latest 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentTraffic = article.trafficMetrics
      .filter((m) => new Date(m.date) >= thirtyDaysAgo)
      .reduce((sum, m) => sum + m.pageViews, 0);
    const totalTraffic = article.trafficMetrics.reduce((sum, m) => sum + m.pageViews, 0);

    // Aggregate search metrics (latest)
    const latestSearch = article.searchMetrics.length > 0
      ? article.searchMetrics.reduce((best, m) => new Date(m.date) > new Date(best.date) ? m : best)
      : null;

    const avgPosition = latestSearch?.position ?? 0;
    const avgCtr = latestSearch?.ctr ?? 0;

    const hasCTAs = article.ctaPlacements.some((p) => p.isActive);
    const hasRevenue = article.revenueEvents.length > 0;
    const totalRevenue = article.revenueEvents.reduce((sum, e) => sum + e.amount, 0);
    const hasAffiliateClicks = article.affiliateClicks.length > 0;
    const conversionCount = article.conversionEvents.length;
    const conversionRate = recentTraffic > 0 ? conversionCount / recentTraffic : 0;

    // Published date for age check
    const publishedAt = article.publishedAt ? new Date(article.publishedAt) : null;
    const daysSincePublish = publishedAt ? Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Category-based affiliate matching
    const articleCategory = article.category?.name?.toLowerCase() ?? '';
    const matchingOffers = affiliateOffers.filter((o) => {
      if (!o.category) return false;
      return articleCategory.includes(o.category.toLowerCase()) || o.category.toLowerCase().includes(articleCategory);
    });

    // ── Rule 1: High traffic + no CTAs → CONVERSION ──
    if (recentTraffic > 1000 && !hasCTAs) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'CONVERSION',
        title: `Add CTAs to high-traffic article: ${article.title}`,
        priority: 'HIGH',
        context: { recentTraffic, conversionRate },
      });
    }

    // ── Rule 2: High traffic + category-matching affiliate offers → MONETIZE ──
    if (recentTraffic > 1000 && matchingOffers.length > 0 && !hasAffiliateClicks) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'MONETIZE',
        title: `Add affiliate links to: ${article.title}`,
        priority: 'HIGH',
        context: { recentTraffic, matchingOfferCount: matchingOffers.length },
      });
    }

    // ── Rule 3: High ranking + low CTR → SEO ──
    if (avgPosition < 10 && avgPosition > 0 && avgCtr < 0.05) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'SEO',
        title: `Improve CTR for ranking article: ${article.title}`,
        priority: 'MEDIUM',
        context: { avgPosition, avgCtr },
      });
    }

    // ── Rule 4: Position 5-20 → SEO with title/meta recommendation ──
    if (avgPosition >= 5 && avgPosition <= 20) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'SEO',
        title: `Push to page 1: ${article.title} (position ${avgPosition.toFixed(1)})`,
        priority: 'HIGH',
        context: { avgPosition, avgCtr },
      });
    }

    // ── Rule 5: Old article + declining traffic → UPDATE ──
    if (daysSincePublish > 90 && recentTraffic < totalTraffic * 0.5 && totalTraffic > 500) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'UPDATE',
        title: `Refresh declining article: ${article.title}`,
        priority: 'MEDIUM',
        context: { daysSincePublish, recentTraffic, totalTraffic },
      });
    }

    // ── Rule 6: High conversion rate + low traffic → NEW_TOPIC (promote) ──
    if (conversionRate > 0.02 && recentTraffic < 500 && conversionCount > 0) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'NEW_TOPIC',
        title: `Promote high-converting article: ${article.title}`,
        priority: 'HIGH',
        context: { conversionRate, recentTraffic, conversionCount },
      });
    }

    // ── Rule 7: High traffic + no monetization → MONETIZE CRITICAL ──
    if (recentTraffic > 1000 && !hasRevenue && !hasAffiliateClicks && !hasCTAs) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'MONETIZE',
        title: `Critical: Untapped revenue from: ${article.title}`,
        priority: 'CRITICAL',
        context: { recentTraffic, totalRevenue },
      });
    }

    // ── Rule 8: Low quality score → UPDATE ──
    if ((article.qualityScore ?? 100) < 50) {
      ruleOpportunities.push({
        articleId: article.id,
        articleTitle: article.title,
        type: 'UPDATE',
        title: `Improve quality score for: ${article.title}`,
        priority: 'MEDIUM',
        context: { qualityScore: article.qualityScore },
      });
    }
  }

  // 2. Batch AI enrichment in groups of 5
  const enriched = await enrichOpportunitiesWithAI(siteId, ruleOpportunities);

  // 3. Create all opportunities in DB
  const created = await Promise.all(
    enriched.map((opp) =>
      createOpportunity({
        siteId,
        articleId: opp.articleId,
        type: opp.type as any,
        title: opp.title,
        description: opp.description,
        expectedImpact: opp.expectedImpact,
        priority: opp.priority,
        aiGenerated: true,
        metadata: JSON.stringify(opp.context),
      })
    )
  );

  return created;
}

// ─── AI Enrichment (batched) ──────────────────────────────────

interface EnrichedOpportunity extends RuleOpportunity {
  description: string;
  expectedImpact?: string;
}

async function enrichOpportunitiesWithAI(
  siteId: string,
  opportunities: RuleOpportunity[]
): Promise<EnrichedOpportunity[]> {
  const BATCH_SIZE = 5;
  const results: EnrichedOpportunity[] = [];

  for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
    const batch = opportunities.slice(i, i + BATCH_SIZE);
    const fallback = batch.map((o) => ({
      ...o,
      description: `Automated opportunity detected for "${o.articleTitle}". Type: ${o.type}. Priority: ${o.priority}.`,
    }));

    try {
      const prompt = batch
        .map(
          (o, idx) =>
            `${idx + 1}. Type: ${o.type}, Article: "${o.articleTitle}", Priority: ${o.priority}, Context: ${JSON.stringify(o.context)}`
        )
        .join('\n');

      const response = await callAI({
        siteId,
        jobType: 'OPPORTUNITY_ENRICHMENT',
        systemPrompt:
          'You are a content growth strategist. For each opportunity below, provide a concise description (1-2 sentences explaining the opportunity) and expected impact (1 sentence with estimated outcome). Return ONLY a valid JSON array with objects having "index" (number), "description" (string), "expectedImpact" (string) fields.',
        userPrompt: `Analyze these content opportunities and enrich them:\n\n${prompt}`,
      });

      const parsed = JSON.parse(cleanAIResponse(response.content)) as Array<{
        index: number;
        description: string;
        expectedImpact?: string;
      }>

      for (let j = 0; j < batch.length; j++) {
        const enrichment = parsed.find((p) => p.index === j + 1);
        results.push({
          ...batch[j],
          description: enrichment?.description ?? fallback[j].description,
          expectedImpact: enrichment?.expectedImpact,
        });
      }
    } catch {
      // If AI fails, use fallback descriptions
      results.push(...fallback);
    }
  }

  return results;
}

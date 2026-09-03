import { db } from '@/lib/db';

// ─── Health Score Types ──────────────────────────────────────

export const HEALTH_METRICS = [
  'TRAFFIC_GROWTH',
  'REVENUE_GROWTH',
  'CONTENT_QUALITY',
  'SEO_HEALTH',
  'ENGAGEMENT',
  'MONETIZATION_EFFICIENCY',
  'RETENTION',
  'OVERALL',
] as const;

export type HealthMetric = (typeof HEALTH_METRICS)[number];

// ─── Calculate Health Score ──────────────────────────────────

export async function calculateHealthScore(
  organizationId: string,
  siteId: string,
  metric: HealthMetric,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ score: number; confidence: number }> {
  const days = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000);

  switch (metric) {
    case 'TRAFFIC_GROWTH': {
      const current = await db.trafficMetric.aggregate({
        where: { siteId, date: { gte: periodStart, lte: periodEnd } },
        _sum: { pageViews: true },
      });
      const prevStart = new Date(periodStart.getTime() - days * 86400000);
      const prev = await db.trafficMetric.aggregate({
        where: { siteId, date: { gte: prevStart, lte: periodStart } },
        _sum: { pageViews: true },
      });
      const curr = current._sum.pageViews ?? 0;
      const prevVal = prev._sum.pageViews ?? 0;
      const growth = prevVal > 0 ? ((curr - prevVal) / prevVal) * 100 : 0;
      const score = Math.min(100, Math.max(0, Math.round(50 + growth * 2)));
      return { score, confidence: prevVal > 100 ? 85 : 40 };
    }

    case 'REVENUE_GROWTH': {
      const current = await db.revenueEvent.aggregate({
        where: { siteId, createdAt: { gte: periodStart, lte: periodEnd }, status: 'CONFIRMED' },
        _sum: { amount: true },
      });
      const prevStart = new Date(periodStart.getTime() - days * 86400000);
      const prev = await db.revenueEvent.aggregate({
        where: { siteId, createdAt: { gte: prevStart, lte: periodStart }, status: 'CONFIRMED' },
        _sum: { amount: true },
      });
      const curr = current._sum.amount ?? 0;
      const prevVal = prev._sum.amount ?? 0;
      const growth = prevVal > 0 ? ((curr - prevVal) / prevVal) * 100 : curr > 0 ? 100 : 0;
      const score = Math.min(100, Math.max(0, Math.round(50 + growth)));
      return { score, confidence: prevVal > 0 ? 80 : 30 };
    }

    case 'CONTENT_QUALITY': {
      const avgQuality = await db.article.aggregate({
        where: { siteId, status: { in: ['published', 'PUBLISHED'] } },
        _avg: { qualityScore: true },
        _count: true,
      });
      const score = Math.round(avgQuality._avg.qualityScore ?? 50);
      return { score, confidence: avgQuality._count > 10 ? 75 : 35 };
    }

    case 'SEO_HEALTH': {
      const avgSeo = await db.article.aggregate({
        where: { siteId, status: { in: ['published', 'PUBLISHED'] } },
        _avg: { seoScore: true },
        _count: true,
      });
      const score = Math.round(avgSeo._avg.seoScore ?? 50);
      return { score, confidence: avgSeo._count > 10 ? 75 : 35 };
    }

    case 'MONETIZATION_EFFICIENCY': {
      const revenue = await db.revenueEvent.aggregate({
        where: { siteId, createdAt: { gte: periodStart, lte: periodEnd }, status: 'CONFIRMED' },
        _sum: { amount: true },
      });
      const costs = await db.costEvent.aggregate({
        where: { siteId, date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      });
      const rev = revenue._sum.amount ?? 0;
      const cost = costs._sum.amount ?? 1;
      const roi = (rev / cost) * 100;
      const score = Math.min(100, Math.max(0, Math.round(roi / 2)));
      return { score, confidence: rev > 0 ? 80 : 25 };
    }

    default: {
      // Calculate overall from available sub-metrics
      const subMetrics: HealthMetric[] = ['TRAFFIC_GROWTH', 'REVENUE_GROWTH', 'CONTENT_QUALITY', 'SEO_HEALTH', 'MONETIZATION_EFFICIENCY'];
      const scores = await Promise.all(
        subMetrics.map((m) =>
          m !== metric
            ? calculateHealthScore(organizationId, siteId, m, periodStart, periodEnd)
            : Promise.resolve({ score: 50, confidence: 0 }),
        ),
      );
      const totalConfidence = scores.reduce((s, c) => s + c.confidence, 0);
      const weightedScore =
        totalConfidence > 0
          ? Math.round(
              scores.reduce((s, c) => s + c.score * c.confidence, 0) / totalConfidence,
            )
          : 50;
      return { score: weightedScore, confidence: Math.round(totalConfidence / scores.length) };
    }
  }
}

// ─── Store & Query ───────────────────────────────────────────

export async function recordHealthScores(
  organizationId: string,
  siteId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const metrics = HEALTH_METRICS.filter((m) => m !== 'OVERALL');
  const scores = await Promise.all(
    metrics.map(async (metric) => {
      const { score, confidence } = await calculateHealthScore(
        organizationId,
        siteId,
        metric,
        periodStart,
        periodEnd,
      );
      return db.businessHealthScore.upsert({
        where: {
          organizationId_siteId_metric_periodStart_periodEnd: {
            organizationId,
            siteId,
            metric,
            periodStart,
            periodEnd,
          },
        },
        update: { score, confidence, calculatedAt: new Date() },
        create: { organizationId, siteId, metric, score, confidence, periodStart, periodEnd },
      });
    }),
  );

  // Also store overall
  const overall = await calculateHealthScore(
    organizationId,
    siteId,
    'OVERALL',
    periodStart,
    periodEnd,
  );
  scores.push(
    await db.businessHealthScore.upsert({
      where: {
        organizationId_siteId_metric_periodStart_periodEnd: {
          organizationId,
          siteId,
          metric: 'OVERALL',
          periodStart,
          periodEnd,
        },
      },
      update: { score: overall.score, confidence: overall.confidence },
      create: {
        organizationId,
        siteId,
        metric: 'OVERALL',
        score: overall.score,
        confidence: overall.confidence,
        periodStart,
        periodEnd,
      },
    }),
  );

  return scores;
}

export async function getLatestHealthScores(organizationId: string, siteId?: string) {
  const scores = await db.businessHealthScore.findMany({
    where: {
      organizationId,
      ...(siteId ? { siteId } : {}),
    },
    orderBy: { calculatedAt: 'desc' },
    take: 20,
  });

  // Deduplicate — keep only the latest per metric
  const seen = new Set<string>();
  const latest: typeof scores = [];
  for (const score of scores) {
    if (!seen.has(score.metric)) {
      seen.add(score.metric);
      latest.push(score);
    }
  }

  return latest;
}

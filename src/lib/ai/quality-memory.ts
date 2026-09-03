import { db } from '@/lib/db';

/**
 * Content Quality Memory — tracks outcomes of AI-generated content
 * to learn which prompts, models, and settings produce the best results.
 *
 * Phase 3 Slice 3.14: Content Quality Memory + Prompt Versioning
 */

export interface QualityOutcome {
  articleId: string;
  siteId: string;
  jobType: string;
  model: string;
  provider: string;
  promptVersion: string;
  tone?: string;
  audience?: string;
  length?: string;
  mode?: string;
  qualityScore: number;
  seoScore: number;
  wordCount: number;
  traffic30d?: number;
  revenue30d?: number;
}

export interface PromptPerformance {
  promptVersion: string;
  jobType: string;
  avgQualityScore: number;
  avgSeoScore: number;
  sampleCount: number;
  topModels: { model: string; avgScore: number; count: number }[];
}

/**
 * Record the outcome of a content generation job for learning.
 */
export async function recordOutcome(outcome: QualityOutcome): Promise<void> {
  const metadata = JSON.stringify({
    promptVersion: outcome.promptVersion,
    tone: outcome.tone,
    audience: outcome.audience,
    length: outcome.length,
    mode: outcome.mode,
    qualityScore: outcome.qualityScore,
    seoScore: outcome.seoScore,
    wordCount: outcome.wordCount,
    traffic30d: outcome.traffic30d ?? 0,
    revenue30d: outcome.revenue30d ?? 0,
  });

  await db.automationLog.create({
    data: {
      siteId: outcome.siteId,
      action: `QUALITY_MEMORY:${outcome.jobType}`,
      status: 'completed',
      message: `Quality recorded: Q=${outcome.qualityScore} SEO=${outcome.seoScore} Model=${outcome.model}`,
      details: metadata,
    },
  });
}

/**
 * Get prompt performance stats — which versions produce the best content.
 */
export async function getPromptPerformance(
  siteId: string,
  jobType?: string,
  limit = 20,
): Promise<PromptPerformance[]> {
  const where: Record<string, unknown> = {
    siteId,
    action: { startsWith: 'QUALITY_MEMORY:' },
  };
  if (jobType) {
    where.action = `QUALITY_MEMORY:${jobType}`;
  }

  const logs = await db.automationLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { details: true },
  });

  // Group by promptVersion
  const grouped: Record<string, {
    qualityScores: number[];
    seoScores: number[];
    models: Record<string, { scores: number[]; count: number }>;
  }> = {};

  for (const log of logs) {
    try {
      const data = JSON.parse(log.details || '{}');
      const version = data.promptVersion || 'v1';
      if (!grouped[version]) {
        grouped[version] = { qualityScores: [], seoScores: [], models: {} };
      }
      grouped[version].qualityScores.push(data.qualityScore || 0);
      grouped[version].seoScores.push(data.seoScore || 0);

      const model = data.model || 'unknown';
      if (!grouped[version].models[model]) {
        grouped[version].models[model] = { scores: [], count: 0 };
      }
      grouped[version].models[model].scores.push(data.qualityScore || 0);
      grouped[version].models[model].count++;
    } catch {
      // Skip malformed entries
    }
  }

  const results: PromptPerformance[] = Object.entries(grouped).map(([version, data]) => {
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    const topModels = Object.entries(data.models)
      .map(([model, m]) => ({
        model,
        avgScore: avg(m.scores),
        count: m.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    return {
      promptVersion: version,
      jobType: jobType || 'ALL',
      avgQualityScore: avg(data.qualityScores),
      avgSeoScore: avg(data.seoScores),
      sampleCount: data.qualityScores.length,
      topModels,
    };
  });

  return results
    .sort((a, b) => b.avgQualityScore - a.avgQualityScore)
    .slice(0, limit);
}

/**
 * Get the best-performing model for a given job type.
 */
export async function getBestModel(
  siteId: string,
  jobType: string,
): Promise<{ model: string; avgScore: number } | null> {
  const performance = await getPromptPerformance(siteId, jobType, 1);
  if (performance.length === 0 || performance[0].topModels.length === 0) return null;
  return performance[0].topModels[0];
}

/**
 * Get quality trend — are recent generations improving?
 */
export async function getQualityTrend(
  siteId: string,
  jobType?: string,
  days = 30,
): Promise<{ date: string; avgQuality: number; avgSeo: number; count: number }[]> {
  const since = new Date(Date.now() - days * 86400000);

  const where: Record<string, unknown> = {
    siteId,
    action: { startsWith: 'QUALITY_MEMORY:' },
    createdAt: { gte: since },
  };
  if (jobType) {
    where.action = `QUALITY_MEMORY:${jobType}`;
  }

  const logs = await db.automationLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: { details: true, createdAt: true },
  });

  // Group by day
  const byDay: Record<string, { quality: number[]; seo: number[] }> = {};
  for (const log of logs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { quality: [], seo: [] };
    try {
      const data = JSON.parse(log.details || '{}');
      byDay[day].quality.push(data.qualityScore || 0);
      byDay[day].seo.push(data.seoScore || 0);
    } catch {
      // Skip
    }
  }

  return Object.entries(byDay).map(([date, data]) => ({
    date,
    avgQuality: data.quality.length > 0 ? Math.round(data.quality.reduce((s, v) => s + v, 0) / data.quality.length) : 0,
    avgSeo: data.seo.length > 0 ? Math.round(data.seo.reduce((s, v) => s + v, 0) / data.seo.length) : 0,
    count: data.quality.length,
  }));
}

import { db } from '@/lib/db';
import type { CreateExperimentInput } from './types';

// ─── Create Experiment ───────────────────────────────────────

export async function createExperiment(data: CreateExperimentInput) {
  if (!data.variants || data.variants.length < 2) {
    throw new Error('Experiment must have at least 2 variants');
  }

  const experiment = await db.ctaExperiment.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      ctaId: data.ctaId,
      status: 'RUNNING',
      startDate: new Date(),
      variants: {
        create: data.variants.map((v) => ({
          name: v.name,
          headline: v.headline,
          description: v.description ?? null,
          buttonText: v.buttonText,
          buttonUrl: v.buttonUrl,
          isControl: v.isControl ?? false,
        })),
      },
    },
    include: {
      variants: true,
    },
  });

  return experiment;
}

// ─── Get Experiment ───────────────────────────────────────────

export async function getExperiment(id: string, siteId: string) {
  const experiment = await db.ctaExperiment.findFirst({
    where: { id, siteId },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
      cta: {
        select: { id: true, name: true, type: true },
      },
    },
  });
  return experiment;
}

// ─── List Experiments ─────────────────────────────────────────

export async function listExperiments(siteId: string, filters?: { status?: string }) {
  const where: Record<string, unknown> = { siteId };
  if (filters?.status) where.status = filters.status;

  const experiments = await db.ctaExperiment.findMany({
    where,
    include: {
      variants: true,
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return experiments;
}

// ─── Pause Experiment ─────────────────────────────────────────

export async function pauseExperiment(id: string, siteId: string) {
  const existing = await db.ctaExperiment.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Experiment not found');
  if (existing.status !== 'RUNNING') throw new Error('Only running experiments can be paused');

  return db.ctaExperiment.update({
    where: { id },
    data: { status: 'PAUSED' },
    include: { variants: true },
  });
}

// ─── Complete Experiment ──────────────────────────────────────
// Winner: variant with highest (conversions/impressions ratio).
// Tie-break: highest clicks.

export async function completeExperiment(id: string, siteId: string) {
  const existing = await db.ctaExperiment.findFirst({
    where: { id, siteId },
    include: { variants: true },
  });
  if (!existing) throw new Error('Experiment not found');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new Error(`Experiment is already ${existing.status.toLowerCase()}`);
  }

  // Calculate winner
  const sorted = [...existing.variants].sort((a, b) => {
    const rateA = a.impressionCount > 0 ? a.conversionCount / a.impressionCount : 0;
    const rateB = b.impressionCount > 0 ? b.conversionCount / b.impressionCount : 0;
    if (rateB !== rateA) return rateB - rateA;
    return b.clickCount - a.clickCount;
  });

  const winner = sorted[0];

  return db.ctaExperiment.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      endDate: new Date(),
      winnerVariantId: winner.id,
    },
    include: { variants: true },
  });
}

// ─── Cancel Experiment ────────────────────────────────────────

export async function cancelExperiment(id: string, siteId: string) {
  const existing = await db.ctaExperiment.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Experiment not found');
  if (existing.status === 'COMPLETED') throw new Error('Cannot cancel a completed experiment');

  return db.ctaExperiment.update({
    where: { id },
    data: { status: 'CANCELLED', endDate: new Date() },
    include: { variants: true },
  });
}

// ─── Record Variant Impression ────────────────────────────────

export async function recordVariantImpression(variantId: string) {
  const variant = await db.ctaVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error('Variant not found');

  await Promise.all([
    db.ctaVariant.update({
      where: { id: variantId },
      data: { impressionCount: { increment: 1 } },
    }),
    db.ctaExperiment.update({
      where: { id: variant.experimentId },
      data: { totalImpressions: { increment: 1 } },
    }),
  ]);

  return db.ctaVariant.findUnique({ where: { id: variantId } });
}

// ─── Record Variant Click ─────────────────────────────────────

export async function recordVariantClick(variantId: string) {
  const variant = await db.ctaVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error('Variant not found');

  await Promise.all([
    db.ctaVariant.update({
      where: { id: variantId },
      data: { clickCount: { increment: 1 } },
    }),
    db.ctaExperiment.update({
      where: { id: variant.experimentId },
      data: { totalClicks: { increment: 1 } },
    }),
  ]);

  return db.ctaVariant.findUnique({ where: { id: variantId } });
}

// ─── Record Variant Conversion ────────────────────────────────

export async function recordVariantConversion(variantId: string) {
  const variant = await db.ctaVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error('Variant not found');

  await Promise.all([
    db.ctaVariant.update({
      where: { id: variantId },
      data: { conversionCount: { increment: 1 } },
    }),
    db.ctaExperiment.update({
      where: { id: variant.experimentId },
      data: { totalConversions: { increment: 1 } },
    }),
  ]);

  return db.ctaVariant.findUnique({ where: { id: variantId } });
}

// ─── Experiment Stats ─────────────────────────────────────────

export async function getExperimentStats(siteId: string) {
  const experiments = await db.ctaExperiment.findMany({
    where: { siteId },
  });

  const total = experiments.length;
  const running = experiments.filter((e) => e.status === 'RUNNING').length;
  const completed = experiments.filter((e) => e.status === 'COMPLETED').length;
  const totalImpressions = experiments.reduce((sum, e) => sum + e.totalImpressions, 0);

  return {
    total,
    running,
    completed,
    totalImpressions,
  };
}

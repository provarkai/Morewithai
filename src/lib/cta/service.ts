import { db } from '@/lib/db';
import type { CreateCtaInput, UpdateCtaInput, CtaWithStats, CtaListFilters } from './types';

// ─── Create CTA ───────────────────────────────────────────────

export async function createCta(data: CreateCtaInput) {
  const cta = await db.callToAction.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      type: data.type ?? 'NEWSLETTER',
      headline: data.headline,
      description: data.description ?? null,
      buttonText: data.buttonText,
      buttonUrl: data.buttonUrl ?? null,
      targetPlacement: data.targetPlacement ?? 'AFTER_ARTICLE',
      targetArticleId: data.targetArticleId ?? null,
      targetCategoryId: data.targetCategoryId ?? null,
      targetTagId: data.targetTagId ?? null,
      leadMagnetId: data.leadMagnetId ?? null,
      affiliateOfferId: data.affiliateOfferId ?? null,
      productId: data.productId ?? null,
      isActive: data.isActive ?? true,
    },
  });
  return cta;
}

// ─── List CTAs (paginated) ────────────────────────────────────

export async function listCtas(siteId: string, filters?: CtaListFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.type) where.type = filters.type;
  if (filters?.placement) where.targetPlacement = filters.placement;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  const [ctas, total] = await Promise.all([
    db.callToAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { placements: true, experiments: true } },
      },
    }),
    db.callToAction.count({ where }),
  ]);

  return {
    data: ctas.map((c) => enrichCtaWithStats(c)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Single CTA ───────────────────────────────────────────

export async function getCta(id: string, siteId: string) {
  const cta = await db.callToAction.findFirst({
    where: { id, siteId },
    include: {
      _count: { select: { placements: true, experiments: true } },
    },
  });
  if (!cta) return null;
  return enrichCtaWithStats(cta);
}

// ─── Update CTA ───────────────────────────────────────────────

export async function updateCta(id: string, siteId: string, data: Partial<UpdateCtaInput>) {
  const existing = await db.callToAction.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('CTA not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.buttonText !== undefined) updateData.buttonText = data.buttonText;
  if (data.buttonUrl !== undefined) updateData.buttonUrl = data.buttonUrl;
  if (data.targetPlacement !== undefined) updateData.targetPlacement = data.targetPlacement;
  if (data.targetArticleId !== undefined) updateData.targetArticleId = data.targetArticleId;
  if (data.targetCategoryId !== undefined) updateData.targetCategoryId = data.targetCategoryId;
  if (data.targetTagId !== undefined) updateData.targetTagId = data.targetTagId;
  if (data.leadMagnetId !== undefined) updateData.leadMagnetId = data.leadMagnetId;
  if (data.affiliateOfferId !== undefined) updateData.affiliateOfferId = data.affiliateOfferId;
  if (data.productId !== undefined) updateData.productId = data.productId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const cta = await db.callToAction.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { placements: true, experiments: true } },
    },
  });

  return enrichCtaWithStats(cta);
}

// ─── Delete CTA ───────────────────────────────────────────────

export async function deleteCta(id: string, siteId: string) {
  const existing = await db.callToAction.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('CTA not found');

  await db.callToAction.delete({ where: { id } });
  return { success: true };
}

// ─── CTA Stats ────────────────────────────────────────────────

export async function getCtaStats(siteId: string) {
  const ctas = await db.callToAction.findMany({
    where: { siteId },
  });

  const total = ctas.length;
  const active = ctas.filter((c) => c.isActive).length;
  const totalImpressions = ctas.reduce((sum, c) => sum + c.impressionCount, 0);
  const totalClicks = ctas.reduce((sum, c) => sum + c.clickCount, 0);
  const totalConversions = ctas.reduce((sum, c) => sum + c.conversionCount, 0);

  const byType: Record<string, number> = {};
  for (const c of ctas) {
    byType[c.type] = (byType[c.type] || 0) + 1;
  }

  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgConversionRate = totalImpressions > 0 ? totalConversions / totalImpressions : 0;

  return {
    total,
    active,
    byType,
    totalImpressions,
    totalClicks,
    totalConversions,
    avgCtr,
    avgConversionRate,
  };
}

// ─── Record Impression ────────────────────────────────────────

export async function recordCtaImpression(id: string) {
  const cta = await db.callToAction.update({
    where: { id },
    data: { impressionCount: { increment: 1 } },
  });
  return cta;
}

// ─── Record Click ─────────────────────────────────────────────

export async function recordCtaClick(id: string) {
  const cta = await db.callToAction.findUnique({ where: { id } });
  if (!cta) throw new Error('CTA not found');

  await Promise.all([
    db.callToAction.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    }),
    db.conversionEvent.create({
      data: {
        siteId: cta.siteId,
        eventType: 'CTA_CLICK',
        sourceType: 'CTA',
        sourceId: id,
      },
    }),
  ]);

  return db.callToAction.findUnique({ where: { id } });
}

// ─── Record Conversion ────────────────────────────────────────

export async function recordCtaConversion(id: string, metadata?: Record<string, unknown>) {
  const cta = await db.callToAction.findUnique({ where: { id } });
  if (!cta) throw new Error('CTA not found');

  await Promise.all([
    db.callToAction.update({
      where: { id },
      data: { conversionCount: { increment: 1 } },
    }),
    db.conversionEvent.create({
      data: {
        siteId: cta.siteId,
        eventType: 'CTA_CONVERSION',
        sourceType: 'CTA',
        sourceId: id,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    }),
  ]);

  return db.callToAction.findUnique({ where: { id } });
}

// ─── Helpers ──────────────────────────────────────────────────

function enrichCtaWithStats(
  cta: Record<string, unknown> & {
    impressionCount: number;
    clickCount: number;
    conversionCount: number;
    _count?: { placements: number; experiments: number };
  }
): CtaWithStats {
  const impressions = cta.impressionCount || 0;
  return {
    ...cta,
    ctr: impressions > 0 ? (cta.clickCount || 0) / impressions : 0,
    conversionRate: impressions > 0 ? (cta.conversionCount || 0) / impressions : 0,
    _count: cta._count,
  } as CtaWithStats;
}

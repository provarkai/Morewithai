import { db } from '@/lib/db';
import type { CreateAdPlacementInput, UpdateAdPlacementInput, RecordAdEventInput, AdPlacementListFilters } from './types';

// ─── Create Placement ────────────────────────────────────────

export async function createPlacement(data: CreateAdPlacementInput) {
  const placement = await db.adPlacement.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      placement: data.placement ?? 'IN_ARTICLE',
      provider: data.provider ?? null,
      adUnitId: data.adUnitId ?? null,
      enabled: data.enabled ?? true,
      articleId: data.articleId ?? null,
      categoryId: data.categoryId ?? null,
      priority: data.priority ?? 0,
    },
  });
  return placement;
}

// ─── List Placements (paginated) ─────────────────────────────

export async function listPlacements(siteId: string, filters?: AdPlacementListFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.placement) where.placement = filters.placement;
  if (filters?.enabled !== undefined) where.enabled = filters.enabled;

  const [placements, total] = await Promise.all([
    db.adPlacement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.adPlacement.count({ where }),
  ]);

  return {
    data: placements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Single Placement ─────────────────────────────────────

export async function getPlacement(id: string, siteId: string) {
  const placement = await db.adPlacement.findFirst({
    where: { id, siteId },
  });
  return placement;
}

// ─── Update Placement ─────────────────────────────────────────

export async function updatePlacement(id: string, siteId: string, data: Partial<UpdateAdPlacementInput>) {
  const existing = await db.adPlacement.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Ad placement not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.placement !== undefined) updateData.placement = data.placement;
  if (data.provider !== undefined) updateData.provider = data.provider;
  if (data.adUnitId !== undefined) updateData.adUnitId = data.adUnitId;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.articleId !== undefined) updateData.articleId = data.articleId;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.priority !== undefined) updateData.priority = data.priority;

  const placement = await db.adPlacement.update({
    where: { id },
    data: updateData,
  });

  return placement;
}

// ─── Delete Placement ─────────────────────────────────────────

export async function deletePlacement(id: string, siteId: string) {
  const existing = await db.adPlacement.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Ad placement not found');

  await db.adPlacement.delete({ where: { id } });
  return { success: true };
}

// ─── Record Ad Event ──────────────────────────────────────────

export async function recordAdEvent(data: RecordAdEventInput) {
  const event = await db.adEvent.create({
    data: {
      siteId: data.siteId,
      placementId: data.placementId,
      articleId: data.articleId ?? null,
      type: data.type,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      estimatedRevenue: data.estimatedRevenue ?? 0,
    },
  });
  return event;
}

// ─── Ad Stats ─────────────────────────────────────────────────

export async function getAdStats(siteId: string) {
  const [impressions, clicks, revenueResult] = await Promise.all([
    db.adEvent.count({
      where: { siteId, type: 'IMPRESSION' },
    }),
    db.adEvent.count({
      where: { siteId, type: 'CLICK' },
    }),
    db.adEvent.aggregate({
      where: { siteId },
      _sum: { estimatedRevenue: true },
    }),
  ]);

  const ctr = impressions > 0 ? clicks / impressions : 0;

  return {
    totalImpressions: impressions,
    totalClicks: clicks,
    ctr,
    estimatedRevenue: revenueResult._sum.estimatedRevenue ?? 0,
  };
}

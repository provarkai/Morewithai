import { db } from '@/lib/db';

interface AssignPlacementInput {
  ctaId: string;
  articleId?: string;
  placement?: string;
  position?: number;
  isActive?: boolean;
  frequencyCap?: number;
}

// ─── Assign Placement ─────────────────────────────────────────

export async function assignPlacement(data: AssignPlacementInput) {
  const placement = await db.ctaPlacement.create({
    data: {
      ctaId: data.ctaId,
      articleId: data.articleId ?? null,
      placement: data.placement ?? 'AFTER_ARTICLE',
      position: data.position ?? null,
      isActive: data.isActive ?? true,
      frequencyCap: data.frequencyCap ?? null,
    },
  });
  return placement;
}

// ─── Get Placements for Article ───────────────────────────────

export async function getPlacementsForArticle(articleId: string) {
  const placements = await db.ctaPlacement.findMany({
    where: {
      articleId,
      isActive: true,
    },
    include: {
      cta: true,
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });
  return placements;
}

// ─── Remove Placement ─────────────────────────────────────────

export async function removePlacement(id: string) {
  const existing = await db.ctaPlacement.findUnique({ where: { id } });
  if (!existing) throw new Error('Placement not found');

  await db.ctaPlacement.delete({ where: { id } });
  return { success: true };
}

// ─── Update Placement ─────────────────────────────────────────

export async function updatePlacement(
  id: string,
  data: Partial<{
    placement: string;
    position: number;
    isActive: boolean;
    frequencyCap: number;
    articleId: string;
  }>
) {
  const existing = await db.ctaPlacement.findUnique({ where: { id } });
  if (!existing) throw new Error('Placement not found');

  const updateData: Record<string, unknown> = {};
  if (data.placement !== undefined) updateData.placement = data.placement;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.frequencyCap !== undefined) updateData.frequencyCap = data.frequencyCap;
  if (data.articleId !== undefined) updateData.articleId = data.articleId;

  const placement = await db.ctaPlacement.update({
    where: { id },
    data: updateData,
  });
  return placement;
}

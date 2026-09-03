import { db } from '@/lib/db';
import type { CreateProgramInput, UpdateProgramInput } from './types';

// ─── Create Program ───────────────────────────────────────────

export async function createProgram(data: CreateProgramInput) {
  const program = await db.affiliateProgram.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      network: data.network ?? null,
      website: data.website ?? null,
      commissionType: data.commissionType ?? null,
      commissionValue: data.commissionValue ?? null,
      cookieDuration: data.cookieDuration ?? null,
      terms: data.terms ?? null,
      status: data.status ?? 'ACTIVE',
    },
  });
  return program;
}

// ─── List Programs (paginated) ────────────────────────────────

export async function listPrograms(
  siteId: string,
  filters?: { status?: string; page?: number; limit?: number }
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.status) where.status = filters.status;

  const [programs, total] = await Promise.all([
    db.affiliateProgram.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { offers: true } },
      },
    }),
    db.affiliateProgram.count({ where }),
  ]);

  return {
    data: programs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Single Program ───────────────────────────────────────

export async function getProgram(id: string, siteId: string) {
  const program = await db.affiliateProgram.findFirst({
    where: { id, siteId },
    include: {
      _count: { select: { offers: true } },
    },
  });
  return program;
}

// ─── Update Program ───────────────────────────────────────────

export async function updateProgram(id: string, siteId: string, data: Partial<UpdateProgramInput>) {
  const existing = await db.affiliateProgram.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Affiliate program not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.network !== undefined) updateData.network = data.network;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.commissionType !== undefined) updateData.commissionType = data.commissionType;
  if (data.commissionValue !== undefined) updateData.commissionValue = data.commissionValue;
  if (data.cookieDuration !== undefined) updateData.cookieDuration = data.cookieDuration;
  if (data.terms !== undefined) updateData.terms = data.terms;
  if (data.status !== undefined) updateData.status = data.status;

  const program = await db.affiliateProgram.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { offers: true } },
    },
  });

  return program;
}

// ─── Delete Program (archive) ─────────────────────────────────

export async function deleteProgram(id: string, siteId: string) {
  const existing = await db.affiliateProgram.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Affiliate program not found');

  await db.affiliateProgram.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  return { success: true };
}

// ─── Program Stats ────────────────────────────────────────────

export async function getProgramStats(siteId: string) {
  const [total, active, offersResult] = await Promise.all([
    db.affiliateProgram.count({ where: { siteId } }),
    db.affiliateProgram.count({ where: { siteId, status: 'ACTIVE' } }),
    db.affiliateOffer.aggregate({
      where: { siteId },
      _sum: { revenueGenerated: true },
      _count: true,
    }),
  ]);

  return {
    totalPrograms: total,
    activePrograms: active,
    totalOffers: offersResult._count,
    totalRevenue: offersResult._sum.revenueGenerated ?? 0,
  };
}

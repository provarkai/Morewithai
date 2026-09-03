import { db } from '@/lib/db';
import type { CreateOfferInput, UpdateOfferInput, OfferListFilters } from './types';

// ─── Create Offer ─────────────────────────────────────────────

export async function createOffer(data: CreateOfferInput) {
  // Verify program exists and belongs to the site
  const program = await db.affiliateProgram.findFirst({
    where: { id: data.programId, siteId: data.siteId },
  });
  if (!program) throw new Error('Affiliate program not found');

  const offer = await db.affiliateOffer.create({
    data: {
      siteId: data.siteId,
      programId: data.programId,
      name: data.name,
      description: data.description ?? null,
      destinationUrl: data.destinationUrl,
      affiliateUrl: data.affiliateUrl,
      category: data.category ?? null,
      commission: data.commission ?? null,
      priority: data.priority ?? 0,
      status: data.status ?? 'ACTIVE',
    },
    include: {
      program: true,
    },
  });
  return offer;
}

// ─── List Offers (paginated) ──────────────────────────────────

export async function listOffers(siteId: string, filters?: OfferListFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.programId) where.programId = filters.programId;
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;

  const [offers, total] = await Promise.all([
    db.affiliateOffer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        program: true,
      },
    }),
    db.affiliateOffer.count({ where }),
  ]);

  return {
    data: offers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Single Offer ─────────────────────────────────────────

export async function getOffer(id: string, siteId: string) {
  const offer = await db.affiliateOffer.findFirst({
    where: { id, siteId },
    include: {
      program: true,
    },
  });
  return offer;
}

// ─── Update Offer ─────────────────────────────────────────────

export async function updateOffer(id: string, siteId: string, data: Partial<UpdateOfferInput>) {
  const existing = await db.affiliateOffer.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Affiliate offer not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.destinationUrl !== undefined) updateData.destinationUrl = data.destinationUrl;
  if (data.affiliateUrl !== undefined) updateData.affiliateUrl = data.affiliateUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.commission !== undefined) updateData.commission = data.commission;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) updateData.status = data.status;

  const offer = await db.affiliateOffer.update({
    where: { id },
    data: updateData,
    include: {
      program: true,
    },
  });

  return offer;
}

// ─── Delete Offer (deactivate) ────────────────────────────────

export async function deleteOffer(id: string, siteId: string) {
  const existing = await db.affiliateOffer.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Affiliate offer not found');

  await db.affiliateOffer.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  return { success: true };
}

// ─── Top Offers ───────────────────────────────────────────────

export async function getTopOffers(siteId: string, limit: number = 10) {
  const offers = await db.affiliateOffer.findMany({
    where: { siteId, status: 'ACTIVE' },
    orderBy: { revenueGenerated: 'desc' },
    take: limit,
    include: {
      program: true,
    },
  });
  return offers;
}

// ─── Offer Stats ──────────────────────────────────────────────

export async function getOfferStats(siteId: string) {
  const [total, active, clickResult] = await Promise.all([
    db.affiliateOffer.count({ where: { siteId } }),
    db.affiliateOffer.count({ where: { siteId, status: 'ACTIVE' } }),
    db.affiliateOffer.aggregate({
      where: { siteId },
      _sum: { clickCount: true, conversionCount: true, revenueGenerated: true },
    }),
  ]);

  return {
    totalOffers: total,
    activeOffers: active,
    totalClicks: clickResult._sum.clickCount ?? 0,
    totalConversions: clickResult._sum.conversionCount ?? 0,
    totalRevenue: clickResult._sum.revenueGenerated ?? 0,
  };
}

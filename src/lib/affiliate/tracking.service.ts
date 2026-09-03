import { db } from '@/lib/db';
import type { TrackClickInput, ClickStatsFilters } from './types';

// ─── Track Click ─────────────────────────────────────────────

export async function trackClick(data: TrackClickInput) {
  // Verify the offer exists
  const offer = await db.affiliateOffer.findFirst({
    where: { id: data.offerId, siteId: data.siteId, status: 'ACTIVE' },
  });
  if (!offer) throw new Error('Affiliate offer not found or inactive');

  const [click] = await Promise.all([
    db.affiliateClick.create({
      data: {
        siteId: data.siteId,
        offerId: data.offerId,
        articleId: data.articleId ?? null,
        subscriberId: data.subscriberId ?? null,
        sessionIdentifier: data.sessionIdentifier ?? null,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        referrer: data.referrer ?? null,
        status: 'CLICKED',
      },
    }),
    db.affiliateOffer.update({
      where: { id: data.offerId },
      data: { clickCount: { increment: 1 } },
    }),
  ]);

  return {
    clickId: click.id,
    redirectUrl: offer.affiliateUrl,
  };
}

// ─── Track Conversion ────────────────────────────────────────

export async function trackConversion(clickId: string, revenue: number = 0) {
  const click = await db.affiliateClick.findUnique({ where: { id: clickId } });
  if (!click) throw new Error('Affiliate click not found');
  if (click.status === 'CONVERTED') throw new Error('Click already converted');

  await Promise.all([
    db.affiliateClick.update({
      where: { id: clickId },
      data: { status: 'CONVERTED', revenue },
    }),
    db.affiliateOffer.update({
      where: { id: click.offerId },
      data: {
        conversionCount: { increment: 1 },
        revenueGenerated: { increment: revenue },
      },
    }),
  ]);

  return { success: true };
}

// ─── Click Stats ──────────────────────────────────────────────

export async function getClickStats(siteId: string, filters?: ClickStatsFilters) {
  const where: Record<string, unknown> = { siteId };
  if (filters?.articleId) where.articleId = filters.articleId;
  if (filters?.offerId) where.offerId = filters.offerId;
  if (filters?.startDate || filters?.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filters.startDate) dateFilter.gte = filters.startDate;
    if (filters.endDate) dateFilter.lte = filters.endDate;
    where.createdAt = dateFilter;
  }

  const [total, converted, bounced, revenueResult] = await Promise.all([
    db.affiliateClick.count({ where }),
    db.affiliateClick.count({ where: { ...where, status: 'CONVERTED' } as Record<string, unknown> }),
    db.affiliateClick.count({ where: { ...where, status: 'BOUNCED' } as Record<string, unknown> }),
    db.affiliateClick.aggregate({
      where,
      _sum: { revenue: true },
    }),
  ]);

  const conversionRate = total > 0 ? converted / total : 0;

  return {
    totalClicks: total,
    conversions: converted,
    bounced,
    conversionRate,
    totalRevenue: revenueResult._sum.revenue ?? 0,
  };
}

// ─── Article Attribution ──────────────────────────────────────

export async function getAttribution(articleId: string, siteId: string) {
  const clicks = await db.affiliateClick.findMany({
    where: { articleId, siteId },
  });

  const totalClicks = clicks.length;
  const conversions = clicks.filter((c) => c.status === 'CONVERTED');
  const totalConversions = conversions.length;
  const totalRevenue = conversions.reduce((sum, c) => sum + (c.revenue ?? 0), 0);

  return {
    totalClicks,
    conversions: totalConversions,
    revenue: totalRevenue,
    conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
  };
}

import { db } from '@/lib/db';

// ─── Generate Snapshot ───────────────────────────────────────

export interface GenerateSnapshotInput {
  organizationId: string;
  siteId?: string;
  periodStart: Date;
  periodEnd: Date;
}

export async function generateDashboardSnapshot(input: GenerateSnapshotInput) {
  const { organizationId, siteId, periodStart, periodEnd } = input;

  // Gather metrics from multiple tables in parallel
  const [revenueData, trafficData, subscriberData, leadData, adCostData] =
    await Promise.all([
      db.revenueEvent.aggregate({
        where: {
          siteId: siteId ?? undefined,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
      db.trafficMetric.aggregate({
        where: {
          siteId: siteId ?? undefined,
          date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { pageViews: true },
      }),
      db.subscriber.count({
        where: {
          siteId: siteId ?? undefined,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      db.lead.count({
        where: {
          siteId: siteId ?? undefined,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      db.costEvent.aggregate({
        where: {
          siteId: siteId ?? undefined,
          date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
    ]);

  const revenue = revenueData._sum.amount ?? 0;
  const aiCost = adCostData._sum.amount ?? 0;
  const profit = revenue - aiCost;

  return db.dashboardSnapshot.create({
    data: {
      organizationId,
      siteId: siteId ?? null,
      periodStart,
      periodEnd,
      revenue,
      profit,
      traffic: trafficData._sum.pageViews ?? 0,
      leads: leadData,
      subscribers: subscriberData,
      aiCost,
      conversionRate: 0,
    },
  });
}

// ─── Query Snapshots ─────────────────────────────────────────

export async function getSnapshots(
  organizationId: string,
  siteId?: string,
  limit = 12,
) {
  return db.dashboardSnapshot.findMany({
    where: {
      organizationId,
      ...(siteId ? { siteId } : {}),
    },
    orderBy: { periodStart: 'desc' },
    take: limit,
  });
}

export async function getLatestSnapshot(organizationId: string, siteId?: string) {
  return db.dashboardSnapshot.findFirst({
    where: {
      organizationId,
      ...(siteId ? { siteId } : {}),
    },
    orderBy: { generatedAt: 'desc' },
  });
}

import { db } from '@/lib/db';

export async function recordCost(data: { siteId: string; category: string; amount: number; description?: string; provider?: string; date?: Date; metadata?: Record<string, unknown> }) {
  return db.costEvent.create({
    data: { ...data, date: data.date || new Date(), metadata: data.metadata ? JSON.stringify(data.metadata) : null },
  });
}

export async function getProfitMetrics(siteId: string, period?: { start: Date; end: Date }) {
  const start = period?.start || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = period?.end || new Date();
  const [revenue, costs, byCategory] = await Promise.all([
    db.revenueEvent.aggregate({ _sum: { amount: true }, where: { siteId, status: 'CONFIRMED', createdAt: { gte: start, lte: end } } }),
    db.costEvent.aggregate({ _sum: { amount: true }, where: { siteId, date: { gte: start, lte: end } } }),
    db.costEvent.groupBy({ by: ['category'], where: { siteId, date: { gte: start, lte: end } }, _sum: { amount: true } }),
  ]);
  const totalRevenue = revenue._sum.amount || 0;
  const totalCosts = costs._sum.amount || 0;
  return {
    period: { start, end },
    revenue: totalRevenue, costs: totalCosts,
    profit: totalRevenue - totalCosts,
    margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCosts) / totalRevenue) * 10000) / 100 : 0,
    byCategory: byCategory.map(c => ({ category: c.category, amount: c._sum.amount || 0 })),
  };
}

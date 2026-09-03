import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db } from '@/lib/db';

// GET /api/monetization?siteId=xxx&action=summary
// Returns a unified monetization overview
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const action = searchParams.get('action');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'summary') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999);

      const [
        thisMonthRevenue,
        lastMonthRevenue,
        totalRevenue,
        activeAffiliateOffers,
        activeProducts,
        activeCtas,
        activeAds,
        revenueBySource,
        topArticles,
      ] = await Promise.all([
        // This month revenue
        db.revenueEvent.aggregate({
          _sum: { amount: true },
          where: { siteId, status: 'CONFIRMED', createdAt: { gte: thisMonthStart } },
        }),
        // Last month revenue
        db.revenueEvent.aggregate({
          _sum: { amount: true },
          where: { siteId, status: 'CONFIRMED', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        }),
        // Total revenue
        db.revenueEvent.aggregate({
          _sum: { amount: true },
          where: { siteId, status: 'CONFIRMED' },
        }),
        // Active monetization assets
        db.affiliateOffer.count({ where: { siteId, status: 'ACTIVE' } }),
        db.product.count({ where: { siteId, status: 'PUBLISHED' } }),
        db.callToAction.count({ where: { siteId, isActive: true } }),
        db.adPlacement.count({ where: { siteId, enabled: true } }),
        // Revenue by source type
        db.revenueEvent.groupBy({
          by: ['sourceType'],
          where: { siteId, status: 'CONFIRMED', createdAt: { gte: thisMonthStart } },
          _sum: { amount: true },
          _count: true,
        }),
        // Top revenue articles this month
        db.revenueEvent.groupBy({
          by: ['articleId'],
          where: { siteId, status: 'CONFIRMED', articleId: { not: null }, createdAt: { gte: thisMonthStart } },
          _sum: { amount: true },
          take: 5,
          orderBy: { _sum: { amount: 'desc' } },
        }),
      ]);

      const thisMonthTotal = thisMonthRevenue._sum.amount || 0;
      const lastMonthTotal = lastMonthRevenue._sum.amount || 0;
      const revenueGrowth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

      // Get article titles for top articles
      const articleIds = topArticles.map((a) => a.articleId).filter(Boolean) as string[];
      const articles = articleIds.length > 0
        ? await db.article.findMany({
            where: { id: { in: articleIds } },
            select: { id: true, title: true, rewrittenTitle: true },
          })
        : [];

      return NextResponse.json({
        thisMonth: { total: thisMonthTotal, growth: Math.round(revenueGrowth * 100) / 100 },
        lastMonth: { total: lastMonthTotal },
        allTime: { total: totalRevenue._sum.amount || 0 },
        assets: {
          affiliateOffers: activeAffiliateOffers,
          products: activeProducts,
          ctas: activeCtas,
          ads: activeAds,
        },
        bySource: revenueBySource.map((s) => ({ sourceType: s.sourceType, revenue: s._sum.amount || 0, count: s._count })),
        topArticles: topArticles.map((a) => {
          const article = articles.find((art) => art.id === a.articleId);
          return {
            articleId: a.articleId,
            title: article?.rewrittenTitle || article?.title || 'Unknown',
            revenue: a._sum.amount || 0,
          };
        }),
      });
    }

    // Default: return asset counts
    const [offers, products, ctas, ads, landingPages] = await Promise.all([
      db.affiliateOffer.count({ where: { siteId, status: 'ACTIVE' } }),
      db.product.count({ where: { siteId } }),
      db.callToAction.count({ where: { siteId, isActive: true } }),
      db.adPlacement.count({ where: { siteId, enabled: true } }),
      db.landingPage.count({ where: { siteId } }),
    ]);

    return NextResponse.json({ offers, products, ctas, ads, landingPages });
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : error.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch monetization data' }, { status });
  }
}

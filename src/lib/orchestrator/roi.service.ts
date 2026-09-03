import { db } from '@/lib/db';

export interface ContentROI {
  articleId?: string;
  opportunityId?: string;
  expectedTraffic: number;       // monthly page views
  expectedConversion: number;    // 0-1
  expectedRevenue: number;       // monthly
  productionCost: number;        // AI cost estimate
  aiCost: number;                // tokens cost
  expectedRoi: number;           // percentage
  paybackDays: number;           // days to recoup cost
  recommendation: string;
}

const AVG_CPM = 5; // ₦5 per 1000 impressions (ad revenue baseline)
const AVG_CONVERSION_VALUE = 500; // ₦500 per conversion (affiliate/product)

export function estimateROI(params: {
  estimatedMonthlyTraffic?: number;
  monetizationType?: string;
  aiTokensEstimate?: number;
  productionHours?: number;
  commercialIntent?: number; // 0-100
}): ContentROI {
  const traffic = params.estimatedMonthlyTraffic || 1000;
  const conversionRate = (params.commercialIntent || 30) / 1000; // ~3% default
  const conversions = traffic * conversionRate;

  const adRevenue = (traffic / 1000) * AVG_CPM;
  const conversionRevenue = conversions * AVG_CONVERSION_VALUE;
  const expectedRevenue = adRevenue + conversionRevenue;

  const aiCost = (params.aiTokensEstimate || 5000) * 0.00003; // rough cost per token
  const productionCost = aiCost + (params.productionHours || 2) * 2000; // ₦2000/hr labor equivalent

  const expectedRoi = productionCost > 0 ? ((expectedRevenue - productionCost) / productionCost) * 100 : 0;
  const paybackDays = expectedRevenue > 0 ? Math.ceil((productionCost / expectedRevenue) * 30) : 999;

  let recommendation: string;
  if (expectedRoi > 200) recommendation = 'High priority — strong ROI expected';
  else if (expectedRoi > 100) recommendation = 'Good opportunity — prioritize production';
  else if (expectedRoi > 0) recommendation = 'Moderate ROI — consider after higher-priority items';
  else recommendation = 'Low or negative ROI — skip or defer';

  return {
    expectedTraffic: traffic,
    expectedConversion: Math.round(conversionRate * 10000) / 10000,
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    productionCost: Math.round(productionCost * 100) / 100,
    aiCost: Math.round(aiCost * 100) / 100,
    expectedRoi: Math.round(expectedRoi),
    paybackDays,
    recommendation,
  };
}

export async function calculateArticleROI(articleId: string, siteId: string): Promise<ContentROI> {
  const article = await db.article.findFirst({ where: { id: articleId, siteId } });
  if (!article) throw new Error('Article not found');

  // Use actual traffic data if available
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trafficData = await db.trafficMetric.findMany({
    where: { articleId, date: { gte: thirtyDaysAgo } },
    select: { pageViews: true },
  });
  const actualTraffic = trafficData.reduce((s, m) => s + m.pageViews, 0);

  const revenueData = await db.revenueEvent.findMany({
    where: { articleId, status: 'CONFIRMED', createdAt: { gte: thirtyDaysAgo } },
    select: { amount: true },
  });
  const actualRevenue = revenueData.reduce((s, e) => s + e.amount, 0);

  // AI cost from jobs
  const aiJobs = await db.aiJob.findMany({
    where: { articleId },
    select: { estimatedCost: true },
  });
  const aiCost = aiJobs.reduce((s, j) => s + (j.estimatedCost || 0), 0);

  return {
    articleId,
    expectedTraffic: actualTraffic,
    expectedConversion: 0,
    expectedRevenue: actualRevenue,
    productionCost: aiCost,
    aiCost,
    expectedRoi: aiCost > 0 ? Math.round(((actualRevenue - aiCost) / aiCost) * 100) : actualRevenue > 0 ? 999 : 0,
    paybackDays: actualRevenue > 0 ? Math.ceil((aiCost / actualRevenue) * 30) : 999,
    recommendation: actualRevenue > aiCost ? 'Profitable — maintain and promote' : actualRevenue > 0 ? 'Low profit — optimize monetization' : 'No revenue — add monetization or promote',
  };
}

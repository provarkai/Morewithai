import { db } from '@/lib/db';

export interface PriorityFactors {
  trafficPotential: number;    // 0-100
  revenuePotential: number;    // 0-100
  searchOpportunity: number;   // 0-100
  competition: number;         // 0-100 (100 = low competition = good)
  siteAuthority: number;       // 0-100
  freshness: number;           // 0-100
  commercialIntent: number;    // 0-100
  productionCost: number;      // 0-100 (100 = cheap = good)
  expectedRoi: number;         // 0-100
}

export interface PriorityResult {
  score: number;               // 1-10
  factors: PriorityFactors;
  reasoning: string;
}

const WEIGHTS = {
  trafficPotential: 0.15,
  revenuePotential: 0.20,
  searchOpportunity: 0.15,
  competition: 0.10,
  siteAuthority: 0.05,
  freshness: 0.05,
  commercialIntent: 0.15,
  productionCost: 0.05,
  expectedRoi: 0.10,
};

export function calculatePriority(factors: PriorityFactors): PriorityResult {
  const rawScore = Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (factors[key as keyof PriorityFactors] || 0) * weight,
    0
  );
  // Convert 0-100 to 1-10 scale
  const score = Math.max(1, Math.min(10, Math.round(rawScore / 10)));

  const strengths = Object.entries(factors)
    .filter(([, v]) => v >= 70)
    .map(([k]) => k);
  const weaknesses = Object.entries(factors)
    .filter(([, v]) => v < 30)
    .map(([k]) => k);

  const reasoning = ((strengths as any[]).length > 0
    ? `Strong in: ${strengths.join(", ")}.`
    : "") +
    (weaknesses.length > 0
    ? ` Weak in: ${weaknesses.join(", ")}.`
    : "");
  return { score, factors, reasoning: reasoning.trim() };
}

export async function prioritizeOpportunity(siteId: string, opportunityId: string): Promise<PriorityResult> {
  const opportunity = await db.contentOpportunity.findFirst({ where: { id: opportunityId, siteId } });
  if (!opportunity) throw new Error('Opportunity not found');

  // Estimate factors based on opportunity data
  const isHighPriority = opportunity.priority === 'HIGH';
  const type = opportunity.type;

  const factors: PriorityFactors = {
    trafficPotential: isHighPriority ? 75 : 50,
    revenuePotential: ['CONVERSION', 'MONETIZATION'].includes(type) ? 80 : 40,
    searchOpportunity: ['SEO', 'CONTENT_GAP'].includes(type) ? 70 : 45,
    competition: isHighPriority ? 60 : 50,
    siteAuthority: 50, // Would need traffic data to calculate
    freshness: 60,
    commercialIntent: ['CONVERSION', 'MONETIZATION', 'AFFILIATE'].includes(type) ? 80 : 35,
    productionCost: 70,
    expectedRoi: isHighPriority ? 75 : 50,
  };

  const result = calculatePriority(factors);

  // Update opportunity priority based on score
  const newPriority = result.score >= 7 ? 'HIGH' : result.score >= 4 ? 'MEDIUM' : 'LOW';
  await db.contentOpportunity.update({ where: { id: opportunityId }, data: { priority: newPriority } });

  return result;
}

export async function batchPrioritize(siteId: string): Promise<{ opportunityId: string; result: PriorityResult }[]> {
  const opportunities = await db.contentOpportunity.findMany({
    where: { siteId, status: 'OPEN' },
    select: { id: true, type: true, priority: true },
  });

  const results = await Promise.all(
    opportunities.map(async (opp) => {
      const result = await prioritizeOpportunity(siteId, opp.id);
      return { opportunityId: opp.id, result };
    })
  );

  return results.sort((a, b) => b.result.score - a.result.score);
}

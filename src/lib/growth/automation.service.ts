import { db } from '@/lib/db';
import type { CreateAutomationRuleInput, UpdateAutomationRuleInput, RuleEvaluationResult } from './types';
import { analyzeOpportunities } from './opportunity.service';
import { generateRecommendations } from './recommendation.service';

// ─── CRUD ─────────────────────────────────────────────────────

export async function createRule(data: CreateAutomationRuleInput) {
  return db.automationRule.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      triggerCondition: JSON.stringify(data.triggerCondition),
      action: JSON.stringify(data.action),
      isActive: data.isActive ?? true,
    },
  });
}

export async function listRules(siteId: string, filters?: { isActive?: boolean }) {
  const where: Record<string, unknown> = { siteId };
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  return db.automationRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getRule(id: string, siteId: string) {
  return db.automationRule.findFirst({ where: { id, siteId } });
}

export async function updateRule(id: string, siteId: string, data: UpdateAutomationRuleInput) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.triggerCondition !== undefined) updateData.triggerCondition = JSON.stringify(data.triggerCondition);
  if (data.action !== undefined) updateData.action = JSON.stringify(data.action);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return db.automationRule.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteRule(id: string, siteId: string) {
  return db.automationRule.delete({ where: { id, siteId } });
}

// ─── Rule Evaluation ──────────────────────────────────────────

export async function evaluateRules(siteId: string, _context?: any): Promise<RuleEvaluationResult[]> {
  const rules = await db.automationRule.findMany({
    where: { siteId, isActive: true },
  });

  const results: RuleEvaluationResult[] = [];

  // Fetch current metrics for evaluation
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const articles = await db.article.findMany({
    where: { siteId, status: 'published' },
    include: {
      trafficMetrics: { where: { date: { gte: thirtyDaysAgo } }, select: { pageViews: true } },
      conversionEvents: { select: { id: true } },
      ctaPlacements: { where: { isActive: true }, select: { id: true } },
    },
  });

  // Build article-level context for rule evaluation
  const articleContexts = articles.map((a) => ({
    articleId: a.id,
    title: a.title,
    pageViews: a.trafficMetrics.reduce((s, m) => s + m.pageViews, 0),
    conversionCount: a.conversionEvents.length,
    hasCTAs: a.ctaPlacements.length > 0,
  }));

  for (const rule of rules) {
    let triggered = false;
    let result: string | undefined;
    let error: string | undefined;

    try {
      const condition = JSON.parse(rule.triggerCondition) as Record<string, unknown>;
      const action = JSON.parse(rule.action) as Record<string, unknown>;

      // Check if any article matches the trigger condition
      const matchingArticles = articleContexts.filter((ac) => {
        return evaluateCondition(condition, ac);
      });

      if (matchingArticles.length > 0) {
        triggered = true;

        // Execute action
        if (action.type === 'create_opportunity') {
          for (const ma of matchingArticles.slice(0, 5)) {
            await db.contentOpportunity.create({
              data: {
                siteId,
                articleId: ma.articleId,
                type: (action.opportunityType as string) ?? 'CONVERSION',
                title: `Auto-rule [${rule.name}]: ${ma.title}`,
                description: `Triggered by automation rule "${rule.name}". Page views: ${ma.pageViews}, Conversions: ${ma.conversionCount}.`,
                priority: (action.priority as string) ?? 'MEDIUM',
                aiGenerated: false,
                metadata: JSON.stringify({ ruleId: rule.id, ruleName: rule.name, matchedMetrics: ma }),
              },
            });
          }
          result = `Created ${Math.min(5, matchingArticles.length)} opportunities`;
        } else if (action.type === 'create_recommendation') {
          await db.growthRecommendation.create({
            data: {
              siteId,
              problem: `Rule "${rule.name}" triggered for ${matchingArticles.length} articles`,
              opportunity: `These articles match conditions that indicate growth potential`,
              recommendedAction: (action.recommendedAction as string) ?? 'Review matching articles and implement suggested changes',
              priority: (action.priority as string) ?? 'MEDIUM',
              aiGenerated: false,
              metadata: JSON.stringify({ ruleId: rule.id, matchingArticleIds: matchingArticles.map((m) => m.articleId) }),
            },
          });
          result = 'Created 1 recommendation';
        } else {
          result = `Unknown action type: ${action.type}`;
        }

        // Update rule
        await db.automationRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: new Date(), runCount: { increment: 1 } },
        });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Rule evaluation failed';
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      action: triggered ? (result ?? 'Executed') : 'Not triggered',
      result,
      error,
    });
  }

  return results;
}

// ─── Condition Evaluator ──────────────────────────────────────

function evaluateCondition(condition: Record<string, unknown>, context: Record<string, unknown>): boolean {
  const { field, operator, value } = condition as { field: string; operator: string; value: unknown };

  const contextValue = resolveField(field, context);
  if (contextValue === undefined) return false;

  switch (operator) {
    case 'gt': return Number(contextValue) > Number(value);
    case 'gte': return Number(contextValue) >= Number(value);
    case 'lt': return Number(contextValue) < Number(value);
    case 'lte': return Number(contextValue) <= Number(value);
    case 'eq': return contextValue === value;
    case 'neq': return contextValue !== value;
    case 'exists': return contextValue !== null && contextValue !== undefined;
    case 'not_exists': return contextValue === null || contextValue === undefined;
    default: return false;
  }
}

function resolveField(field: string, context: Record<string, unknown>): unknown {
  if (field in context) return context[field];
  return undefined;
}

// ─── Daily Growth Review ──────────────────────────────────────

export async function runDailyGrowthReview(siteId?: string) {
  const sites = siteId
    ? await db.site.findMany({ where: { id: siteId, isActive: true } })
    : await db.site.findMany({ where: { isActive: true } });

  const allResults: Array<{ siteId: string; siteName: string; opportunities: number; recommendations: number; rulesTriggered: number }> = [];

  for (const site of sites) {
    try {
      // 1. Analyze opportunities
      const opportunities = await analyzeOpportunities(site.id);

      // 2. Generate recommendations
      const recommendations = await generateRecommendations(site.id);

      // 3. Evaluate automation rules
      const ruleResults = await evaluateRules(site.id);
      const triggeredCount = ruleResults.filter((r) => r.triggered).length;

      // Log
      await db.automationLog.create({
        data: {
          siteId: site.id,
          action: 'DAILY_GROWTH_REVIEW',
          status: 'COMPLETED',
          message: `Found ${opportunities.length} opportunities, ${recommendations.length} recommendations, ${triggeredCount} rules triggered`,
          details: JSON.stringify({ opportunities: opportunities.length, recommendations: recommendations.length, rulesTriggered: triggeredCount }),
        },
      });

      allResults.push({
        siteId: site.id,
        siteName: site.name,
        opportunities: opportunities.length,
        recommendations: recommendations.length,
        rulesTriggered: triggeredCount,
      });
    } catch (err) {
      await db.automationLog.create({
        data: {
          siteId: site.id,
          action: 'DAILY_GROWTH_REVIEW',
          status: 'FAILED',
          message: 'Daily growth review failed',
          details: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
  }

  return allResults;
}

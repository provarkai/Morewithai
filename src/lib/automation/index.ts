import { db } from '@/lib/db';

// Re-export from growth automation
export {
  createRule,
  listRules,
  getRule,
  updateRule,
  deleteRule,
  evaluateRules,
  runDailyGrowthReview,
} from '@/lib/growth/automation.service';
export type {
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
  RuleEvaluationResult,
} from '@/lib/growth/types';

// Additional automation utilities
export async function getAutomationSummary(siteId: string) {
  const [activeRules, inactiveRules, recentLogs] = await Promise.all([
    db.automationRule.count({ where: { siteId, isActive: true } }),
    db.automationRule.count({ where: { siteId, isActive: false } }),
    db.automationLog.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, action: true, status: true, message: true, createdAt: true },
    }),
  ]);

  return {
    activeRules,
    inactiveRules,
    totalRules: activeRules + inactiveRules,
    recentLogs,
  };
}

export async function getAutomationStats(siteId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalRuns, successCount, failCount] = await Promise.all([
    db.automationRule.aggregate({ _sum: { runCount: true }, where: { siteId } }),
    db.automationLog.count({ where: { siteId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } } }),
    db.automationLog.count({ where: { siteId, status: 'FAILED', createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return {
    totalRuns: totalRuns._sum.runCount || 0,
    recentSuccess: successCount,
    recentFailures: failCount,
  };
}

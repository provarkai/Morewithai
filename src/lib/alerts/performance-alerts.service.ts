import { db } from '@/lib/db';
import { callAI } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export type AlertType = 'TRAFFIC_DROP' | 'TRAFFIC_SPIKE' | 'CTR_DECLINE' | 'RANKING_DROP' | 'REVENUE_DROP' | 'QUALITY_DROP' | 'ENGAGEMENT_DROP';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface PerformanceAlert {
  id: string;
  siteId: string;
  articleId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  threshold: number;
  acknowledged: boolean;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  siteId: string;
  type: AlertType;
  threshold: number;
  metric: string;
  isActive: boolean;
  channels: string[];
}

// ─── Alert Rules (in-memory, production would use DB) ───────

const DEFAULT_RULES: Omit<AlertRule, 'id'>[] = [
  { siteId: '', type: 'TRAFFIC_DROP', threshold: -20, metric: 'pageViews', isActive: true, channels: ['email'] },
  { siteId: '', type: 'TRAFFIC_SPIKE', threshold: 100, metric: 'pageViews', isActive: true, channels: ['email'] },
  { siteId: '', type: 'CTR_DECLINE', threshold: -30, metric: 'ctr', isActive: true, channels: ['email'] },
  { siteId: '', type: 'QUALITY_DROP', threshold: -15, metric: 'qualityScore', isActive: true, channels: ['email'] },
  { siteId: '', type: 'REVENUE_DROP', threshold: -25, metric: 'revenue', isActive: false, channels: ['email'] },
  { siteId: '', type: 'ENGAGEMENT_DROP', threshold: -20, metric: 'avgTimeOnPage', isActive: true, channels: ['email'] },
];

// ─── Alert Generation ───────────────────────────────────────

/**
 * Scans all articles for performance anomalies and generates alerts.
 */
export async function scanForAlerts(siteId: string): Promise<PerformanceAlert[]> {
  const alerts: PerformanceAlert[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get published articles with recent traffic
  const articles = await db.article.findMany({
    where: { siteId, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      rewrittenTitle: true,
      slug: true,
      trafficMetrics: {
        where: { date: { gte: fourteenDaysAgo } },
        select: { date: true, pageViews: true, users: true, sessions: true },
        orderBy: { date: 'desc' },
      },
      revenueEvents: {
        select: { amount: true, createdAt: true },
      },
    },
    take: 100,
  });

  for (const article of articles) {
    const recentMetrics = article.trafficMetrics.filter((m) => m.date >= sevenDaysAgo);
    const olderMetrics = article.trafficMetrics.filter((m) => m.date < sevenDaysAgo && m.date >= fourteenDaysAgo);

    if (recentMetrics.length < 2 || olderMetrics.length < 2) continue;

    const recentPv = recentMetrics.reduce((s, m) => s + m.pageViews, 0) / recentMetrics.length;
    const olderPv = olderMetrics.reduce((s, m) => s + m.pageViews, 0) / olderMetrics.length;
    const pvChange = olderPv > 0 ? ((recentPv - olderPv) / olderPv) * 100 : 0;

    // Traffic drop alert
    if (pvChange < -20) {
      alerts.push({
        id: `alert-${article.id}-traffic-drop-${Date.now()}`,
        siteId,
        articleId: article.id,
        type: 'TRAFFIC_DROP',
        severity: pvChange < -50 ? 'CRITICAL' : 'WARNING',
        title: `Traffic dropped ${Math.round(Math.abs(pvChange))}%`,
        message: `"${article.rewrittenTitle || article.title}" lost ${Math.round(Math.abs(pvChange))}% of its weekly traffic compared to the previous period.`,
        metric: 'pageViews',
        previousValue: Math.round(olderPv),
        currentValue: Math.round(recentPv),
        changePercent: Math.round(pvChange),
        threshold: -20,
        acknowledged: false,
        createdAt: now.toISOString(),
      });
    }

    // Traffic spike alert
    if (pvChange > 100) {
      alerts.push({
        id: `alert-${article.id}-spike-${Date.now()}`,
        siteId,
        articleId: article.id,
        type: 'TRAFFIC_SPIKE',
        severity: 'INFO',
        title: `Traffic surged ${Math.round(pvChange)}%`,
        message: `"${article.rewrittenTitle || article.title}" is getting ${Math.round(pvChange)}% more traffic than usual. Consider updating the content or adding monetization.`,
        metric: 'pageViews',
        previousValue: Math.round(olderPv),
        currentValue: Math.round(recentPv),
        changePercent: Math.round(pvChange),
        threshold: 100,
        acknowledged: false,
        createdAt: now.toISOString(),
      });
    }

    // Revenue drop
    const recentRevenue = article.revenueEvents
      .filter((r) => r.createdAt >= sevenDaysAgo)
      .reduce((s, r) => s + r.amount, 0);
    const olderRevenue = article.revenueEvents
      .filter((r) => r.createdAt >= fourteenDaysAgo && r.createdAt < sevenDaysAgo)
      .reduce((s, r) => s + r.amount, 0);

    if (olderRevenue > 0) {
      const revChange = ((recentRevenue - olderRevenue) / olderRevenue) * 100;
      if (revChange < -25) {
        alerts.push({
          id: `alert-${article.id}-revenue-${Date.now()}`,
          siteId,
          articleId: article.id,
          type: 'REVENUE_DROP',
          severity: 'WARNING',
          title: `Revenue dropped ${Math.round(Math.abs(revChange))}%`,
          message: `"${article.rewrittenTitle || article.title}" revenue fell from $${olderRevenue.toFixed(2)} to $${recentRevenue.toFixed(2)}.`,
          metric: 'revenue',
          previousValue: olderRevenue,
          currentValue: recentRevenue,
          changePercent: Math.round(revChange),
          threshold: -25,
          acknowledged: false,
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // Sort by severity then by change magnitude
  const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  alerts.sort((a, b) => {
    const sv = severityOrder[a.severity] - severityOrder[b.severity];
    if (sv !== 0) return sv;
    return Math.abs(a.changePercent) - Math.abs(b.changePercent);
  });

  return alerts;
}

/**
 * Generate AI-powered alert summary with recommended actions.
 */
export async function generateAlertSummary(
  alerts: PerformanceAlert[],
  siteId: string,
): Promise<{ summary: string; recommendations: string[] }> {
  if (alerts.length === 0) {
    return { summary: 'All metrics are within normal ranges.', recommendations: [] };
  }

  const alertDescriptions = alerts.map((a) =>
    `- [${a.severity}] ${a.title}: ${a.message}`,
  ).join('\n');

  const result = await callAI({
    siteId,
    jobType: 'ALERT_SUMMARY',
    systemPrompt: 'You are a content analytics expert. Summarize performance alerts and provide actionable recommendations.',
    userPrompt: `Analyze these performance alerts and provide a summary with actionable recommendations:

${alertDescriptions}

Return JSON:
{
  "summary": "1-2 sentence overview of the site's health",
  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"]
}

Return ONLY the JSON.`,
    temperature: 0.3,
    maxTokens: 500,
    responseFormat: 'json',
  });

  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }

  return {
    summary: `${alerts.length} alerts detected. ${alerts.filter((a) => a.severity === 'CRITICAL').length} critical.`,
    recommendations: ['Review traffic sources for drops', 'Update declining content', 'Check monetization setup'],
  };
}

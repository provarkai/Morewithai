import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export interface OptimalSlot {
  dayOfWeek: number; // 0=Sun, 6=Sat
  hour: number;      // 0-23
  score: number;     // 0-100 relative effectiveness
  reason: string;
  estimatedTraffic: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ScheduleRecommendation {
  articleId: string;
  currentStatus: string;
  bestSlots: OptimalSlot[];
  nextBestSlot: OptimalSlot;
  historicalInsights: string[];
  audienceActiveHours: { hour: number; avgTraffic: number }[];
  generatedAt: string;
}

export interface AudienceHeatmap {
  dayOfWeek: number;
  hour: number;
  avgPageViews: number;
  avgEngagement: number;
  sampleSize: number;
}

// ─── Core Analysis ──────────────────────────────────────────

/**
 * Analyzes historical traffic patterns to find the optimal publish time.
 * Uses last 90 days of traffic metrics grouped by day-of-week and hour.
 */
export async function analyzeOptimalPublishTime(
  siteId: string,
  articleId?: string,
): Promise<ScheduleRecommendation> {
  // Get traffic metrics for the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const metrics = await db.trafficMetric.findMany({
    where: {
      siteId,
      date: { gte: ninetyDaysAgo },
    },
    select: {
      date: true,
      pageViews: true,
      users: true,
      sessions: true,
    },
    orderBy: { date: 'asc' },
  });

  // Build audience heatmap
  const heatmap = buildHeatmap(metrics);

  // Calculate optimal slots
  const bestSlots = calculateOptimalSlots(heatmap);

  // Get article status if provided
  let currentStatus = 'DRAFT';
  if (articleId) {
    const article = await db.article.findUnique({
      where: { id: articleId },
      select: { status: true },
    });
    if (article) {
      currentStatus = article.status;
    }
  }

  // Generate historical insights
  const insights = generateInsights(heatmap, metrics);

  // Get audience active hours for the chart
  const activeHours = getAudienceActiveHours(heatmap);

  return {
    articleId: articleId || '',
    currentStatus,
    bestSlots: bestSlots.slice(0, 5),
    nextBestSlot: bestSlots[0] || getDefaultSlot(),
    historicalInsights: insights,
    audienceActiveHours: activeHours,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Heatmap Builder ────────────────────────────────────────

function buildHeatmap(
  metrics: { date: Date; pageViews: number; users: number; sessions: number }[],
): AudienceHeatmap[] {
  const grid: Record<string, { pv: number; eng: number; count: number }> = {};

  for (const m of metrics) {
    const d = new Date(m.date);
    const dayOfWeek = d.getDay();
    const hour = d.getHours();
    const key = `${dayOfWeek}-${hour}`;

    if (!grid[key]) {
      grid[key] = { pv: 0, eng: 0, count: 0 };
    }

    grid[key].pv += m.pageViews;
    // Engagement proxy: ratio of users to sessions (higher = more engaged)
    const engagementRatio = m.sessions > 0 ? (m.users / m.sessions) * 50 : 50;
    grid[key].eng += Math.min(100, engagementRatio);
    grid[key].count += 1;
  }

  const heatmap: AudienceHeatmap[] = [];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      const g = grid[key];
      heatmap.push({
        dayOfWeek: day,
        hour,
        avgPageViews: g ? Math.round(g.pv / g.count) : 0,
        avgEngagement: g ? Math.round(g.eng / g.count) : 0,
        sampleSize: g ? g.count : 0,
      });
    }
  }

  return heatmap;
}

// ─── Optimal Slot Calculation ───────────────────────────────

function calculateOptimalSlots(heatmap: AudienceHeatmap[]): OptimalSlot[] {
  const slots: OptimalSlot[] = [];
  const maxPv = Math.max(...heatmap.map((h) => h.avgPageViews), 1);

  for (const cell of heatmap) {
    if (cell.sampleSize < 3) continue;

    const trafficScore = (cell.avgPageViews / maxPv) * 60;
    const engagementScore = cell.avgEngagement * 0.4;
    const score = Math.round(Math.min(100, trafficScore + engagementScore));

    const confidence: OptimalSlot['confidence'] =
      cell.sampleSize >= 10 ? 'HIGH' : cell.sampleSize >= 5 ? 'MEDIUM' : 'LOW';

    slots.push({
      dayOfWeek: cell.dayOfWeek,
      hour: cell.hour,
      score,
      reason: getSlotReason(cell),
      estimatedTraffic: cell.avgPageViews,
      confidence,
    });
  }

  slots.sort((a, b) => b.score - a.score);

  // Deduplicate adjacent slots
  const deduplicated: OptimalSlot[] = [];
  for (const slot of slots) {
    const isDuplicate = deduplicated.some(
      (d) => d.dayOfWeek === slot.dayOfWeek && Math.abs(d.hour - slot.hour) <= 2,
    );
    if (!isDuplicate) {
      deduplicated.push(slot);
    }
  }

  return deduplicated.slice(0, 10);
}

// ─── Insights Generator ─────────────────────────────────────

function generateInsights(
  heatmap: AudienceHeatmap[],
  metrics: { date: Date; pageViews: number }[],
): string[] {
  const insights: string[] = [];

  const dayTotals = Array.from({ length: 7 }, (_, d) =>
    heatmap.filter((h) => h.dayOfWeek === d).reduce((s, h) => s + h.avgPageViews, 0),
  );
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDay = dayTotals.indexOf(Math.max(...dayTotals));
  insights.push(`${dayNames[bestDay]} has the highest average traffic across all hours.`);

  const hourTotals = Array.from({ length: 24 }, (_, h) =>
    heatmap.filter((h2) => h2.hour === h).reduce((s, h2) => s + h2.avgPageViews, 0),
  );
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  insights.push(`Peak audience activity is around ${formatHour(peakHour)} (${formatHour(peakHour + 1)}).`);

  if (metrics.length >= 14) {
    const recentHalf = metrics.slice(Math.floor(metrics.length / 2));
    const olderHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const recentAvg = recentHalf.reduce((s, m) => s + m.pageViews, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, m) => s + m.pageViews, 0) / olderHalf.length;
    const pctChange = ((recentAvg - olderAvg) / Math.max(olderAvg, 1)) * 100;

    if (pctChange > 10) {
      insights.push(`Traffic is trending up ${Math.round(pctChange)}% — great time to publish new content.`);
    } else if (pctChange < -10) {
      insights.push(`Traffic dipped ${Math.round(Math.abs(pctChange))}% recently — consider scheduling at peak times.`);
    } else {
      insights.push('Traffic is stable over the past 90 days.');
    }
  }

  const weekdayAvg = dayTotals.slice(1, 6).reduce((s, v) => s + v, 0) / 5;
  const weekendAvg = (dayTotals[0] + dayTotals[6]) / 2;
  if (weekdayAvg > weekendAvg * 1.2) {
    insights.push('Weekday traffic significantly outperforms weekends — schedule for Mon-Fri.');
  } else if (weekendAvg > weekdayAvg * 1.2) {
    insights.push('Weekend traffic is strong — consider Saturday/Sunday publishes.');
  }

  return insights;
}

function getSlotReason(cell: AudienceHeatmap): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (cell.avgPageViews > 0 && cell.avgEngagement > 60) {
    return `${dayNames[cell.dayOfWeek]} ${formatHour(cell.hour)} has high traffic AND high engagement`;
  }
  if (cell.avgPageViews > 0) {
    return `${dayNames[cell.dayOfWeek]} ${formatHour(cell.hour)} has the highest traffic volume`;
  }
  return `${dayNames[cell.dayOfWeek]} ${formatHour(cell.hour)} — estimated based on patterns`;
}

// ─── Helpers ────────────────────────────────────────────────

function formatHour(h: number): string {
  const hour = h % 24;
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function getAudienceActiveHours(heatmap: AudienceHeatmap[]): { hour: number; avgTraffic: number }[] {
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    avgTraffic: Math.round(
      heatmap.filter((cell) => cell.hour === h).reduce((s, cell) => s + cell.avgPageViews, 0) / 7,
    ),
  }));
}

function getDefaultSlot(): OptimalSlot {
  return {
    dayOfWeek: 2,
    hour: 9,
    score: 50,
    reason: 'Default recommendation — publish on Tuesday morning for best engagement',
    estimatedTraffic: 0,
    confidence: 'LOW',
  };
}

/**
 * Generates a schedule suggestion for a specific article.
 */
export async function suggestSchedule(
  siteId: string,
  articleId: string,
): Promise<{
  recommendedDate: string;
  recommendedTime: string;
  reasoning: string;
  alternativeSlots: { date: string; time: string; score: number }[];
}> {
  const recommendation = await analyzeOptimalPublishTime(siteId, articleId);
  const nextSlot = recommendation.nextBestSlot;

  const now = new Date();
  const targetDay = nextSlot.dayOfWeek;
  const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);
  targetDate.setHours(nextSlot.hour, 0, 0, 0);

  if (targetDate.getTime() <= now.getTime() + 2 * 60 * 60 * 1000) {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  const alternatives = recommendation.bestSlots.slice(1, 4).map((slot) => {
    const altDate = new Date(now);
    const daysUntil = (slot.dayOfWeek - now.getDay() + 7) % 7 || 7;
    altDate.setDate(now.getDate() + daysUntil);
    altDate.setHours(slot.hour, 0, 0, 0);
    if (altDate.getTime() <= now.getTime() + 2 * 60 * 60 * 1000) {
      altDate.setDate(altDate.getDate() + 7);
    }
    return {
      date: altDate.toISOString().split('T')[0],
      time: formatHour(slot.hour),
      score: slot.score,
    };
  });

  return {
    recommendedDate: targetDate.toISOString().split('T')[0],
    recommendedTime: formatHour(nextSlot.hour),
    reasoning: nextSlot.reason,
    alternativeSlots: alternatives,
  };
}

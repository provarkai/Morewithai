import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export type WidgetType =
  | 'TRAFFIC_CHART'
  | 'REVENUE_CHART'
  | 'ARTICLES_LIST'
  | 'TOP_PERFORMERS'
  | 'SUBSCRIBER_GROWTH'
  | 'CONVERSION_RATE'
  | 'CONTENT_CALENDAR'
  | 'RECENT_ACTIVITY'
  | 'AI_INSIGHTS'
  | 'PERFORMANCE_ALERTS';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'sm' | 'md' | 'lg' | 'full';
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  siteId: string;
  name: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Default Layout ─────────────────────────────────────────

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w-traffic', type: 'TRAFFIC_CHART', title: 'Traffic Overview', size: 'lg', position: { x: 0, y: 0 }, config: { period: '30d' } },
  { id: 'w-revenue', type: 'REVENUE_CHART', title: 'Revenue', size: 'md', position: { x: 1, y: 0 }, config: { period: '30d' } },
  { id: 'w-top', type: 'TOP_PERFORMERS', title: 'Top Articles', size: 'md', position: { x: 0, y: 1 }, config: { limit: 5 } },
  { id: 'w-subs', type: 'SUBSCRIBER_GROWTH', title: 'Subscribers', size: 'sm', position: { x: 1, y: 1 }, config: {} },
  { id: 'w-conversion', type: 'CONVERSION_RATE', title: 'Conversions', size: 'sm', position: { x: 2, y: 1 }, config: {} },
  { id: 'w-activity', type: 'RECENT_ACTIVITY', title: 'Recent Activity', size: 'md', position: { x: 0, y: 2 }, config: { limit: 10 } },
  { id: 'w-insights', type: 'AI_INSIGHTS', title: 'AI Insights', size: 'md', position: { x: 1, y: 2 }, config: {} },
];

// ─── Widget Data Providers ──────────────────────────────────

export async function getWidgetData(
  siteId: string,
  widget: DashboardWidget,
): Promise<unknown> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  switch (widget.type) {
    case 'TRAFFIC_CHART': {
      const metrics = await db.trafficMetric.findMany({
        where: { siteId, date: { gte: since30d } },
        select: { date: true, pageViews: true, users: true, sessions: true },
        orderBy: { date: 'asc' },
      });
      return { data: metrics, period: widget.config.period || '30d' };
    }

    case 'REVENUE_CHART': {
      const events = await db.revenueEvent.findMany({
        where: { siteId, createdAt: { gte: since30d } },
        select: { createdAt: true, amount: true, sourceId: true },
        orderBy: { createdAt: 'asc' },
      });
      return { data: events, total: events.reduce((s, e) => s + e.amount, 0) };
    }

    case 'TOP_PERFORMERS': {
      const limit = (widget.config.limit as number) || 5;
      const articles = await db.article.findMany({
        where: { siteId, status: 'PUBLISHED' },
        select: {
          id: true, title: true, rewrittenTitle: true, slug: true,
          trafficMetrics: {
            where: { date: { gte: since30d } },
            select: { pageViews: true },
          },
          revenueEvents: { select: { amount: true } },
        },
        take: 20,
      });

      const scored = articles.map((a) => ({
        id: a.id,
        title: a.rewrittenTitle || a.title,
        slug: a.slug,
        traffic: a.trafficMetrics.reduce((s, m) => s + m.pageViews, 0),
        revenue: a.revenueEvents.reduce((s, r) => s + r.amount, 0),
      }));

      scored.sort((a, b) => b.traffic - a.traffic);
      return { data: scored.slice(0, limit) };
    }

    case 'SUBSCRIBER_GROWTH': {
      const total = await db.subscriber.count({ where: { siteId } });
      const recent = await db.subscriber.count({
        where: { siteId, createdAt: { gte: since30d } },
      });
      const previous = await db.subscriber.count({
        where: {
          siteId,
          createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), lt: since30d },
        },
      });
      return { total, recent, growth: previous > 0 ? ((recent - previous) / previous) * 100 : 0 };
    }

    case 'CONVERSION_RATE': {
      const totalConversions = await db.conversionEvent.count({ where: { siteId, createdAt: { gte: since30d } } });
      const totalPageViews = await db.trafficMetric.aggregate({
        where: { siteId, date: { gte: since30d } },
        _sum: { pageViews: true },
      });
      const pv = totalPageViews._sum.pageViews || 1;
      return { conversions: totalConversions, pageViews: pv, rate: (totalConversions / pv) * 100 };
    }

    case 'RECENT_ACTIVITY': {
      const limit = (widget.config.limit as number) || 10;
      const logs = await db.auditLog.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, action: true, resource: true, resourceId: true, actorEmail: true, createdAt: true },
      });
      return { data: logs };
    }

    case 'AI_INSIGHTS': {
      const articlesCount = await db.article.count({ where: { siteId } });
      const publishedCount = await db.article.count({ where: { siteId, status: 'PUBLISHED' } });
      const subscriberCount = await db.subscriber.count({ where: { siteId } });
      return {
        insights: [
          { label: 'Total Articles', value: articlesCount },
          { label: 'Published', value: publishedCount },
          { label: 'Draft', value: articlesCount - publishedCount },
          { label: 'Subscribers', value: subscriberCount },
        ],
      };
    }

    case 'PERFORMANCE_ALERTS': {
      return { alerts: [], message: 'Alerts will appear here when anomalies are detected.' };
    }

    default:
      return null;
  }
}

// ─── Layout Management ──────────────────────────────────────

const LAYOUTS = new Map<string, DashboardLayout>();

export function getDashboardLayout(siteId: string): DashboardLayout {
  const existing = LAYOUTS.get(siteId);
  if (existing) return existing;

  const layout: DashboardLayout = {
    id: `layout-${siteId}`,
    siteId,
    name: 'Default Dashboard',
    widgets: DEFAULT_WIDGETS,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  LAYOUTS.set(siteId, layout);
  return layout;
}

export function updateDashboardLayout(
  siteId: string,
  widgets: DashboardWidget[],
): DashboardLayout {
  const layout = getDashboardLayout(siteId);
  layout.widgets = widgets;
  layout.updatedAt = new Date().toISOString();
  LAYOUTS.set(siteId, layout);
  return layout;
}

export function addWidget(
  siteId: string,
  widget: Omit<DashboardWidget, 'id'>,
): DashboardWidget {
  const layout = getDashboardLayout(siteId);
  const newWidget: DashboardWidget = {
    ...widget,
    id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  layout.widgets.push(newWidget);
  layout.updatedAt = new Date().toISOString();
  return newWidget;
}

export function removeWidget(siteId: string, widgetId: string): boolean {
  const layout = getDashboardLayout(siteId);
  const idx = layout.widgets.findIndex((w) => w.id === widgetId);
  if (idx === -1) return false;
  layout.widgets.splice(idx, 1);
  layout.updatedAt = new Date().toISOString();
  return true;
}

export function getAvailableWidgetTypes(): { type: WidgetType; label: string; description: string; defaultSize: DashboardWidget['size'] }[] {
  return [
    { type: 'TRAFFIC_CHART', label: 'Traffic Chart', description: 'Page views, visitors, sessions over time', defaultSize: 'lg' },
    { type: 'REVENUE_CHART', label: 'Revenue Chart', description: 'Revenue events and totals', defaultSize: 'md' },
    { type: 'TOP_PERFORMERS', label: 'Top Performers', description: 'Best articles by traffic and revenue', defaultSize: 'md' },
    { type: 'SUBSCRIBER_GROWTH', label: 'Subscriber Growth', description: 'New subscribers and growth rate', defaultSize: 'sm' },
    { type: 'CONVERSION_RATE', label: 'Conversion Rate', description: 'Visitor-to-action conversion', defaultSize: 'sm' },
    { type: 'RECENT_ACTIVITY', label: 'Recent Activity', description: 'Latest audit log entries', defaultSize: 'md' },
    { type: 'AI_INSIGHTS', label: 'AI Insights', description: 'Key metrics at a glance', defaultSize: 'md' },
    { type: 'PERFORMANCE_ALERTS', label: 'Performance Alerts', description: 'Traffic and revenue anomalies', defaultSize: 'lg' },
    { type: 'CONTENT_CALENDAR', label: 'Content Calendar', description: 'Upcoming scheduled articles', defaultSize: 'full' },
    { type: 'ARTICLES_LIST', label: 'Articles List', description: 'Recent articles with status', defaultSize: 'full' },
  ];
}

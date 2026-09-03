"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Activity,
  MousePointerClick,
  Target,
  TrendingUp,
  Search,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getAnalyticsOverview,
  getTrafficStats,
  getSearchStats,
  getConversionStats,
} from "@/lib/api";

// ---------- helpers ----------

const fmtNumber = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString();

const fmtPercent = (n: number | null | undefined) =>
  `${((n ?? 0) * 100).toFixed(1)}%`;

// ---------- skeleton ----------

function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-muted", className)}
      style={style}
    />
  );
}

// ---------- metric card ----------

interface MetricCardData {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sub?: string;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  bgColor,
  sub,
}: MetricCardData) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && (
              <p className="text-xs text-muted-foreground">{sub}</p>
            )}
          </div>
          <div className={cn("rounded-lg p-3", bgColor)}>
            <Icon className={cn("size-5", color)} />
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {change >= 0 ? (
              <ArrowUpRight className="size-3.5 text-green-500" />
            ) : (
              <ArrowDownRight className="size-3.5 text-red-500" />
            )}
            <span
              className={cn(
                "font-medium",
                change >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-8 w-28" />
          </div>
          <SkeletonPulse className="size-11 rounded-lg" />
        </div>
        <div className="mt-3">
          <SkeletonPulse className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- chart tooltip ----------

function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: {fmtNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: {fmtNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

// ---------- conversion colors ----------

const EVENT_COLORS: Record<string, string> = {
  purchase: "#22c55e",
  signup: "#6366f1",
  lead_capture: "#f59e0b",
  click: "#06b6d4",
  download: "#ec4899",
  other: "#94a3b8",
};

const SOURCE_COLORS: Record<string, string> = {
  organic: "#22c55e",
  email: "#f59e0b",
  social: "#6366f1",
  direct: "#06b6d4",
  referral: "#ec4899",
  paid: "#ef4444",
  other: "#94a3b8",
};

// ---------- main component ----------

interface AnalyticsViewProps {
  siteId: string;
}

export function AnalyticsView({ siteId }: AnalyticsViewProps) {
  // ---------- queries ----------

  const overviewQuery = useQuery({
    queryKey: ["analytics-overview", siteId],
    queryFn: () => getAnalyticsOverview(siteId),
  });

  const trafficQuery = useQuery({
    queryKey: ["traffic-stats", siteId],
    queryFn: () => getTrafficStats(siteId),
  });

  const searchQuery = useQuery({
    queryKey: ["search-stats", siteId],
    queryFn: () => getSearchStats(siteId),
  });

  const conversionQuery = useQuery({
    queryKey: ["conversion-stats", siteId],
    queryFn: () => getConversionStats(siteId),
  });

  // ---------- derived data ----------

  const overview = overviewQuery.data ?? {
    totalPageViews: 0,
    totalSessions: 0,
    avgCtr: 0,
    totalConversions: 0,
    pageViewsChange: 0,
    sessionsChange: 0,
    ctrChange: 0,
    conversionsChange: 0,
  avgSessionDuration: 0,
  bounceRate: 0,
  users: 0,
  newUsers: 0,
  returningUsers: 0,
  topPages: [],
  topReferrers: [],
  lastUpdated: null,
  };

  const trafficData = trafficQuery.data ?? {
    daily: [],
    topArticles: [],
  };

  const dailyTraffic = Array.isArray(trafficData.daily)
    ? trafficData.daily
    : (trafficData.dailyStats ?? trafficData.stats ?? []);

  const topTrafficArticles = Array.isArray(trafficData.topArticles)
    ? trafficData.topArticles
    : (trafficData.articles ?? []);

  const sortedTrafficArticles = [...topTrafficArticles].sort(
    (a: any, b: any) =>
      (b.pageViews ?? b.views ?? 0) - (a.pageViews ?? a.views ?? 0)
  );

  const searchData = searchQuery.data ?? {
    queries: [],
    stats: [],
  };

  const searchQueries = Array.isArray(searchData.queries)
    ? searchData.queries
    : (searchData.stats ?? []);

  const sortedSearchQueries = [...searchQueries].sort(
    (a: any, b: any) =>
      (b.impressions ?? 0) - (a.impressions ?? 0)
  );

  const conversionData = conversionQuery.data ?? {
    byEvent: [],
    bySource: [],
    events: [],
    sources: [],
  };

  const byEvent = Array.isArray(conversionData.byEvent)
    ? conversionData.byEvent
    : (conversionData.events ?? []);

  const bySource = Array.isArray(conversionData.bySource)
    ? conversionData.bySource
    : (conversionData.sources ?? []);

  // ---------- loading check ----------

  const isLoading =
    overviewQuery.isLoading ||
    trafficQuery.isLoading ||
    searchQuery.isLoading ||
    conversionQuery.isLoading;

  // ---------- format area chart data ----------

  const areaChartData = dailyTraffic.map((d: any) => ({
    date: d.date
      ? new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : d.label ?? "",
    pageViews: d.pageViews ?? d.views ?? 0,
    sessions: d.sessions ?? 0,
  }));

  // ---------- error check ----------

  const hasError =
    overviewQuery.isError &&
    trafficQuery.isError &&
    searchQuery.isError &&
    conversionQuery.isError;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Traffic, search performance, and conversion insights"
      />
      <div className="flex-1 space-y-6 p-6">
        {/* ===== TOP METRICS ROW ===== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Total Page Views"
                value={fmtNumber(overview.totalPageViews)}
                change={overview.pageViewsChange ?? undefined}
                icon={Eye}
                color="text-sky-500"
                bgColor="bg-sky-500/10"
                sub={`${fmtNumber(overview.users ?? 0)} unique users`}
              />
              <MetricCard
                title="Total Sessions"
                value={fmtNumber(overview.totalSessions)}
                change={overview.sessionsChange ?? undefined}
                icon={Activity}
                color="text-emerald-500"
                bgColor="bg-emerald-500/10"
                sub={
                  overview.avgSessionDuration
                    ? `Avg ${Math.round(overview.avgSessionDuration)}s duration`
                    : undefined
                }
              />
              <MetricCard
                title="Avg CTR (Search)"
                value={fmtPercent(overview.avgCtr)}
                change={overview.ctrChange ?? undefined}
                icon={MousePointerClick}
                color="text-amber-500"
                bgColor="bg-amber-500/10"
                sub={
                  overview.bounceRate !== undefined
                    ? `${fmtPercent(overview.bounceRate)} bounce rate`
                    : undefined
                }
              />
              <MetricCard
                title="Total Conversions"
                value={fmtNumber(overview.totalConversions)}
                change={overview.conversionsChange ?? undefined}
                icon={Target}
                color="text-green-500"
                bgColor="bg-green-500/10"
                sub={
                  overview.totalPageViews > 0
                    ? `${fmtPercent(
                        overview.totalConversions / overview.totalPageViews
                      )} conversion rate`
                    : undefined
                }
              />
            </>
          )}
        </div>

        {/* ===== TRAFFIC TREND ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Traffic Trend</CardTitle>
                <CardDescription>
                  Daily page views and sessions for the last 30 days
                </CardDescription>
              </div>
              {overview.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(overview.lastUpdated), { addSuffix: true })}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonPulse className="h-72 w-full rounded-lg" />
            ) : areaChartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="size-8 text-muted-foreground/50" />
                  <span>No traffic data available yet</span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart
                  data={areaChartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradPageViews"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#0ea5e9"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradSessions"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#22c55e"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="#22c55e"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip content={<AreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    name="Page Views"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#gradPageViews)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#gradSessions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ===== TOP TRAFFIC ARTICLES + SEARCH PERFORMANCE ===== */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Traffic Articles */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-sky-500" />
                <CardTitle className="text-base">
                  Top Traffic Articles
                </CardTitle>
              </div>
              <CardDescription>Pages driving the most visits</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : sortedTrafficArticles.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No article traffic data yet
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Article</TableHead>
                        <TableHead className="text-right">Page Views</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="pr-6 text-right">Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTrafficArticles.slice(0, 10).map((article: any, i: number) => (
                        <TableRow key={article.id ?? i} className="cursor-pointer">
                          <TableCell className="max-w-[200px] truncate pl-6 font-medium">
                            {article.title ?? article.articleTitle ?? article.page ?? `Page ${i + 1}`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtNumber(article.pageViews ?? article.views ?? 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtNumber(article.sessions ?? 0)}
                          </TableCell>
                          <TableCell className="pr-6 text-right tabular-nums">
                            {fmtNumber(article.users ?? article.uniqueViews ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="size-4 text-amber-500" />
                <CardTitle className="text-base">
                  Search Performance
                </CardTitle>
              </div>
              <CardDescription>
                Top search queries driving impressions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : sortedSearchQueries.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No search data available yet
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Query</TableHead>
                        <TableHead className="text-right">Impressions</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="pr-6 text-right">Position</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSearchQueries.slice(0, 10).map((q: any, i: number) => {
                        const impressions = q.impressions ?? 0;
                        const clicks = q.clicks ?? 0;
                        const ctr = impressions > 0 ? clicks / impressions : 0;
                        const position = q.position ?? q.avgPosition ?? 0;

                        return (
                          <TableRow key={i}>
                            <TableCell className="max-w-[160px] truncate pl-6 font-medium">
                              {q.query ?? q.keyword ?? `Query ${i + 1}`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtNumber(impressions)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtNumber(clicks)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "font-mono",
                                  ctr >= 0.1
                                    ? "bg-green-500/10 text-green-600"
                                    : ctr >= 0.03
                                      ? "bg-amber-500/10 text-amber-600"
                                      : "bg-red-500/10 text-red-600"
                                )}
                              >
                                {fmtPercent(ctr)}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-6 text-right tabular-nums">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-mono",
                                  position <= 3
                                    ? "border-green-500/30 text-green-600"
                                    : position <= 10
                                      ? "border-amber-500/30 text-amber-600"
                                      : "border-red-500/30 text-red-600"
                                )}
                              >
                                #{position.toFixed(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== CONVERSION BREAKDOWN ===== */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Event Type */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="size-4 text-green-500" />
                <CardTitle className="text-base">
                  Conversions by Event Type
                </CardTitle>
              </div>
              <CardDescription>What actions are users taking?</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonPulse className="h-64 w-full rounded-lg" />
              ) : byEvent.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No conversion data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={byEvent.map((e: any) => ({
                      name:
                        (e.event ?? e.eventType ?? e.type ?? "other")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c: string) => c.toUpperCase()),
                      value: e.count ?? e.conversions ?? e.value ?? 0,
                      rawKey: e.event ?? e.eventType ?? e.type ?? "other",
                    }))}
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Conversions"
                      radius={[4, 4, 0, 0]}
                      barSize={36}
                    >
                      {byEvent.map((e: any, i: number) => {
                        const key = e.event ?? e.eventType ?? e.type ?? "other";
                        return (
                          <Cell
                            key={i}
                            fill={EVENT_COLORS[key] ?? EVENT_COLORS.other}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* By Source Type */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" />
                <CardTitle className="text-base">
                  Conversions by Source
                </CardTitle>
              </div>
              <CardDescription>
                Which channels drive the most conversions?
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonPulse className="h-64 w-full rounded-lg" />
              ) : bySource.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No conversion source data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={bySource.map((s: any) => ({
                      name:
                        (s.source ?? s.sourceType ?? s.name ?? "other")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c: string) => c.toUpperCase()),
                      value: s.count ?? s.conversions ?? s.value ?? 0,
                      rawKey: s.source ?? s.sourceType ?? s.name ?? "other",
                    }))}
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Conversions"
                      radius={[4, 4, 0, 0]}
                      barSize={36}
                    >
                      {bySource.map((s: any, i: number) => {
                        const key =
                          s.source ?? s.sourceType ?? s.name ?? "other";
                        return (
                          <Cell
                            key={i}
                            fill={SOURCE_COLORS[key] ?? SOURCE_COLORS.other}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

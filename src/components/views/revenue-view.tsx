"use client";
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  MousePointerClick,
  Mail,
  ShoppingCart,
} from "lucide-react";
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
  getRevenueDashboard,
  getRevenueSources,
  getTopMoneyArticles,
  getTrafficFunnel,
  getEmailFunnel,
} from "@/lib/api";

// ---------- helpers ----------

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtCurrency = (n: number | null | undefined) =>
  currencyFmt.format(n ?? 0);

const fmtNumber = (n: number | null | undefined) => (n ?? 0).toLocaleString();

const fmtPercent = (n: number | null | undefined) =>
  `${((n ?? 0) * 100).toFixed(1)}%`;

// ---------- skeleton ----------

function SkeletonPulse({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
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

function MetricCard({ title, value, change, icon: Icon, color, bgColor, sub }: MetricCardData) {
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
            <span className="text-muted-foreground">vs last month</span>
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

// ---------- revenue by source chart ----------

const SOURCE_COLORS: Record<string, string> = {
  affiliate: "#22c55e",
  product: "#f59e0b",
  ads: "#6366f1",
  other: "#94a3b8",
};

const SOURCE_LABELS: Record<string, string> = {
  affiliate: "Affiliate",
  product: "Products",
  ads: "Ad Revenue",
  other: "Other",
};

// ---------- funnel ----------

const TRAFFIC_FUNNEL_STEPS = [
  { key: "visitors", label: "Visitors", color: "bg-sky-500/20 text-sky-700 border-sky-500/30" },
  { key: "engaged", label: "Engaged", color: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" },
  { key: "ctaImpressions", label: "CTA Impressions", color: "bg-amber-500/20 text-amber-700 border-amber-500/30" },
  { key: "ctaClicks", label: "CTA Clicks", color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  { key: "leads", label: "Leads", color: "bg-violet-500/20 text-violet-700 border-violet-500/30" },
  { key: "purchases", label: "Purchases", color: "bg-green-500/20 text-green-700 border-green-500/30" },
  { key: "revenue", label: "Revenue", color: "bg-green-600/20 text-green-800 border-green-600/30", isCurrency: true },
];

const EMAIL_FUNNEL_STEPS = [
  { key: "subscribers", label: "Subscribers", color: "bg-sky-500/20 text-sky-700 border-sky-500/30" },
  { key: "emailsDelivered", label: "Emails Delivered", color: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" },
  { key: "clicks", label: "Clicks", color: "bg-amber-500/20 text-amber-700 border-amber-500/30" },
  { key: "landingPage", label: "Landing Page Views", color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  { key: "purchases", label: "Purchases", color: "bg-green-500/20 text-green-700 border-green-500/30" },
  { key: "revenue", label: "Revenue", color: "bg-green-600/20 text-green-800 border-green-600/30", isCurrency: true },
];

interface FunnelStep {
  key: string;
  label: string;
  color: string;
  isCurrency?: boolean;
}

function FunnelVisualization({
  data,
  steps,
}: {
  data: Record<string, number>;
  steps: FunnelStep[];
}) {
  const values = steps.map((s) => data[s.key] ?? 0);
  const maxVal = Math.max(...values.filter((v) => !steps.find((st) => st.key === (steps.find((s2) => s2.key === steps.find((_: any, i: number) => values[i] === v)?.key) as any)?.isCurrency)), 1);

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, i) => {
        const val = data[step.key] ?? 0;
        const prevVal = i > 0 ? (data[steps[i - 1].key] ?? 0) : null;
        const convRate = prevVal && prevVal > 0 ? val / prevVal : null;
        // Width bar: 100% for first, decreasing based on proportion to max
        const widthPct =
          step.isCurrency
            ? 60
            : maxVal > 0
              ? Math.max(25, Math.round((val / maxVal) * 100))
              : 25;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-2.5 transition-all",
                step.color
              )}
              style={{ width: `${widthPct}%`, minWidth: 160 }}
            >
              <span className="text-sm font-medium">{step.label}</span>
              <span className="text-sm font-bold">
                {step.isCurrency ? fmtCurrency(val) : fmtNumber(val)}
              </span>
            </div>
            {convRate !== null && !step.isCurrency && (
              <span className="w-20 text-right text-xs text-muted-foreground">
                {fmtPercent(convRate)}
              </span>
            )}
            {convRate === null && i > 0 && !step.isCurrency && (
              <span className="w-20" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FunnelSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonPulse
            className="h-10 rounded-lg"
            style={{
              width: `${100 - i * 12}%`,
              minWidth: 160,
            }}
          />
          <SkeletonPulse className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// ---------- tooltip ----------

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium capitalize">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ---------- main component ----------

interface RevenueViewProps {
  siteId: string;
  onEditArticle: (id: string) => void;
}

export function RevenueView({ siteId, onEditArticle }: RevenueViewProps) {
  // ---------- queries ----------

  const dashboardQuery = useQuery({
    queryKey: ["revenue-dashboard", siteId],
    queryFn: () => getRevenueDashboard(siteId),
  });

  const sourcesQuery = useQuery({
    queryKey: ["revenue-sources", siteId],
    queryFn: () => getRevenueSources(siteId),
  });

  const topArticlesQuery = useQuery({
    queryKey: ["top-money-articles", siteId],
    queryFn: () => getTopMoneyArticles(siteId, { limit: 10 }),
  });

  const trafficFunnelQuery = useQuery({
    queryKey: ["traffic-funnel", siteId],
    queryFn: () => getTrafficFunnel(siteId),
  });

  const emailFunnelQuery = useQuery({
    queryKey: ["email-funnel", siteId],
    queryFn: () => getEmailFunnel(siteId),
  });

  // ---------- derived data ----------

  const dashboard = dashboardQuery.data ?? {
    totalRevenue: 0,
    thisMonthRevenue: 0,
    revenuePerVisitor: 0,
    revenuePerArticle: 0,
    totalVisitors: 0,
    totalArticles: 0,
    monthOverMonthChange: 0,
  };

  const sources = Array.isArray(sourcesQuery.data)
    ? sourcesQuery.data
    : (sourcesQuery.data?.sources ?? []);

  const sourceChartData = sources.map((s: any) => ({
    name: SOURCE_LABELS[s.source ?? s.name] ?? s.source ?? s.name,
    value: s.revenue ?? s.value ?? s.amount ?? 0,
    source: s.source ?? s.name ?? "other",
  }));

  const topArticles = Array.isArray(topArticlesQuery.data)
    ? topArticlesQuery.data
    : (topArticlesQuery.data?.articles ?? []);

  const sortedArticles = [...topArticles].sort(
    (a: any, b: any) =>
      (b.revenue ?? b.totalRevenue ?? 0) -
      (a.revenue ?? a.totalRevenue ?? 0)
  );

  const trafficFunnel = trafficFunnelQuery.data ?? {};
  const emailFunnel = emailFunnelQuery.data ?? {};

  // ---------- loading check ----------

  const isLoading =
    dashboardQuery.isLoading ||
    sourcesQuery.isLoading ||
    topArticlesQuery.isLoading ||
    trafficFunnelQuery.isLoading ||
    emailFunnelQuery.isLoading;

  return (
    <>
      <PageHeader
        title="Revenue"
        description="Track earnings, top articles, and conversion funnels"
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
                title="Total Revenue"
                value={fmtCurrency(dashboard.totalRevenue)}
                change={dashboard.monthOverMonthChange ?? undefined}
                icon={DollarSign}
                color="text-green-500"
                bgColor="bg-green-500/10"
                sub="All time"
              />
              <MetricCard
                title="This Month"
                value={fmtCurrency(dashboard.thisMonthRevenue)}
                change={dashboard.monthOverMonthChange ?? undefined}
                icon={TrendingUp}
                color="text-emerald-500"
                bgColor="bg-emerald-500/10"
                sub="Current period"
              />
              <MetricCard
                title="Revenue / Visitor"
                value={fmtCurrency(dashboard.revenuePerVisitor)}
                icon={Users}
                color="text-sky-500"
                bgColor="bg-sky-500/10"
                sub={`${fmtNumber(dashboard.totalVisitors)} visitors`}
              />
              <MetricCard
                title="Revenue / Article"
                value={fmtCurrency(dashboard.revenuePerArticle)}
                icon={FileText}
                color="text-amber-500"
                bgColor="bg-amber-500/10"
                sub={`${fmtNumber(dashboard.totalArticles)} articles`}
              />
            </>
          )}
        </div>

        {/* ===== REVENUE BY SOURCE + TOP ARTICLES ===== */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Revenue by Source Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue by Source</CardTitle>
              <CardDescription>Breakdown of earnings channels</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonPulse className="h-64 w-full rounded-lg" />
              ) : sourceChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No revenue source data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={sourceChartData}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Revenue"
                      radius={[0, 4, 4, 0]}
                      barSize={28}
                    >
                      {sourceChartData.map((entry: any, i: number) => (
                        <Cell
                          key={i}
                          fill={
                            SOURCE_COLORS[entry.source] ??
                            SOURCE_COLORS.other
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Money-Making Articles Table */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">
                Top Money-Making Articles
              </CardTitle>
              <CardDescription>
                Ranked by total revenue generated
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : sortedArticles.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No article revenue data yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Article Title</TableHead>
                      <TableHead className="text-right">Visitors</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">RPM</TableHead>
                      <TableHead className="pr-6 text-right">Conversions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedArticles.slice(0, 10).map((article: any, i: number) => {
                      const visitors = article.visitors ?? article.pageViews ?? 0;
                      const revenue = article.revenue ?? article.totalRevenue ?? 0;
                      const conversions = article.conversions ?? article.purchases ?? 0;
                      const rpm = visitors > 0 ? (revenue / visitors) * 1000 : 0;

                      return (
                        <TableRow
                          key={article.id ?? i}
                          className="cursor-pointer"
                          onClick={() =>
                            article.id && onEditArticle(article.id)
                          }
                        >
                          <TableCell className="max-w-[260px] truncate pl-6 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                #{i + 1}
                              </span>
                              {article.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtNumber(visitors)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-green-500">
                            {fmtCurrency(revenue)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            ${rpm.toFixed(2)}
                          </TableCell>
                          <TableCell className="pr-6 text-right tabular-nums">
                            <Badge variant="secondary" className="font-mono">
                              {fmtNumber(conversions)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== FUNNELS ===== */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Traffic → Money Funnel */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MousePointerClick className="size-4 text-sky-500" />
                <CardTitle className="text-base">
                  Traffic → Money Funnel
                </CardTitle>
              </div>
              <CardDescription>
                From page visit to revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <FunnelSkeleton />
              ) : (
                <FunnelVisualization
                  data={trafficFunnel}
                  steps={TRAFFIC_FUNNEL_STEPS}
                />
              )}
            </CardContent>
          </Card>

          {/* Email → Money Funnel */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-amber-500" />
                <CardTitle className="text-base">
                  Email → Money Funnel
                </CardTitle>
              </div>
              <CardDescription>
                From subscriber to revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <FunnelSkeleton />
              ) : (
                <FunnelVisualization
                  data={emailFunnel}
                  steps={EMAIL_FUNNEL_STEPS}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

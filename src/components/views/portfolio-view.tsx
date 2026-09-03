"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, DollarSign, BarChart3, Users, Target, TrendingUp, TrendingDown, AlertTriangle, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getPortfolioMetrics, getSiteHealth, getSites } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";

const currencyFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function formatCurrency(v: number) { return currencyFmt.format(v); }
function formatCompact(v: number) { return compactFmt.format(v); }

function MetricCard({ title, value, icon: Icon, color, loading }: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; loading: boolean }) {
  return (
    <Card className="p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`rounded-md p-2 ${color}`}><Icon className="h-4 w-4" /></div>
      </div>
      {loading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold tracking-tight">{value}</p>}
    </Card>
  );
}

function InsightCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Card className={`p-4 gap-2 ${danger ? "border-red-300 dark:border-red-800" : ""}`}>
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      {children}
    </Card>
  );
}

function HealthBadge({ score }: { score: number }) {
  const variant = score > 70 ? "default" : score > 40 ? "secondary" : "destructive";
  const label = score > 70 ? "Healthy" : score > 40 ? "Fair" : "At Risk";
  return <Badge variant={variant}>{score}% {label}</Badge>;
}

function getGrowthLabel(rate: number) {
  if (rate > 20) return "Exceptional growth";
  if (rate > 10) return "Strong growth";
  if (rate > 0) return "Growing";
  if (rate === 0) return "Flat";
  return "Declining";
}

export function PortfolioView({ siteId }: { siteId: string }) {
  const { data: portfolio, isLoading: pLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolioMetrics(),
    staleTime: 60000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
    staleTime: 60000,
  });

  const siteHealthQueries = useQuery({
    queryKey: ["site-health-all"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        sites.map((s: any) => getSiteHealth(s.id).then((h: any) => ({ site: s, health: h })))
      );
      return results.filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled").map((r) => r.value);
    },
    staleTime: 60000,
    enabled: sites.length > 0,
  });

  const m = portfolio;
  const loading = pLoading;

  const totalRevenue = m?.totalRevenue ?? 0;
  const totalTraffic = m?.totalTraffic ?? 0;
  const totalSubscribers = m?.totalSubscribers ?? 0;
  const avgRpm = m?.avgRpm ?? 0;
  const growthRate = m?.growthRate ?? 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="Portfolio" description="Cross-site command centre" />

      {/* Section 1: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Total Sites" value={String(sites.length)} icon={Globe} color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" loading={loading} />
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400" loading={loading} />
        <MetricCard title="Total Traffic" value={formatCompact(totalTraffic)} icon={BarChart3} color="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" loading={loading} />
        <MetricCard title="Total Subscribers" value={formatCompact(totalSubscribers)} icon={Users} color="bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400" loading={loading} />
        <MetricCard title="Average RPM" value={`₦${avgRpm.toFixed(2)}`} icon={Target} color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" loading={loading} />
        <MetricCard
          title="Growth Rate"
          value={`${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%`}
          icon={growthRate >= 0 ? TrendingUp : TrendingDown}
          color={growthRate >= 0 ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"}
          loading={loading}
        />
      </div>

      {/* Section 2: Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard title="Top Site">
          {loading ? <Skeleton className="h-12" /> : (
            <div>
              <p className="font-semibold">{m?.topSite?.name || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{m?.topSite ? `${formatCurrency(m.topSite.revenue)} · ${formatCompact(m.topSite.traffic)} views` : "No data yet"}</p>
            </div>
          )}
        </InsightCard>

        <InsightCard title="Top Article">
          {loading ? <Skeleton className="h-12" /> : (
            <div>
              <p className="font-semibold truncate">{m?.topArticle?.title || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{m?.topArticle ? formatCurrency(m.topArticle.revenue) : "No data yet"}</p>
            </div>
          )}
        </InsightCard>

        <InsightCard title="Biggest Opportunity">
          {loading ? <Skeleton className="h-12" /> : (
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{m?.biggestOpportunity?.type || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{m?.biggestOpportunity?.description || "No data yet"}</p>
              </div>
            </div>
          )}
        </InsightCard>

        <InsightCard title="Biggest Risk" danger>
          {loading ? <Skeleton className="h-12" /> : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{m?.biggestRisk?.type || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{m?.biggestRisk?.description || "No data yet"}</p>
              </div>
            </div>
          )}
        </InsightCard>
      </div>

      {/* Section 3: Growth Trend */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base font-semibold">Monthly Revenue Growth</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-16" /> : (
            <div className="flex items-end gap-3">
              <span className={`text-4xl font-bold ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
              </span>
              <ArrowUpRight className={`h-5 w-5 mb-1 ${growthRate >= 0 ? "text-green-600" : "text-red-600 rotate-90"}`} />
              <span className="text-sm text-muted-foreground mb-1">{getGrowthLabel(growthRate)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Site Health Overview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Site Health Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {siteHealthQueries.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16" />
                </Card>
              ))
            : (siteHealthQueries.data ?? []).map((item: any) => (
                <Card key={item.site.id} className="p-4 gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{item.site.name}</p>
                    <HealthBadge score={item.health?.score ?? 0} />
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{item.health?.articles ?? 0} articles</span>
                    <span>·</span>
                    <span>{item.health?.revenue ? formatCurrency(item.health.revenue) : "₦0"}</span>
                  </div>
                </Card>
              ))}
        </div>
      </div>
    </div>
  );
}

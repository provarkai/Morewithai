"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Users,
  DollarSign,
  Mail,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSubscriberStats,
  getConversionStats,
  getAnalyticsOverview,
  getContentOpportunities,
  getRevenueDashboard,
} from "@/lib/api";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function ScoreCircle({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r; // ~251.3
  const offset = circ - (score / 100) * circ;
  const color = score < 30 ? "text-red-500" : score < 60 ? "text-amber-500" : "text-emerald-500";
  const strokeColor = score < 30 ? "stroke-red-500" : score < 60 ? "stroke-amber-500" : "stroke-emerald-500";
  const label = score < 30 ? "Critical — take action" : score < 60 ? "Needs attention" : "Strong growth trajectory";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-24">
        <svg className="-rotate-90 size-24" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" className="stroke-muted" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            className={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${color}`}>
          {Math.round(score)}
        </span>
      </div>
      <p className="text-sm font-medium">Growth Health</p>
      <p className="text-xs text-muted-foreground text-center max-w-[160px]">{label}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const v = priority?.toUpperCase() === "HIGH"
    ? "destructive"
    : priority?.toUpperCase() === "MEDIUM"
      ? "default"
      : "secondary";
  return <Badge variant={v} className="text-[10px] px-1.5 py-0">{priority?.toUpperCase()}</Badge>;
}

function MetricRow({ icon: Icon, label, value, trend }: {
  icon: React.ElementType; label: string; value: string; trend?: { value: string; up: boolean };
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend.up ? "text-emerald-600" : "text-red-500"}`}>
            {trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}
          </span>
        )}
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

export function GrowthCommandCentre({ siteId }: { siteId: string }) {
  const { data: subStats } = useQuery({ queryKey: ["sub-stats", siteId], queryFn: () => getSubscriberStats(siteId) });
  const { data: convStats } = useQuery({ queryKey: ["conv-stats", siteId], queryFn: () => getConversionStats(siteId) });
  const { data: analytics } = useQuery({ queryKey: ["analytics", siteId], queryFn: () => getAnalyticsOverview(siteId) });
  const { data: opps } = useQuery({
    queryKey: ["opportunities", siteId],
    queryFn: () => getContentOpportunities(siteId, { limit: 3, status: "open" }),
  });
  const { data: revData } = useQuery({ queryKey: ["revenue", siteId], queryFn: () => getRevenueDashboard(siteId) });

  // Growth score calculation
  const subGrowthRate = subStats?.growthRate ?? 0;
  const convRate = convStats?.conversionRate ?? 0;
  const contentVelocity = analytics?.contentVelocity ?? analytics?.publishedThisMonth ?? 0;
  const normalizedVelocity = Math.min(contentVelocity / 20, 1) * 100;
  const growthScore = Math.round(
    (Math.min(Math.abs(subGrowthRate) / 10, 1) * 35) +
    (Math.min(convRate / 5, 1) * 35) +
    (normalizedVelocity / 100) * 30
  );

  // Revenue
  const totalRevenue = revData?.totalRevenue ?? revData?.revenue ?? 0;
  const revTrend = revData?.revenueChange ?? revData?.trend ?? 0;
  const sources = revData?.sources ?? revData?.bySource ?? [];
  const topSources = Array.isArray(sources)
    ? sources.slice(0, 3).map((s: any) => ({ name: s.source ?? s.name ?? "Other", amount: s.revenue ?? s.amount ?? 0 }))
    : [];

  // Audience
  const totalSubs = subStats?.total ?? subStats?.totalSubscribers ?? 0;
  const newThisWeek = subStats?.newThisWeek ?? subStats?.newSubscribersThisWeek ?? 0;
  const subGrowth = subStats?.growthRate ?? 0;
  const emailOpenRate = subStats?.emailOpenRate ?? null;
  const topSource = subStats?.topSource ?? subStats?.topConversionSource ?? "—";

  const topOpps = Array.isArray(opps?.opportunities) ? opps.opportunities : Array.isArray(opps) ? opps : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Growth Score */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-0"><CardTitle className="flex items-center gap-2 text-sm"><Target className="size-4" />Growth Score</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          {subStats || convStats || analytics ? (
            <ScoreCircle score={growthScore} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-24 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Wins */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-0"><CardTitle className="flex items-center gap-2 text-sm"><Zap className="size-4" />Quick Wins</CardTitle></CardHeader>
        <CardContent>
          {opps === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
          ) : topOpps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <AlertTriangle className="size-8 mb-2 text-amber-500" />
              <p>No opportunities identified — run a growth analysis</p>
            </div>
          ) : (
            <div className="divide-y">
              {topOpps.slice(0, 3).map((opp: any, i: number) => (
                <div key={opp.id ?? i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={opp.priority ?? "medium"} />
                      {opp.type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{opp.type}</Badge>}
                    </div>
                    <p className="text-sm truncate" title={opp.title}>{opp.title ?? opp.description ?? "Untitled opportunity"}</p>
                    {opp.expectedImpact && <p className="text-xs text-muted-foreground mt-0.5">Impact: {opp.expectedImpact}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 size-8" onClick={() => {}}>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Snapshot */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-0"><CardTitle className="flex items-center gap-2 text-sm"><DollarSign className="size-4" />Revenue</CardTitle></CardHeader>
        <CardContent>
          {revData ? (
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{CURRENCY.format(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="flex items-center gap-1.5">
                {revTrend >= 0 ? (
                  <TrendingUp className="size-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="size-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${revTrend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {revTrend >= 0 ? "+" : ""}{revTrend.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
              {topSources.length > 0 && (
                <div className="divide-y border-t pt-3">
                  {topSources.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-muted-foreground">{s.name}</span>
                      <span className="text-xs font-medium">{CURRENCY.format(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-36" />
              <div className="space-y-2 pt-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audience Overview */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-0"><CardTitle className="flex items-center gap-2 text-sm"><Users className="size-4" />Audience</CardTitle></CardHeader>
        <CardContent>
          {subStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <MetricRow
                icon={Users} label="Total Subscribers"
                value={totalSubs.toLocaleString()}
              />
              <MetricRow
                icon={TrendingUp} label="New This Week"
                value={newThisWeek.toLocaleString()}
                trend={{ value: `${subGrowth >= 0 ? "+" : ""}${subGrowth.toFixed(1)}%`, up: subGrowth >= 0 }}
              />
              <MetricRow
                icon={BarChart3} label="Growth Rate"
                value={`${subGrowth >= 0 ? "+" : ""}${subGrowth.toFixed(1)}%`}
                trend={{ value: subGrowth >= 0 ? "up" : "down", up: subGrowth >= 0 }}
              />
              <MetricRow
                icon={Mail} label="Email Open Rate"
                value={emailOpenRate != null ? `${emailOpenRate.toFixed(1)}%` : "N/A"}
              />
              <MetricRow
                icon={CheckCircle2} label="Top Conversion Source"
                value={typeof topSource === "string" ? topSource : topSource?.name ?? "—"}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-4 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

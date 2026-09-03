"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Users,
  MousePointerClick,
  Target,
  Lightbulb,
  BarChart3,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getTrafficStats, getConversionStats, getTopMoneyOpportunities } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ArticleMonetizationPanelProps {
  articleId: string;
  siteId: string;
}

// ── Default recommendations ──────────────────────────────────
const DEFAULT_RECOMMENDATIONS = [
  "Add Newsletter CTA",
  "Add Lead Magnet",
  "Add Affiliate Offer",
  "Create Related Product",
  "Improve SEO for Higher Traffic",
];

// ── Score color helpers ──────────────────────────────────────
function scoreColor(score: number): string {
  if (score <= 30) return "bg-red-500";
  if (score <= 60) return "bg-amber-500";
  if (score <= 80) return "bg-blue-500";
  return "bg-emerald-500";
}

function scoreTextColor(score: number): string {
  if (score <= 30) return "text-red-500";
  if (score <= 60) return "text-amber-500";
  if (score <= 80) return "text-blue-500";
  return "text-emerald-500";
}

function scoreLabel(score: number): string {
  if (score <= 30) return "Low";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "Good";
  return "Excellent";
}

// ── Metric card ──────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("size-3.5", color)} />
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <p className={cn("text-lg font-bold leading-tight", color)}>{value}</p>
      )}
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────
export function ArticleMonetizationPanel({ articleId, siteId }: ArticleMonetizationPanelProps) {
  const { toast } = useToast();
  const [checkedRecs, setCheckedRecs] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);

  // ── Data fetching ─────────────────────────────────────────
  const trafficQuery = useQuery({
    queryKey: ["traffic-stats", siteId, articleId],
    queryFn: () => getTrafficStats(siteId, { articleId }),
    staleTime: 60 * 1000,
  });

  const conversionQuery = useQuery({
    queryKey: ["conversion-stats", siteId, articleId],
    queryFn: () => getConversionStats(siteId, { articleId }),
    staleTime: 60 * 1000,
  });

  const moneyScoreQuery = useQuery({
    queryKey: ["money-score", siteId],
    queryFn: () => getTopMoneyOpportunities(siteId),
    staleTime: 5 * 60 * 1000,
  });

  const revenueQuery = useQuery({
    queryKey: ["article-revenue", siteId, articleId],
    queryFn: async () => {
      const res = await fetch(
        `/api/revenue/articles?siteId=${siteId}&articleId=${articleId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch revenue");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // ── Derived values ────────────────────────────────────────
  const trafficData = trafficQuery.data;
  const conversionData = conversionQuery.data;
  const revenueData = revenueQuery.data;

  const totalPageViews = trafficData?.totalPageViews ?? trafficData?.pageViews ?? 0;
  const totalRevenue = revenueData?.totalRevenue ?? revenueData?.revenue ?? 0;
  const rpm = totalPageViews > 0 ? ((totalRevenue / totalPageViews) * 1000).toFixed(2) : "0.00";
  const conversionRate = conversionData?.conversionRate ?? conversionData?.rate ?? 0;

  // Find this article's money score
  const allOpportunities = moneyScoreQuery.data?.opportunities ?? moneyScoreQuery.data ?? [];
  const articleMoneyScore = Array.isArray(allOpportunities)
    ? allOpportunities.find((o: any) => o.articleId === articleId)
    : null;
  const moneyScore = articleMoneyScore?.moneyScore ?? articleMoneyScore?.score ?? null;
  const moneyRecs = articleMoneyScore?.recommendations ?? [];

  // Revenue breakdown
  const breakdown = revenueData?.breakdown ?? {
    affiliate: 0,
    product: 0,
    ads: 0,
  };

  // Affiliate offers
  const affiliateOffers = articleMoneyScore?.affiliateOffers ?? articleMoneyScore?.offers ?? [];

  // Recommendations to display
  const recommendations = moneyRecs.length > 0 ? moneyRecs : DEFAULT_RECOMMENDATIONS;

  const isLoading =
    trafficQuery.isLoading ||
    conversionQuery.isLoading ||
    revenueQuery.isLoading ||
    moneyScoreQuery.isLoading;

  const toggleRec = (rec: string) => {
    setCheckedRecs((prev) => {
      const next = new Set(prev);
      if (next.has(rec)) next.delete(rec);
      else next.add(rec);
      return next;
    });
  };

  // ── AI Analysis ───────────────────────────────────────────
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(
        `/api/growth/money-score?siteId=${siteId}&articleId=${articleId}&action=analyze`,
        { method: "POST", credentials: "include" }
      );
      const data = await res.json();
      if (data?.suggestions) {
        setAiSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [data.suggestions]);
        toast({ title: "Analysis complete", description: "AI monetization suggestions generated." });
      } else {
        toast({ title: "Analysis done", description: "No new suggestions found." });
      }
    } catch {
      toast({ title: "Analysis failed", description: "Could not generate AI suggestions.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 p-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="size-4 text-emerald-500" />
        <h3 className="text-sm font-semibold">Monetization</h3>
      </div>

      {/* ── Top Metrics (2x2 grid) ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Users}
          label="Traffic"
          value={totalPageViews >= 1000 ? `${(totalPageViews / 1000).toFixed(1)}k` : String(totalPageViews)}
          color="text-blue-500"
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue"
          value={
            totalRevenue >= 1000
              ? `$${(totalRevenue / 1000).toFixed(1)}k`
              : `$${Number(totalRevenue).toFixed(2)}`
          }
          color="text-emerald-500"
        />
        <MetricCard
          icon={TrendingUp}
          label="RPM"
          value={`$${rpm}`}
          color="text-amber-500"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Conv. Rate"
          value={`${Number(conversionRate * 100).toFixed(1)}%`}
          color="text-violet-500"
        />
      </div>

      {/* ── Money Opportunity Score ─────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Money Opportunity Score
          </span>
        </div>
        {moneyScore != null ? (
          <>
            <div className="flex items-end gap-2 mb-2">
              <span className={cn("text-3xl font-bold", scoreTextColor(moneyScore))}>
                {moneyScore}
              </span>
              <span className="text-xs text-muted-foreground mb-1">
                / 100 · {scoreLabel(moneyScore)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", scoreColor(moneyScore))}
                style={{ width: `${Math.min(100, moneyScore)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 py-2 text-muted-foreground">
            <Target className="size-6 opacity-30" />
            <p className="text-xs">No score available yet</p>
          </div>
        )}
      </Card>

      {/* ── Recommended Actions ─────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="size-3.5 text-amber-500" />
          <span className="text-xs font-medium">Recommended Actions</span>
        </div>
        <ul className="space-y-2">
          {recommendations.map((rec: string, i: number) => {
            const checked = checkedRecs.has(rec);
            return (
              <li key={i} className="flex items-start gap-2">
                <Checkbox
                  id={`rec-${i}`}
                  checked={checked}
                  onCheckedChange={() => toggleRec(rec)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`rec-${i}`}
                  className={cn(
                    "text-xs leading-relaxed cursor-pointer",
                    checked && "line-through text-muted-foreground"
                  )}
                >
                  {rec}
                </label>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ── Revenue Breakdown ───────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Revenue Breakdown
          </span>
        </div>
        <div className="space-y-2">
          {[
            { key: "affiliate", label: "Affiliate", color: "text-emerald-500" },
            { key: "product", label: "Product", color: "text-violet-500" },
            { key: "ads", label: "Ads", color: "text-amber-500" },
          ].map(({ key, label, color }) => {
            const amount = Number(breakdown[key] ?? 0);
            const total = Number(breakdown.affiliate ?? 0) + Number(breakdown.product ?? 0) + Number(breakdown.ads ?? 0);
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", color.replace("text-", "bg-"))} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className={cn("text-xs font-medium", color)}>
                  ${amount.toFixed(2)}
                  {total > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({pct.toFixed(0)}%)
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          {Number(breakdown.affiliate ?? 0) === 0 &&
            Number(breakdown.product ?? 0) === 0 &&
            Number(breakdown.ads ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                No revenue data available
              </p>
            )}
        </div>
      </Card>

      {/* ── Affiliate Offers ────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Affiliate Offers
          </span>
        </div>
        {affiliateOffers.length > 0 ? (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {affiliateOffers.map((offer: any, i: number) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{offer.name ?? offer.title ?? `Offer ${i + 1}`}</p>
                  {offer.commission && (
                    <p className="text-[10px] text-muted-foreground">
                      Commission: {offer.commission}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {offer.network ?? "Affiliate"}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1">
            No affiliate offers available for this article
          </p>
        )}
      </Card>

      {/* ── AI Suggestions ──────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-3.5 text-violet-500" />
          <span className="text-xs font-medium">AI Suggestions</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Analyze Monetization
        </Button>
        {aiSuggestions && aiSuggestions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {aiSuggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <Lightbulb className="size-3 mt-0.5 text-amber-500 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {revenueQuery.error || moneyScoreQuery.error ? (
          <div className="flex items-center gap-2 mt-3 text-xs text-destructive">
            <AlertCircle className="size-3.5" />
            <span>Some data could not be loaded</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

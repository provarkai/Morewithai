"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrafficFunnel } from "@/lib/api";
import { Eye, MousePointerClick, Mail, Users, DollarSign, TrendingDown } from "lucide-react";

interface TrafficFunnelProps {
  siteId: string;
}

interface FunnelData {
  visitors: number;
  ctaImpressions: number;
  ctaClicks: number;
  leads: number;
  purchases: number;
  revenue: number;
  rates: {
    impressionRate: number;
    clickRate: number;
    leadRate: number;
    purchaseRate: number;
    overallRate: number;
  };
}

// ─── Funnel Stage Definition ──────────────────────────────────

interface FunnelStage {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor?: string;
  rateFromPrevious?: number;
}

const STAGE_COLORS = [
  { color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-500" },
  { color: "text-cyan-700 dark:text-cyan-400", bgColor: "bg-cyan-500" },
  { color: "text-teal-700 dark:text-teal-400", bgColor: "bg-teal-500" },
  { color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-500" },
  { color: "text-green-700 dark:text-green-400", bgColor: "bg-green-500" },
];

function buildStages(data: FunnelData): FunnelStage[] {
  const stages: FunnelStage[] = [
    {
      label: "Page Views",
      value: data.visitors,
      icon: <Eye className="size-4" />,
      color: STAGE_COLORS[0].color,
      bgColor: STAGE_COLORS[0].bgColor,
    },
    {
      label: "Email Captures",
      value: data.leads,
      icon: <Mail className="size-4" />,
      color: STAGE_COLORS[2].color,
      bgColor: STAGE_COLORS[2].bgColor,
      rateFromPrevious: data.visitors > 0 ? data.leads / data.visitors : 0,
    },
    {
      label: "CTA Clicks",
      value: data.ctaClicks,
      icon: <MousePointerClick className="size-4" />,
      color: STAGE_COLORS[1].color,
      bgColor: STAGE_COLORS[1].bgColor,
      rateFromPrevious: data.ctaImpressions > 0 ? data.ctaClicks / data.ctaImpressions : 0,
    },
    {
      label: "Purchases",
      value: data.purchases,
      icon: <DollarSign className="size-4" />,
      color: STAGE_COLORS[4].color,
      bgColor: STAGE_COLORS[4].bgColor,
      rateFromPrevious: data.leads > 0 ? data.purchases / data.leads : 0,
    },
  ];
  return stages;
}

// ─── Formatting ───────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ─── Single Funnel Bar ────────────────────────────────────────

function FunnelBar({ stage, maxValue, index }: { stage: FunnelStage; maxValue: number; index: number }) {
  const widthPercent = maxValue > 0 ? Math.max((stage.value / maxValue) * 100, 8) : 8;

  return (
    <div className="flex items-center gap-4">
      {/* Stage label + icon */}
      <div className="flex w-36 shrink-0 items-center gap-2">
        <span className={stage.color}>{stage.icon}</span>
        <span className="text-sm font-medium text-foreground truncate">{stage.label}</span>
      </div>

      {/* Bar */}
      <div className="relative flex-1">
        <div
          className={`h-10 rounded-md ${stage.bgColor || 'bg-primary'} opacity-90 transition-all duration-500 flex items-center justify-end pr-3`}
          style={{ width: `${widthPercent}%` }}
        >
          <span className="text-sm font-semibold text-white tabular-nums drop-shadow-sm">
            {formatCount(stage.value)}
          </span>
        </div>

        {/* Conversion rate tag (shown for stages after the first) */}
        {stage.rateFromPrevious !== undefined && index > 0 && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full ml-2 flex items-center gap-1">
            <TrendingDown className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRate(stage.rateFromPrevious)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="mb-3 size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">No traffic data yet</p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Funnel data will appear once your site starts receiving visitors.
      </p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────

function FunnelSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 flex-1" style={{ width: `${100 - i * 20}%` }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function TrafficFunnel({ siteId }: TrafficFunnelProps) {
  const { data, isLoading, isError } = useQuery<FunnelData>({
    queryKey: ["traffic-funnel", siteId],
    queryFn: () => getTrafficFunnel(siteId),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const stages = data ? buildStages(data) : [];
  const maxValue = stages.length > 0 ? Math.max(...stages.map((s) => s.value)) : 0;
  const isEmpty = data && stages.every((s) => s.value === 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Traffic Funnel</CardTitle>
          {data && !isEmpty && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Overall: {formatRate(data.rates.overallRate)} conversion
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && <FunnelSkeleton />}

        {isError && (
          <p className="py-8 text-center text-sm text-destructive">
            Failed to load funnel data.
          </p>
        )}

        {isEmpty && <EmptyState />}

        {!isLoading && !isError && !isEmpty && (
          <>
            {stages.map((stage, idx) => (
              <FunnelBar
                key={stage.label}
                stage={stage}
                maxValue={maxValue}
                index={idx}
              />
            ))}
            {/* Revenue summary at bottom */}
            {data && data.revenue > 0 && (
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                  ${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

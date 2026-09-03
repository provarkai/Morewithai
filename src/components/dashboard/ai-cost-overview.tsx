"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface AiJobStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costByType: Record<string, number>;
}

interface AiCostOverviewProps {
  stats: AiJobStats | null;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  RESEARCH: 'Research',
  OUTLINE: 'Outline',
  GENERATE: 'Generate',
  SEO: 'SEO Analysis',
  QUALITY: 'Quality Score',
  INTERNAL_LINKS: 'Link Finder',
  TAXONOMY: 'Taxonomy',
  REFRESH_ANALYSIS: 'Refresh Analysis',
  REFRESH_GENERATE: 'Refresh Generate',
};

function formatCost(cost: number): string {
  if (cost < 0.01) return '< $0.01';
  return '$' + cost.toFixed(2);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function AiCostOverview({ stats }: AiCostOverviewProps) {
  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI Usage & Cost</CardTitle>
          <CardDescription>Token usage and estimated costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <DollarSign className="size-8 opacity-30" />
            <p className="text-sm">No AI usage data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const costEntries = Object.entries(stats.costByType)
    .filter(([, cost]) => cost > 0)
    .sort((a, b) => b[1] - a[1]);

  const successRate = stats.totalJobs > 0
    ? Math.round((stats.completedJobs / stats.totalJobs) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">AI Usage & Cost</CardTitle>
        <CardDescription>Token usage and estimated costs</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary row */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-lg font-bold tabular-nums">{formatCost(stats.totalCost)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <div className="flex items-baseline gap-1">
              <p className="text-lg font-bold tabular-nums">{successRate}%</p>
              {stats.runningJobs > 0 && <Loader2 className="size-3 animate-spin text-blue-500" />}
            </div>
          </div>
        </div>

        {/* Job counts */}
        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-500" /> {stats.completedJobs} done</span>
          <span className="flex items-center gap-1"><XCircle className="size-3 text-red-500" /> {stats.failedJobs} failed</span>
          <span className="flex items-center gap-1"><Loader2 className="size-3 text-blue-500" /> {stats.runningJobs} running</span>
          <span className="ml-auto">{formatTokens(stats.totalInputTokens)} in / {formatTokens(stats.totalOutputTokens)} out</span>
        </div>

        {/* Cost breakdown by type */}
        {costEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Cost by Type</p>
            {costEntries.slice(0, 6).map(([type, cost]) => {
              const pct = stats.totalCost > 0 ? (cost / stats.totalCost) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 truncate text-muted-foreground">{JOB_TYPE_LABELS[type] || type}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="w-12 text-right tabular-nums font-medium">{formatCost(cost)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
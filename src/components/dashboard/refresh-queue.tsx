"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Clock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshCandidate {
  id: string;
  title: string;
  freshnessStatus: string;
  daysSinceUpdate: number;
  suggestedReason: string;
}

interface RefreshQueueProps {
  refreshCandidates: RefreshCandidate[];
  onEditArticle?: (articleId: string) => void;
}

const FRESHNESS_STYLES: Record<string, string> = {
  FRESH: 'bg-emerald-100 text-emerald-700',
  AGING: 'bg-amber-100 text-amber-700',
  STALE: 'bg-orange-100 text-orange-700',
  OUTDATED: 'bg-red-100 text-red-700',
};

const REASON_LABELS: Record<string, string> = {
  AGE_30: '30 days old',
  AGE_60: '60 days old',
  AGE_90: '90 days old',
  AGE_180: '180 days old',
  LOW_SEO: 'Low SEO score',
  LOW_QUALITY: 'Low quality',
  MANUAL: 'Manual trigger',
  SCHEDULED: 'Scheduled review',
};

export function RefreshQueue({ refreshCandidates, onEditArticle }: RefreshQueueProps) {
  if (refreshCandidates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Refresh Queue</CardTitle>
          <CardDescription>Articles due for content refresh</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <RefreshCw className="size-8 opacity-30" />
            <p className="text-sm">All articles are fresh</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Refresh Queue</CardTitle>
            <CardDescription>Articles due for content refresh</CardDescription>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700">
            <RefreshCw className="size-3" /> {refreshCandidates.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {refreshCandidates.slice(0, 8).map((candidate) => (
            <button
              key={candidate.id}
              className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 w-full"
              onClick={() => onEditArticle?.(candidate.id)}
            >
              <div className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                FRESHNESS_STYLES[candidate.freshnessStatus] || 'bg-gray-100 text-gray-600'
              )}>
                <Clock className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{candidate.title}</p>
                <p className="text-xs text-muted-foreground">
                  {candidate.daysSinceUpdate}d ago · {REASON_LABELS[candidate.suggestedReason] || candidate.suggestedReason}
                </p>
              </div>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

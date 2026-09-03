"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, RefreshCw, Eye, FileEdit, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttentionItem {
  id: string;
  title: string;
  type: 'review' | 'refresh' | 'failed' | 'no-seo' | 'no-quality' | 'updated';
  meta?: string;
}

interface AttentionQueueProps {
  needsReview: number;
  needsRefresh: number;
  refreshCandidates: Array<{ id: string; title: string; freshnessStatus: string; daysSinceUpdate: number; suggestedReason: string }>;
  recentArticles: Array<{ id: string; title: string; status: string; seoScore?: number | null; qualityScore?: number | null }>;
  aiFailedJobs?: number;
  onEditArticle?: (articleId: string) => void;
}

const ATTENTION_ICONS = {
  review: Eye,
  refresh: RefreshCw,
  failed: Wrench,
  'no-seo': FileEdit,
  'no-quality': FileEdit,
  updated: Eye,
};

const ATTENTION_COLORS = {
  review: 'text-amber-600 bg-amber-500/10',
  refresh: 'text-orange-600 bg-orange-500/10',
  failed: 'text-red-600 bg-red-500/10',
  'no-seo': 'text-sky-600 bg-sky-500/10',
  'no-quality': 'text-violet-600 bg-violet-500/10',
  updated: 'text-blue-600 bg-blue-500/10',
};

export function AttentionQueue({ needsReview, needsRefresh, refreshCandidates, recentArticles, aiFailedJobs = 0, onEditArticle }: AttentionQueueProps) {
  const items: AttentionItem[] = [];

  // Articles awaiting review
  const reviewArticles = recentArticles.filter((a) =>
    ['APPROVED', 'UPDATED', 'AI_REVIEW', 'EDITOR_REVIEW'].includes(a.status)
  );
  for (const a of reviewArticles.slice(0, 3)) {
    items.push({ id: a.id, title: a.title, type: 'review', meta: a.status });
  }

  // Articles needing refresh (from candidates)
  for (const c of refreshCandidates.slice(0, 3)) {
    items.push({ id: c.id, title: c.title, type: 'refresh', meta: `${c.daysSinceUpdate}d old · ${c.freshnessStatus}` });
  }

  // Articles with missing scores
  for (const a of recentArticles) {
    if (a.status === 'PUBLISHED' || a.status === 'published') {
      if (!a.seoScore && items.length < 10) {
        items.push({ id: a.id, title: a.title, type: 'no-seo', meta: 'No SEO score' });
      }
      if (!a.qualityScore && items.length < 10) {
        items.push({ id: a.id, title: a.title, type: 'no-quality', meta: 'No quality score' });
      }
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attention Queue</CardTitle>
          <CardDescription>Items that need your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <AlertCircle className="size-8 opacity-30" />
            <p className="text-sm">All clear — nothing needs attention</p>
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
            <CardTitle className="text-base">Attention Queue</CardTitle>
            <CardDescription>Items that need your attention</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {needsReview > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Eye className="size-3" /> {needsReview}
              </span>
            )}
            {needsRefresh > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700">
                <RefreshCw className="size-3" /> {needsRefresh}
              </span>
            )}
            {aiFailedJobs > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700">
                <Wrench className="size-3" /> {aiFailedJobs}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const Icon = ATTENTION_ICONS[item.type] || AlertTriangle;
            const colors = ATTENTION_COLORS[item.type] || 'text-gray-600 bg-gray-500/10';
            return (
              <button
                key={item.id + item.type}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 w-full",
                  item.type === 'failed' && 'border-red-200'
                )}
                onClick={() => onEditArticle?.(item.id)}
              >
                <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", colors)}>
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.meta && (
                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

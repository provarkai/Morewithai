"use client";

import { Clock, User, Tag, BarChart3, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/api";

interface ArticleStatusBarProps {
  article: Article;
}

function ScoreBadge({ label, score, icon: Icon, max = 100 }: { label: string; score: number | null | undefined; icon: React.ElementType; max?: number }) {
  if (score == null) return null;
  const pct = (score / max) * 100;
  const color =
    pct >= 80 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" :
    pct >= 60 ? "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" :
    "text-destructive bg-destructive/10";
  return (
    <span className={cn("flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium", color)}>
      <Icon className="size-3" />
      {label} {score}/{max}
    </span>
  );
}

export function ArticleStatusBar({ article }: ArticleStatusBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-t bg-muted/30 text-xs overflow-x-auto">
      <StatusBadge status={article.status} />

      {article.category && (
        <>
          <Separator orientation="vertical" className="h-3.5" />
          <span className="flex items-center gap-1 text-muted-foreground">
            <Tag className="size-3" /> {article.category}
          </span>
        </>
      )}

      {article.author && (
        <>
          <Separator orientation="vertical" className="h-3.5" />
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="size-3" /> {article.author.name}
          </span>
        </>
      )}

      {article.wordCount != null && article.wordCount > 0 && (
        <>
          <Separator orientation="vertical" className="h-3.5" />
          <span className="text-muted-foreground">{article.wordCount} words</span>
          {article.readingTime != null && article.readingTime > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" /> {article.readingTime}min read
            </span>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ScoreBadge label="SEO" score={article.seoScore} icon={Search} />
        <ScoreBadge label="Quality" score={article.qualityScore} icon={BarChart3} />
        {article.seoAnalysis?.overallScore != null && (
          <ScoreBadge label="AI SEO" score={article.seoAnalysis.overallScore} icon={Sparkles} />
        )}
        {article.contentScore?.overallScore != null && (
          <ScoreBadge label="AI Quality" score={article.contentScore.overallScore} icon={Sparkles} />
        )}
      </div>
    </div>
  );
}

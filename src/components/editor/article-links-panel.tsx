"use client";

import { useState, useEffect } from "react";
import { Link2, Plus, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface LinkRecommendation {
  targetArticleId: string;
  targetTitle: string;
  targetSlug?: string;
  relevanceScore: number;
  anchorText: string;
  context?: string;
}

interface ArticleLinksPanelProps {
  articleId: string;
  siteId: string;
  links: LinkRecommendation[];
  isLoading?: boolean;
  onRefresh: () => void;
  onApplyLink: (rec: LinkRecommendation) => void;
}

export function ArticleLinksPanel({
  articleId,
  siteId,
  links,
  isLoading,
  onRefresh,
  onApplyLink,
}: ArticleLinksPanelProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-cyan-500" />
          <h3 className="text-sm font-semibold">Internal Links</h3>
          {links.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{links.length}</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </Button>
      </div>

      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((rec, i) => (
            <div key={i} className="rounded-lg border p-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-tight line-clamp-2">{rec.targetTitle}</p>
                <Badge variant={rec.relevanceScore >= 0.7 ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {Math.round(rec.relevanceScore * 100)}%
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Suggested anchor: <span className="font-medium text-foreground">&ldquo;{rec.anchorText}&rdquo;</span>
              </p>
              {rec.context && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                  ...{rec.context}...
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[11px] gap-1 mt-1"
                onClick={() => {
                  onApplyLink(rec);
                  toast({ title: "Link applied" });
                }}
              >
                <Plus className="size-3" /> Insert Link
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Link2 className="size-8 opacity-30" />
          <p className="text-xs text-center">Run internal link analysis from the AI panel to see suggestions here.</p>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
            Find Internal Links
          </Button>
        </div>
      )}
    </div>
  );
}

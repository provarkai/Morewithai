"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Link2, Loader2, Sparkles, ExternalLink, Check, ArrowRight } from "lucide-react";

interface InternalLinksPanelProps {
  articleId: string;
  siteId: string;
}

export function InternalLinksPanel({ articleId, siteId }: InternalLinksPanelProps) {
  const { toast } = useToast();
  const [appliedLinks, setAppliedLinks] = useState<Set<string>>(new Set());

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ["internal-links", siteId, articleId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/internal-links?siteId=${siteId}&articleId=${articleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load link analysis");
      return res.json();
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ai/internal-links?siteId=${siteId}&articleId=${articleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to analyze links");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Link analysis complete" });
      refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const applyMutation = useMutation({
    mutationFn: async (targetArticleId: string) => {
      const res = await fetch("/api/ai/internal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ articleId, targetArticleId, siteId }),
      });
      if (!res.ok) throw new Error("Failed to apply link");
      return res.json();
    },
    onSuccess: (_, targetId) => {
      setAppliedLinks((prev) => new Set([...prev, targetId]));
      toast({ title: "Link ready to insert", description: "Copy the link from the suggestion" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suggestions = analysis?.suggestions || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="size-4 text-cyan-500" />
              Internal Links
            </CardTitle>
            <CardDescription>AI finds linking opportunities across your content</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}>
            {analyzeMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Sparkles className="size-3.5 mr-1" />}
            Analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link Health */}
        {analysis?.linkHealth && (
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { label: "Internal", value: analysis.linkHealth.internalCount, color: "text-emerald-600" },
              { label: "External", value: analysis.linkHealth.externalCount, color: "text-blue-600" },
              { label: "Nofollow", value: analysis.linkHealth.nofollowCount, color: "text-amber-600" },
              { label: "Broken", value: analysis.linkHealth.brokenCount, color: "text-red-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded border p-1.5">
                <div className={`text-sm font-bold ${color}`}>{value}</div>
                <div className="text-[9px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Analyzing content...
          </div>
        ) : suggestions.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {suggestions.map((s: any, i: number) => (
                <div key={s.id || i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {s.relevanceScore}% match
                        </Badge>
                        {appliedLinks.has(s.targetArticleId) && (
                          <Badge className="text-[10px] bg-emerald-500"><Check className="size-2.5 mr-0.5" /> Applied</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{s.targetTitle}</p>
                    </div>
                    {!appliedLinks.has(s.targetArticleId) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 h-7 text-[10px]"
                        onClick={() => applyMutation.mutate(s.targetArticleId)}
                        disabled={applyMutation.isPending}
                      >
                        <ArrowRight className="size-3 mr-0.5" /> Apply
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Anchor:</span> &ldquo;{s.suggestedAnchor}&rdquo;</p>
                    <p><span className="font-medium text-foreground">Why:</span> {s.reason}</p>
                    {s.contextSnippet && (
                      <p className="italic bg-muted/50 rounded p-1.5 text-[11px]">&ldquo;...{s.contextSnippet}...&rdquo;</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Link2 className="size-8 mx-auto opacity-30 mb-2" />
            <p>No link suggestions yet. Click &ldquo;Analyze&rdquo; to find linking opportunities.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Archive,
  Merge,
  Pencil,
  Eye,
  Loader2,
  Sparkles,
  Share2,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import {
  getContentDecaySummary,
  getContentDecayScores,
  getDistributionScores,
  repurposeArticleForDecay as repurposeArticle,
} from "@/lib/api";

interface ContentDecayViewProps {
  siteId: string;
}

const FRESHNESS_COLORS: Record<string, string> = {
  FRESH: "bg-emerald-500",
  AGING: "bg-amber-500",
  STALE: "bg-orange-500",
  OUTDATED: "bg-red-500",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  NONE: <CheckCircle2 className="size-3.5 text-emerald-500" />,
  REVIEW: <Eye className="size-3.5 text-blue-500" />,
  UPDATE: <Pencil className="size-3.5 text-amber-500" />,
  MERGE: <Merge className="size-3.5 text-orange-500" />,
  ARCHIVE: <Archive className="size-3.5 text-red-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  NONE: "No action needed",
  REVIEW: "Review content",
  UPDATE: "Update article",
  MERGE: "Merge with similar",
  ARCHIVE: "Archive article",
};

export function ContentDecayView({ siteId }: ContentDecayViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["content-decay-summary", siteId],
    queryFn: () => getContentDecaySummary(siteId),
  });

  const { data: scoresData, isLoading: scoresLoading } = useQuery({
    queryKey: ["content-decay-scores", siteId],
    queryFn: () => getContentDecayScores(siteId, 100),
  });

  const { data: distData } = useQuery({
    queryKey: ["distribution-scores", siteId],
    queryFn: () => getDistributionScores(siteId),
  });

  const repurposeMutation = useMutation({
    mutationFn: (articleId: string) => repurposeArticle(articleId, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution-scores", siteId] });
      toast({ title: "Article repurposed successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Repurposing failed", description: err.message, variant: "destructive" });
    },
  });

  const scores = scoresData?.scores ?? [];
  const distribution = distData?.scores ?? [];
  const topDecayed = summary?.topDecayed ?? [];

  const healthScore = summary ? Math.max(0, 100 - summary.avgDecayScore) : 0;

  return (
    <>
      <PageHeader
        title="Content Decay"
        description="Monitor content freshness and repurpose articles across channels"
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Health Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Health Score</span>
                <BarChart3 className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className={`text-2xl font-bold ${healthScore >= 70 ? "text-emerald-600" : healthScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                  {summaryLoading ? "—" : healthScore}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={healthScore} className="mt-2 h-1.5" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Fresh</span>
              </div>
              <span className="text-2xl font-bold">{summaryLoading ? "—" : summary?.FRESH ?? 0}</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-2 rounded-full bg-amber-500" />
                <span className="text-sm text-muted-foreground">Aging</span>
              </div>
              <span className="text-2xl font-bold">{summaryLoading ? "—" : (summary?.AGING ?? 0) + (summary?.STALE ?? 0)}</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-2 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Outdated</span>
              </div>
              <span className="text-2xl font-bold">{summaryLoading ? "—" : summary?.OUTDATED ?? 0}</span>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="decay" className="flex-1">
          <TabsList>
            <TabsTrigger value="decay" className="gap-1.5">
              <TrendingDown className="size-3.5" /> Decay Analysis
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-1.5">
              <Share2 className="size-3.5" /> Distribution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decay" className="space-y-4">
            {/* Action Breakdown */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommended Actions</CardTitle>
                  <CardDescription>What to do with each article based on decay score</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(summary.actionBreakdown).map(([action, count]) => (
                      <div key={action} className="flex items-center gap-2 rounded-lg border p-3">
                        {ACTION_ICONS[action]}
                        <div>
                          <p className="text-lg font-bold">{Number(count)}</p>
                          <p className="text-xs text-muted-foreground">{ACTION_LABELS[action]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decay Scores Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decay Scores</CardTitle>
                <CardDescription>Articles ranked by staleness (highest decay first)</CardDescription>
              </CardHeader>
              <CardContent>
                {scoresLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : scores.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No published articles to analyze</p>
                ) : (
                  <div className="space-y-2">
                    {scores.map((score: any) => (
                      <div key={score.articleId} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className={`size-2 rounded-full shrink-0 ${FRESHNESS_COLORS[score.freshnessStatus]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{score.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{score.freshnessStatus}</span>
                            <span>·</span>
                            <span>{ACTION_LABELS[score.recommendedAction]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className={`text-sm font-bold ${score.decayScore >= 60 ? "text-red-600" : score.decayScore >= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                              {score.decayScore}
                            </span>
                            <p className="text-[10px] text-muted-foreground">decay</p>
                          </div>
                          <div className="w-16">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${score.decayScore >= 60 ? "bg-red-500" : score.decayScore >= 30 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${score.decayScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Distribution Score</CardTitle>
                <CardDescription>How well each article has been repurposed across social channels</CardDescription>
              </CardHeader>
              <CardContent>
                {distribution.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No articles to analyze</p>
                ) : (
                  <div className="space-y-2">
                    {distribution.map((item: any) => (
                      <div key={item.articleId} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.socialPostCount} social post{item.socialPostCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20">
                            <Progress value={item.distributionScore} className="h-1.5" />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{item.distributionScore}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => repurposeMutation.mutate(item.articleId)}
                            disabled={repurposeMutation.isPending}
                          >
                            <Sparkles className="size-3" />
                            {repurposeMutation.isPending ? "..." : "Repurpose"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

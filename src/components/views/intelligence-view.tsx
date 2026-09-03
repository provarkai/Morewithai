"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Target,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  Zap,
  Trophy,
  XCircle,
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
  getContentIntelligence,
  saveContentGaps,
  getBusinessGoals,
  getBusinessStrategy,
  getRevenueForecast,
  getQualityMemoryPerformance,
} from "@/lib/api";

interface IntelligenceViewProps {
  siteId: string;
  onEditArticle?: (id: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  STAR: "bg-amber-500",
  HIGH_POTENTIAL: "bg-blue-500",
  STABLE: "bg-emerald-500",
  DECLINING: "bg-orange-500",
  LOW_VALUE: "bg-red-500",
};

const HEALTH_COLORS: Record<string, string> = {
  EXCELLENT: "text-emerald-600",
  GOOD: "text-blue-600",
  FAIR: "text-amber-600",
  POOR: "text-red-600",
};

export function IntelligenceView({ siteId, onEditArticle }: IntelligenceViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Content Classification
  const { data: classificationData, isLoading: classLoading } = useQuery({
    queryKey: ["content-intelligence", "classify", siteId],
    queryFn: () => getContentIntelligence(siteId, "classify"),
  });

  // Content Gaps
  const { data: gapsData, isLoading: gapsLoading } = useQuery({
    queryKey: ["content-intelligence", "gaps", siteId],
    queryFn: () => getContentIntelligence(siteId, "gaps"),
  });

  // Business Strategy
  const { data: strategy, isLoading: strategyLoading } = useQuery({
    queryKey: ["business-strategy", siteId],
    queryFn: () => getBusinessStrategy(siteId),
  });

  // Revenue Forecast
  const { data: forecastData } = useQuery({
    queryKey: ["revenue-forecast", siteId],
    queryFn: () => getRevenueForecast(siteId, 3),
  });

  // Quality Memory
  const { data: qualityData } = useQuery({
    queryKey: ["quality-memory", siteId],
    queryFn: () => getQualityMemoryPerformance(siteId),
  });

  const saveGapsMutation = useMutation({
    mutationFn: () => saveContentGaps(siteId, gapsData?.gaps || []),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["content-opportunities"] });
      toast({ title: `Saved ${data.created} new opportunities` });
    },
  });

  const classifications = classificationData?.classifications ?? [];
  const summary = classificationData?.summary;
  const gaps = gapsData?.gaps ?? [];
  const forecast = forecastData?.forecast ?? [];
  const qualityPerf = qualityData?.performance ?? [];

  const classSummary = summary
    ? Object.entries(summary).map(([tier, data]: [string, any]) => ({
        tier,
        count: data.count,
        traffic: data.totalTraffic,
        revenue: data.totalRevenue,
      }))
    : [];

  return (
    <>
      <PageHeader
        title="Content Intelligence"
        description="AI-powered content analysis, classification, and business strategy"
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Business Health Banner */}
        {strategy && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="size-5 text-primary" />
                    <h3 className="text-lg font-semibold">Business Strategy</h3>
                    <Badge variant={strategy.overallHealth === "EXCELLENT" || strategy.overallHealth === "GOOD" ? "default" : "destructive"}>
                      {strategy.overallHealth}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{strategy.summary}</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-3xl font-bold">{strategy.healthScore}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    <Progress value={strategy.healthScore} className="h-2 w-48" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                  {strategy.strengths.slice(0, 2).map((s: string, i: number) => (
                    <p key={i} className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> {s}
                    </p>
                  ))}
                  {strategy.weaknesses.slice(0, 2).map((w: string, i: number) => (
                    <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="size-3" /> {w}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="classify" className="flex-1">
          <TabsList>
            <TabsTrigger value="classify" className="gap-1.5">
              <BarChart3 className="size-3.5" /> Classification
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-1.5">
              <Lightbulb className="size-3.5" /> Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1.5">
              <Target className="size-3.5" /> Goals & Forecast
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-1.5">
              <Zap className="size-3.5" /> AI Quality Memory
            </TabsTrigger>
          </TabsList>

          {/* Classification Tab */}
          <TabsContent value="classify" className="space-y-4">
            {/* Tier Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {classSummary.map(({ tier, count, traffic, revenue }) => (
                <Card key={tier}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`size-2 rounded-full ${TIER_COLORS[tier]}`} />
                      <span className="text-xs font-medium">{tier.replace("_", " ")}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {traffic.toLocaleString()} views · ₦{revenue.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Classification List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Article Classification</CardTitle>
                <CardDescription>Content tier ranking based on performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {classLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : classifications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No published articles to classify</p>
                ) : (
                  <div className="space-y-2">
                    {classifications.map((c: any) => (
                      <div key={c.articleId} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className={`size-2 rounded-full shrink-0 ${TIER_COLORS[c.tier]}`} />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                            onClick={() => onEditArticle?.(c.articleId)}
                          >
                            {c.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.recommendation}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold">{c.score}</p>
                            <p className="text-[10px] text-muted-foreground">{c.metrics.monthlyTraffic} views</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {c.tier.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gap Analysis Tab */}
          <TabsContent value="gaps" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Content Gaps</CardTitle>
                  <CardDescription>Missing topics and untapped opportunities</CardDescription>
                </div>
                {gaps.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => saveGapsMutation.mutate()}
                    disabled={saveGapsMutation.isPending}
                  >
                    <Sparkles className="size-3.5 mr-1" />
                    {saveGapsMutation.isPending ? "Saving..." : "Save as Opportunities"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {gapsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : gaps.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No content gaps detected</p>
                ) : (
                  <div className="space-y-2">
                    {gaps.map((gap: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                        <Badge variant={gap.priority === "HIGH" ? "destructive" : gap.priority === "MEDIUM" ? "default" : "secondary"} className="text-[10px]">
                          {gap.priority}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{gap.topic}</p>
                          <p className="text-xs text-muted-foreground">{gap.reason}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {gap.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals & Forecast Tab */}
          <TabsContent value="goals" className="space-y-4">
            {/* Revenue Forecast */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Forecast</CardTitle>
                <CardDescription>Projected revenue based on current trends</CardDescription>
              </CardHeader>
              <CardContent>
                {forecast.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No revenue data for forecasting</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {forecast.map((f: any) => (
                      <div key={f.month} className="rounded-lg border p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{f.month}</p>
                        <p className="text-xl font-bold">₦{f.forecasted.toLocaleString()}</p>
                        <Badge variant={f.confidence === "HIGH" ? "default" : f.confidence === "MEDIUM" ? "secondary" : "outline"} className="text-[10px] mt-1">
                          {f.confidence} confidence
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Actions */}
            {strategy && strategy.recommendedActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommended Actions</CardTitle>
                  <CardDescription>AI-generated priority actions to improve business health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {strategy.recommendedActions.map((action: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                        <Badge variant={action.priority === "HIGH" ? "destructive" : action.priority === "MEDIUM" ? "default" : "secondary"}>
                          {action.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{action.action}</p>
                          <p className="text-xs text-muted-foreground">{action.expectedImpact}</p>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Opportunities & Weaknesses */}
            {strategy && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="size-4 text-amber-500" /> Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {strategy.opportunities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No opportunities identified</p>
                    ) : (
                      <ul className="space-y-2">
                        {strategy.opportunities.map((o: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
                            {o}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-500" /> Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {strategy.weaknesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No weaknesses detected</p>
                    ) : (
                      <ul className="space-y-2">
                        {strategy.weaknesses.map((w: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <XCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* AI Quality Memory Tab */}
          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prompt Performance</CardTitle>
                <CardDescription>Which AI prompts and models produce the best content quality</CardDescription>
              </CardHeader>
              <CardContent>
                {qualityPerf.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No quality data yet — generate articles to start tracking
                  </p>
                ) : (
                  <div className="space-y-3">
                    {qualityPerf.map((perf: any, i: number) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{perf.promptVersion}</Badge>
                            <span className="text-xs text-muted-foreground">{perf.jobType}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{perf.sampleCount} samples</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Quality</p>
                            <div className="flex items-center gap-2">
                              <Progress value={perf.avgQualityScore} className="h-1.5 flex-1" />
                              <span className="text-sm font-bold">{perf.avgQualityScore}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg SEO</p>
                            <div className="flex items-center gap-2">
                              <Progress value={perf.avgSeoScore} className="h-1.5 flex-1" />
                              <span className="text-sm font-bold">{perf.avgSeoScore}</span>
                            </div>
                          </div>
                        </div>
                        {perf.topModels.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">Best model:</span>
                            {perf.topModels.slice(0, 2).map((m: any, j: number) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">
                                {m.model} ({m.avgScore})
                              </Badge>
                            ))}
                          </div>
                        )}
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

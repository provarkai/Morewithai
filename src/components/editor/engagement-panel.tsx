"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Eye, Clock, TrendingUp, Loader2, MousePointerClick, Timer, UserCheck } from "lucide-react";

interface EngagementPanelProps {
  articleId: string;
  siteId: string;
}

const SEGMENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  BOUNCER: { label: "Bouncer", color: "text-red-500", icon: "🚪" },
  SKIMMER: { label: "Skimmer", color: "text-amber-500", icon: "👁" },
  READER: { label: "Reader", color: "text-blue-500", icon: "📖" },
  DEEP_READER: { label: "Deep Reader", color: "text-emerald-500", icon: "📚" },
  POWER_USER: { label: "Power User", color: "text-violet-500", icon: "⚡" },
  CONTENT_JUNKIE: { label: "Content Junkie", color: "text-pink-500", icon: "🔥" },
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function EngagementPanel({ articleId, siteId }: EngagementPanelProps) {
  const { data: engagement, isLoading } = useQuery({
    queryKey: ["engagement", siteId, articleId],
    queryFn: async () => {
      const res = await fetch(`/api/engagement?siteId=${siteId}&articleId=${articleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load engagement data");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-cyan-500" /> Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Loading engagement data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!engagement || engagement.totalVisitors === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-cyan-500" /> Engagement
          </CardTitle>
          <CardDescription>Reader behavior analytics for this article</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Eye className="size-8 mx-auto opacity-30 mb-2" />
            <p>No engagement data yet.</p>
            <p className="text-xs mt-1">Data will appear once the article is published and receives visitors.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalVisitors = engagement.uniqueVisitors || engagement.totalVisitors;
  const maxSegment = Math.max(...Object.values(engagement.segmentDistribution as Record<string, number>), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4 text-cyan-500" /> Engagement
        </CardTitle>
        <CardDescription>{totalVisitors} unique readers analyzed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border p-2 text-center">
            <div className="text-lg font-bold text-primary">{engagement.avgEngagementScore}</div>
            <div className="text-[10px] text-muted-foreground">Avg Score</div>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <div className="text-lg font-bold text-emerald-600">{engagement.avgScrollDepth}%</div>
            <div className="text-[10px] text-muted-foreground">Scroll Depth</div>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <div className="text-lg font-bold text-blue-600">{formatTime(engagement.avgTimeOnPage)}</div>
            <div className="text-[10px] text-muted-foreground">Avg Time</div>
          </div>
        </div>

        {/* Segment Distribution */}
        <div>
          <h4 className="text-sm font-medium mb-2">Reader Segments</h4>
          <div className="space-y-1.5">
            {Object.entries(engagement.segmentDistribution as Record<string, number>)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([segment, count]) => {
                const config = SEGMENT_LABELS[segment] || { label: segment, color: "text-muted-foreground", icon: "•" };
                const pct = totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0;
                return (
                  <div key={segment} className="flex items-center gap-2">
                    <span className="text-xs w-5 text-center">{config.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className={config.color}>{config.label}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/40"
                          style={{ width: `${(count / maxSegment) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Engagement Trend */}
        {engagement.engagementTrend?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <TrendingUp className="size-3.5" /> Trend (last 30 days)
            </h4>
            <div className="flex gap-0.5 items-end h-12">
              {engagement.engagementTrend.slice(-30).map((point: any, i: number) => {
                const maxScore = Math.max(...engagement.engagementTrend.map((p: any) => p.score), 1);
                const height = (point.score / maxScore) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-cyan-500/30 hover:bg-cyan-500/50 transition-colors cursor-default"
                    style={{ height: `${Math.max(2, height)}%` }}
                    title={`${point.date}: score ${point.score}, ${point.visitors} visitors`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Top Readers */}
        {engagement.topReaders?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <UserCheck className="size-3.5" /> Top Readers
            </h4>
            <ScrollArea className="max-h-[150px]">
              <div className="space-y-1">
                {engagement.topReaders.slice(0, 5).map((reader: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                    <span className="font-mono truncate max-w-[120px]">{reader.visitorId.slice(0, 12)}...</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{reader.score}/100</Badge>
                      <span className="text-muted-foreground">{formatTime(reader.timeOnPage)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

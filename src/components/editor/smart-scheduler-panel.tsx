"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, TrendingUp, Loader2, Zap, ChevronRight } from "lucide-react";

interface SmartSchedulerPanelProps {
  articleId: string;
  siteId: string;
}

export function SmartSchedulerPanel({ articleId, siteId }: SmartSchedulerPanelProps) {
  const { toast } = useToast();
  const [scheduleResult, setScheduleResult] = useState<any>(null);

  const { data: recommendation, isLoading: loadingRec } = useQuery({
    queryKey: ["smart-schedule", siteId, articleId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/smart-schedule?siteId=${siteId}&articleId=${articleId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load schedule recommendation");
      return res.json();
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/smart-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ siteId, articleId }),
      });
      if (!res.ok) throw new Error("Failed to generate schedule");
      return res.json();
    },
    onSuccess: (data) => {
      setScheduleResult(data);
      toast({ title: "Schedule suggested", description: `Best time: ${data.recommendedDate} at ${data.recommendedTime}` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-blue-500" />
              Smart Scheduler
            </CardTitle>
            <CardDescription>AI picks the best publish time based on your traffic data</CardDescription>
          </div>
          <Button size="sm" onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
            {suggestMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Zap className="size-3.5 mr-1" />}
            Suggest Time
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingRec ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Analyzing traffic patterns...
          </div>
        ) : recommendation ? (
          <div className="space-y-4">
            {/* Next Best Slot */}
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="size-4 text-primary" />
                <span className="text-sm font-medium">Recommended Publish Time</span>
              </div>
              <p className="text-lg font-semibold">
                {dayNames[recommendation.nextBestSlot?.dayOfWeek || 0]} at{" "}
                {recommendation.nextBestSlot?.score || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {recommendation.nextBestSlot?.reason}
              </p>
            </div>

            {/* Historical Insights */}
            {recommendation.historicalInsights?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" /> Insights
                </h4>
                <ul className="space-y-1">
                  {recommendation.historicalInsights.map((insight: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <ChevronRight className="size-3 mt-0.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Time Slots */}
            <div>
              <h4 className="text-sm font-medium mb-2">Best Time Slots</h4>
              <div className="space-y-1.5">
                {recommendation.bestSlots?.slice(0, 5).map((slot: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium">{dayNames[slot.dayOfWeek]} {slot.hour}:00</span>
                      <span className="text-muted-foreground ml-2">~{slot.estimatedTraffic} avg visitors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={slot.confidence === "HIGH" ? "default" : slot.confidence === "MEDIUM" ? "secondary" : "outline"} className="text-[10px]">
                        {slot.confidence}
                      </Badge>
                      <span className="font-mono text-primary">{slot.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audience Activity Chart (simplified) */}
            <div>
              <h4 className="text-sm font-medium mb-2">Audience Activity</h4>
              <div className="flex gap-0.5 items-end h-16">
                {recommendation.audienceActiveHours?.map((h: any, i: number) => {
                  const maxTraffic = Math.max(...recommendation.audienceActiveHours.map((a: any) => a.avgTraffic), 1);
                  const height = (h.avgTraffic / maxTraffic) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40 transition-colors cursor-default"
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`${h.hour}:00 — ${h.avgTraffic} avg visitors`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Click &quot;Suggest Time&quot; to analyze your traffic patterns and find the optimal publish window.
          </div>
        )}

        {/* Manual schedule result */}
        {scheduleResult && (
          <div className="mt-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="size-4 text-emerald-600" />
              <span className="text-sm font-medium">Suggested Schedule</span>
            </div>
            <p className="text-sm">
              Publish on <strong>{scheduleResult.recommendedDate}</strong> at <strong>{scheduleResult.recommendedTime}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{scheduleResult.reasoning}</p>
            {scheduleResult.alternativeSlots?.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {scheduleResult.alternativeSlots.map((alt: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {alt.date} {alt.time} (score: {alt.score})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

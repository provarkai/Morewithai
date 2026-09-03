"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, TrendingDown, TrendingUp, Loader2, Bell, ArrowRight, Info } from "lucide-react";

interface AlertsViewProps { siteId: string; }

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  WARNING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
  INFO: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
};

const TYPE_ICONS: Record<string, any> = {
  TRAFFIC_DROP: TrendingDown, TRAFFIC_SPIKE: TrendingUp, CTR_DECLINE: TrendingDown,
  REVENUE_DROP: TrendingDown, QUALITY_DROP: AlertTriangle, ENGAGEMENT_DROP: AlertTriangle,
  RANKING_DROP: TrendingDown,
};

export default function AlertsView({ siteId }: AlertsViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["alerts", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/alerts?siteId=${siteId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="size-6 animate-spin" /></div>;

  const alerts = data?.alerts || [];
  const summary = data?.summary;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="size-6" /> Performance Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">Automated monitoring for traffic, revenue, and engagement anomalies</p>
        </div>
        <Badge variant={alerts.length > 0 ? "destructive" : "default"}>{alerts.length} active</Badge>
      </div>

      {summary && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium">{summary.summary}</p>
            {summary.recommendations?.length > 0 && (
              <div className="mt-2 space-y-1">
                {summary.recommendations.map((r: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ArrowRight className="size-3 mt-0.5 shrink-0" /> {r}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {alerts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Info className="size-8 mx-auto mb-2 opacity-50" /><p>All metrics within normal ranges</p></CardContent></Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {alerts.map((alert: any) => {
              const Icon = TYPE_ICONS[alert.type] || AlertTriangle;
              return (
                <Card key={alert.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${SEVERITY_STYLES[alert.severity]}`}><Icon className="size-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold">{alert.title}</h3>
                          <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLES[alert.severity]}`}>{alert.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                          <span>{alert.previousValue} → {alert.currentValue}</span>
                          <span className="font-medium">{alert.changePercent > 0 ? '+' : ''}{alert.changePercent}%</span>
                          <span>threshold: {alert.threshold}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, Loader2, Plus, RefreshCw, TrendingUp, TrendingDown, Users, DollarSign, FileText, Activity } from "lucide-react";

interface CustomDashboardViewProps { siteId: string; }

const WIDGET_ICONS: Record<string, any> = {
  TRAFFIC_CHART: TrendingUp, REVENUE_CHART: DollarSign, TOP_PERFORMERS: FileText,
  SUBSCRIBER_GROWTH: Users, CONVERSION_RATE: Activity, AI_INSIGHTS: LayoutDashboard,
  RECENT_ACTIVITY: Activity, PERFORMANCE_ALERTS: Activity,
};

function WidgetCard({ widget, data }: { widget: any; data: any }) {
  const Icon = WIDGET_ICONS[widget.type] || LayoutDashboard;

  return (
    <Card className={`${widget.size === "lg" ? "col-span-2" : widget.size === "full" ? "col-span-3" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="size-4 text-primary" /> {widget.title}
          </CardTitle>
          <Badge variant="outline" className="text-[9px]">{widget.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data ? <WidgetData type={widget.type} data={data} /> : <div className="text-xs text-muted-foreground">No data</div>}
      </CardContent>
    </Card>
  );
}

function WidgetData({ type, data }: { type: string; data: any }) {
  switch (type) {
    case "TRAFFIC_CHART": {
      const metrics = data.data || [];
      const total = metrics.reduce((s: number, m: any) => s + m.pageViews, 0);
      return (
        <div>
          <div className="text-2xl font-bold">{total.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mb-2">Total page views (30d)</div>
          <div className="flex gap-0.5 items-end h-16">
            {metrics.slice(-30).map((m: any, i: number) => {
              const max = Math.max(...metrics.map((x: any) => x.pageViews), 1);
              return <div key={i} className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40" style={{ height: `${Math.max(2, (m.pageViews / max) * 100)}%` }} title={`${m.pageViews} views`} />;
            })}
          </div>
        </div>
      );
    }
    case "REVENUE_CHART": {
      return (
        <div>
          <div className="text-2xl font-bold">${(data.total || 0).toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">Total revenue (30d)</div>
        </div>
      );
    }
    case "TOP_PERFORMERS": {
      return (
        <div className="space-y-1.5">
          {(data.data || []).slice(0, 5).map((a: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="truncate flex-1">{a.title}</span>
              <span className="text-muted-foreground ml-2">{a.traffic.toLocaleString()} views</span>
            </div>
          ))}
        </div>
      );
    }
    case "SUBSCRIBER_GROWTH": {
      return (
        <div>
          <div className="text-2xl font-bold">{data.total || 0}</div>
          <div className="text-[10px] text-muted-foreground mb-1">Total subscribers</div>
          <div className="flex items-center gap-1 text-xs">
            {data.growth > 0 ? <TrendingUp className="size-3 text-emerald-500" /> : <TrendingDown className="size-3 text-red-500" />}
            <span className={data.growth > 0 ? "text-emerald-600" : "text-red-600"}>{data.growth?.toFixed(1)}%</span>
            <span className="text-muted-foreground">this month</span>
          </div>
        </div>
      );
    }
    case "CONVERSION_RATE": {
      return (
        <div>
          <div className="text-2xl font-bold">{(data.rate || 0).toFixed(2)}%</div>
          <div className="text-[10px] text-muted-foreground">{data.conversions || 0} conversions</div>
        </div>
      );
    }
    case "AI_INSIGHTS": {
      return (
        <div className="grid grid-cols-2 gap-2">
          {(data.insights || []).map((insight: any, i: number) => (
            <div key={i} className="rounded border p-2 text-center">
              <div className="text-lg font-bold">{insight.value}</div>
              <div className="text-[10px] text-muted-foreground">{insight.label}</div>
            </div>
          ))}
        </div>
      );
    }
    case "RECENT_ACTIVITY": {
      return (
        <div className="space-y-1">
          {(data.data || []).slice(0, 5).map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <Badge variant="outline" className="text-[9px]">{a.action}</Badge>
              <span className="text-muted-foreground truncate">{a.resource}</span>
            </div>
          ))}
        </div>
      );
    }
    default:
      return <div className="text-xs text-muted-foreground">Widget data unavailable</div>;
  }
}

export default function CustomDashboardView({ siteId }: CustomDashboardViewProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-widgets", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard-widgets?siteId=${siteId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutDashboard className="size-6" /> Custom Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your personalized metrics overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="size-3.5 mr-1" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.widgetData || []).map((item: any, i: number) => (
          <WidgetCard key={item.widget?.id || i} widget={item.widget} data={item.data} />
        ))}
      </div>
    </div>
  );
}

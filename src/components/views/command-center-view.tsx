"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Globe, DollarSign, Search, Workflow, Bot, PieChart,
  TrendingUp, TrendingDown, Users, Activity, Target, Zap, Shield,
} from "lucide-react";
import {
  getDashboardSnapshot, getHealthScores, getEventStats,
  getCompetitorStats, getAgents, getWorkflows,
} from "@/lib/api";

interface CommandCenterProps {
  siteId: string;
  subView?: string;
}

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "events", label: "Events", icon: Globe },
  { key: "attribution", label: "Attribution", icon: DollarSign },
  { key: "competitors", label: "Competitors", icon: Search },
  { key: "workflows", label: "Workflows", icon: Workflow },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "economics", label: "Economics", icon: PieChart },
] as const;

export function CommandCenterView({ siteId, subView }: CommandCenterProps) {
  const [activeTab, setActiveTab] = useState<string>(subView || "dashboard");

  const { data: snapshot } = useQuery({
    queryKey: ["command-snapshot", siteId],
    queryFn: () => getDashboardSnapshot("default", siteId),
    enabled: activeTab === "dashboard",
  });

  const { data: healthScores = [] } = useQuery({
    queryKey: ["command-health", siteId],
    queryFn: () => getHealthScores("default", siteId),
    enabled: activeTab === "dashboard",
  });

  const { data: eventStats } = useQuery({
    queryKey: ["command-events", siteId],
    queryFn: () => getEventStats("default", siteId),
    enabled: activeTab === "events",
  });

  const { data: competitorStats } = useQuery({
    queryKey: ["command-competitors", siteId],
    queryFn: () => getCompetitorStats("default"),
    enabled: activeTab === "competitors",
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["command-agents"],
    queryFn: () => getAgents(),
    enabled: activeTab === "agents",
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["command-workflows", siteId],
    queryFn: () => getWorkflows("default", siteId),
    enabled: activeTab === "workflows",
  });

  const overallScore = healthScores.find((s: any) => s.metric === "OVERALL")?.score ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Command Centre</h1>
        <p className="text-muted-foreground">Business intelligence and automation hub</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b pb-px overflow-x-auto">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overall Health</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {overallScore}
                <span className="text-sm text-muted-foreground">/ 100</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={overallScore >= 70 ? "default" : overallScore >= 40 ? "secondary" : "destructive"}>
                {overallScore >= 70 ? "Healthy" : overallScore >= 40 ? "Needs Attention" : "Critical"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue</CardDescription>
              <CardTitle className="text-3xl">
                ₦{(snapshot?.revenue ?? 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Profit: ₦{(snapshot?.profit ?? 0).toLocaleString()}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Traffic</CardDescription>
              <CardTitle className="text-3xl">{(snapshot?.traffic ?? 0).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Page views this period</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Leads / Subscribers</CardDescription>
              <CardTitle className="text-3xl">{(snapshot?.leads ?? 0) + (snapshot?.subscribers ?? 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">AI Cost: ₦{(snapshot?.aiCost ?? 0).toLocaleString()}</span>
            </CardContent>
          </Card>

          {/* Health Scores */}
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle>Health Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {healthScores.map((score: any) => (
                  <div key={score.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{score.metric.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">Confidence: {score.confidence}%</p>
                    </div>
                    <div className={`text-xl font-bold ${score.score >= 70 ? "text-green-600" : score.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {score.score}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events (30d)</CardDescription>
              <CardTitle className="text-3xl">{(eventStats?.total ?? 0).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">{eventStats?.uniqueVisitors ?? 0} unique visitors</span>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Events by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(eventStats?.byType ?? []).map((item: any) => (
                  <div key={item.eventType} className="flex items-center justify-between">
                    <Badge variant="outline">{item.eventType}</Badge>
                    <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                  </div>
                ))}
                {(!eventStats?.byType || eventStats.byType.length === 0) && (
                  <p className="text-sm text-muted-foreground">No events recorded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attribution Tab */}
      {activeTab === "attribution" && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Attribution</CardTitle>
            <CardDescription>Track revenue attributed to articles and campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Select a time period to view attribution data. Use the Attribution API to record and query attributed revenue.</p>
          </CardContent>
        </Card>
      )}

      {/* Competitors Tab */}
      {activeTab === "competitors" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tracked Competitors</CardDescription>
              <CardTitle className="text-3xl">{competitorStats?.competitors ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pages Monitored</CardDescription>
              <CardTitle className="text-3xl">{competitorStats?.totalPages ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Changes Detected (30d)</CardDescription>
              <CardTitle className="text-3xl">{competitorStats?.recentChanges ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === "workflows" && (
        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>Automation workflows for your content pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workflows created yet</p>
            ) : (
              <div className="space-y-2">
                {workflows.map((wf: any) => (
                  <div key={wf.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{wf.name}</p>
                      <p className="text-xs text-muted-foreground">{wf.autonomyLevel} · {wf._count?.runs ?? 0} runs</p>
                    </div>
                    <Badge variant={wf.status === "ACTIVE" ? "default" : "secondary"}>{wf.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agents Tab */}
      {activeTab === "agents" && (
        <Card>
          <CardHeader>
            <CardTitle>AI Agents</CardTitle>
            <CardDescription>Autonomous AI agents for your content pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents configured yet</p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent: any) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="size-5 text-primary" />
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.type} · {agent.model ?? "default"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{agent._count?.runs ?? 0} runs</span>
                      <Badge variant={agent.status === "ACTIVE" ? "default" : "secondary"}>{agent.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Economics Tab */}
      {activeTab === "economics" && (
        <Card>
          <CardHeader>
            <CardTitle>Content Economics</CardTitle>
            <CardDescription>Per-article ROI and profitability tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Batch-calculate economics for your articles to see which content generates the most profit.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

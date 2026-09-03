"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Rss,
  FileText,
  Zap,
  CalendarClock,
  Eye,
  RefreshCw,
  Target,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { getDashboard } from "@/lib/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ContentPipeline } from "@/components/dashboard/content-pipeline";
import { AttentionQueue } from "@/components/dashboard/attention-queue";
import { AiCommandCentre } from "@/components/dashboard/ai-command-centre";
import { QualityOverview } from "@/components/dashboard/quality-overview";
import { RefreshQueue } from "@/components/dashboard/refresh-queue";
import { AiCostOverview } from "@/components/dashboard/ai-cost-overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { GrowthCommandCentre } from "@/components/dashboard/growth-command-centre";
import { TrafficFunnel } from "@/components/dashboard/traffic-funnel";
import { formatDistanceToNow } from "date-fns";

interface DashboardViewProps {
  siteId: string;
  onEditArticle?: (articleId: string) => void;
}

export function DashboardView({ siteId, onEditArticle }: DashboardViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", siteId],
    queryFn: () => getDashboard(siteId),
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Overview of your AI publishing engine" />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Loading dashboard...</span>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Overview of your AI publishing engine" />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm">Failed to load dashboard data.</p>
          </div>
        </div>
      </>
    );
  }

  // Metric cards
  const metrics = [
    { title: "Total Articles", value: data.totalArticles, icon: FileText, color: "text-sky-500", bgColor: "bg-sky-500/10" },
    { title: "Published", value: data.publishedArticles, icon: BarChart3, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { title: "Drafts", value: data.draftArticles, icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Scheduled", value: data.scheduledArticles, icon: CalendarClock, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { title: "Needs Review", value: data.needsReview, icon: Eye, color: "text-amber-500", bgColor: "bg-amber-500/10", onClick: () => {} },
    { title: "Needs Refresh", value: data.needsRefresh, icon: RefreshCw, color: "text-red-500", bgColor: "bg-red-500/10" },
    { title: "Avg SEO Score", value: data.avgSeoScore ?? '—', icon: Target, color: "text-violet-500", bgColor: "bg-violet-500/10" },
    { title: "Active Feeds", value: data.activeFeeds, icon: Rss, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your AI publishing engine" />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((stat) => (
            <MetricCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              onClick={("onClick" in stat) ? stat.onClick : undefined}
            />
          ))}
        </div>

        {/* Row 2: Pipeline + Attention Queue */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ContentPipeline
            statusBreakdown={data.statusBreakdown}
            totalArticles={data.totalArticles}
          />
          <AttentionQueue
            needsReview={data.needsReview}
            needsRefresh={data.needsRefresh}
            refreshCandidates={data.refreshCandidates}
            recentArticles={data.recentArticles}
            aiFailedJobs={data.aiJobStats?.failedJobs}
            onEditArticle={onEditArticle}
          />
        </div>

        {/* Row 3: Quality + AI Cost + Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <QualityOverview
            avgSeoScore={data.avgSeoScore}
            avgQualityScore={data.avgQualityScore}
          />
          <AiCostOverview stats={data.aiJobStats} />
          <RecentActivity logs={data.recentLogs} />
        </div>

        {/* Row 4: AI Command Centre */}
        <AiCommandCentre siteId={siteId} onEditArticle={onEditArticle} />

        {/* Row 5: Growth Command Centre + Traffic Funnel */}
        <div className="grid gap-6 lg:grid-cols-3">
          <GrowthCommandCentre siteId={siteId} />
          <TrafficFunnel siteId={siteId} />
        </div>

        {/* Row 6: Refresh Queue */}
        {data.refreshCandidates.length > 0 && (
          <RefreshQueue
            refreshCandidates={data.refreshCandidates}
            onEditArticle={onEditArticle}
          />
        )}

        {/* Row 6: Recent Articles */}
        <div>
          <h3 className="mb-3 text-base font-semibold">Recent Articles</h3>
          <div className="divide-y rounded-lg border bg-card">
            {data.recentArticles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No articles yet. Start by adding RSS feeds or creating content.
              </p>
            ) : (
              data.recentArticles.map((article) => (
                <button
                  key={article.id}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 first:pt-3 last:pb-3"
                  onClick={() => onEditArticle?.(article.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.feed?.name || "Manual"} · {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={article.status} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Sparkles,
  Lightbulb,
  Play,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Loader2,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getContentOpportunities,
  analyzeOpportunities,
  getGrowthRecommendations,
  generateRecommendations,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────

const OPPORTUNITY_TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "NEW_TOPIC", label: "New Topic" },
  { value: "UPDATE", label: "Update" },
  { value: "EXPAND", label: "Expand" },
  { value: "INTERNAL_LINK", label: "Internal Link" },
  { value: "MONETIZE", label: "Monetize" },
  { value: "CONVERSION", label: "Conversion" },
  { value: "SEO", label: "SEO" },
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DISMISSED", label: "Dismissed" },
];

const REC_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DISMISSED", label: "Dismissed" },
];

// ─── Helpers ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  NEW_TOPIC: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  UPDATE: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  EXPAND: "bg-sky-500/15 text-sky-700 border-sky-500/25",
  INTERNAL_LINK: "bg-violet-500/15 text-violet-700 border-violet-500/25",
  MONETIZE: "bg-green-500/15 text-green-700 border-green-500/25",
  CONVERSION: "bg-orange-500/15 text-orange-700 border-orange-500/25",
  SEO: "bg-teal-500/15 text-teal-700 border-teal-500/25",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-700 border-red-500/25",
  HIGH: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  MEDIUM: "bg-blue-500/15 text-blue-700 border-blue-500/25",
  LOW: "bg-gray-500/15 text-gray-600 border-gray-500/25",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-sky-500/15 text-sky-700 border-sky-500/25",
  IN_PROGRESS: "bg-amber-500/15 text-amber-700 border-amber-500/25",
  COMPLETED: "bg-green-500/15 text-green-700 border-green-500/25",
  DISMISSED: "bg-gray-500/15 text-gray-500 border-gray-500/25",
  PENDING: "bg-sky-500/15 text-sky-700 border-sky-500/25",
};

function formatType(type: string) {
  return type.replace(/_/g, " ");
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

// ─── Skeletons ──────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface OpportunitiesViewProps {
  siteId: string;
  onEditArticle: (id: string) => void;
}

export function OpportunitiesView({ siteId, onEditArticle }: OpportunitiesViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("opportunities");

  // Filters - Opportunities
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filters - Recommendations
  const [recPriorityFilter, setRecPriorityFilter] = useState("ALL");
  const [recStatusFilter, setRecStatusFilter] = useState("ALL");

  // ─── Queries ─────────────────────────────────────────────────

  const opportunitiesQuery = useQuery({
    queryKey: ["opportunities", siteId, typeFilter, priorityFilter, statusFilter],
    queryFn: () =>
      getContentOpportunities(siteId, {
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      }),
  });

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", siteId, recPriorityFilter, recStatusFilter],
    queryFn: () =>
      getGrowthRecommendations(siteId, {
        priority: recPriorityFilter !== "ALL" ? recPriorityFilter : undefined,
        status: recStatusFilter !== "ALL" ? recStatusFilter : undefined,
      }),
  });

  // ─── Mutations ───────────────────────────────────────────────

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeOpportunities(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("AI analysis complete. New opportunities found!");
    },
    onError: (err) => toast.error(err.message || "Analysis failed"),
  });

  const generateRecsMutation = useMutation({
    mutationFn: () => generateRecommendations(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Recommendations generated successfully!");
    },
    onError: (err) => toast.error(err.message || "Generation failed"),
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/growth/opportunities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, status }),
        credentials: "include",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (err) => toast.error(err.message || "Update failed"),
  });

  const updateRecommendationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/growth/recommendations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, status }),
        credentials: "include",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (err) => toast.error(err.message || "Update failed"),
  });

  // ─── Derived Data ────────────────────────────────────────────

  const opportunities = Array.isArray(opportunitiesQuery.data)
    ? opportunitiesQuery.data
    : opportunitiesQuery.data?.opportunities ?? [];

  const recommendations = Array.isArray(recommendationsQuery.data)
    ? recommendationsQuery.data
    : recommendationsQuery.data?.recommendations ?? [];

  const allOpportunities = opportunities;
  const oppStats = {
    total: allOpportunities.length,
    open: allOpportunities.filter((o: any) => o.status === "OPEN").length,
    inProgress: allOpportunities.filter((o: any) => o.status === "IN_PROGRESS").length,
    completed: allOpportunities.filter((o: any) => o.status === "COMPLETED").length,
  };

  const allRecommendations = recommendations;
  const recStats = {
    total: allRecommendations.length,
    pending: allRecommendations.filter((r: any) => r.status === "PENDING").length,
    inProgress: allRecommendations.filter((r: any) => r.status === "IN_PROGRESS").length,
    completed: allRecommendations.filter((r: any) => r.status === "COMPLETED").length,
  };

  const isAnalyzing = analyzeMutation.isPending || generateRecsMutation.isPending;

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-6">
        {/* ─── Top Action Bar ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Run AI Analysis
          </Button>
          <Button
            variant="outline"
            onClick={() => generateRecsMutation.mutate()}
            disabled={generateRecsMutation.isPending}
          >
            {generateRecsMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Lightbulb className="mr-2 size-4" />
            )}
            Generate Recommendations
          </Button>
        </div>

        {/* ─── Tabs ────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="opportunities">
              Opportunities
              {oppStats.total > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {oppStats.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              Recommendations
              {recStats.total > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {recStats.total}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ═══════════ OPPORTUNITIES TAB ═══════════════════════ */}
          <TabsContent value="opportunities" className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {opportunitiesQuery.isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold">{oppStats.total}</p>
                        </div>
                        <div className="rounded-lg bg-sky-500/10 p-3">
                          <TrendingUp className="size-5 text-sky-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Open</p>
                          <p className="text-2xl font-bold text-sky-600">{oppStats.open}</p>
                        </div>
                        <div className="rounded-lg bg-sky-500/10 p-3">
                          <FileText className="size-5 text-sky-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">In Progress</p>
                          <p className="text-2xl font-bold text-amber-600">{oppStats.inProgress}</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 p-3">
                          <Play className="size-5 text-amber-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-2xl font-bold text-green-600">{oppStats.completed}</p>
                        </div>
                        <div className="rounded-lg bg-green-500/10 p-3">
                          <CheckCircle2 className="size-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cards List */}
            <div className="space-y-4">
              {opportunitiesQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <OpportunityCardSkeleton key={i} />
                  ))}
                </div>
              ) : opportunitiesQuery.error ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-12">
                    <XCircle className="size-10 text-red-400" />
                    <p className="text-sm text-muted-foreground">
                      Failed to load opportunities
                    </p>
                  </CardContent>
                </Card>
              ) : opportunities.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-12">
                    <SearchX className="size-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No opportunities found. Run AI Analysis to discover growth opportunities.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {opportunities.map((opp: any) => (
                    <Card
                      key={opp.id}
                      className={cn(
                        "transition-shadow hover:shadow-md",
                        opp.status === "COMPLETED" && "opacity-60",
                        opp.status === "DISMISSED" && "opacity-40"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-snug">
                            {opp.articleId ? (
                              <button
                                onClick={() => onEditArticle(opp.articleId)}
                                className="hover:underline text-left"
                              >
                                {opp.title}
                              </button>
                            ) : (
                              opp.title
                            )}
                          </CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", TYPE_COLORS[opp.type] ?? "")}
                          >
                            {formatType(opp.type)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              PRIORITY_COLORS[opp.priority] ?? ""
                            )}
                          >
                            {opp.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[opp.status] ?? ""
                            )}
                          >
                            {formatStatus(opp.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {opp.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {opp.description}
                          </p>
                        )}
                        {opp.expectedImpact && (
                          <div className="rounded-md bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Expected Impact
                            </p>
                            <p className="text-sm">{opp.expectedImpact}</p>
                          </div>
                        )}
                        {opp.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(opp.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                        {opp.status !== "COMPLETED" && opp.status !== "DISMISSED" && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t">
                            {opp.status === "OPEN" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updateOpportunityMutation.isPending}
                                    onClick={() =>
                                      updateOpportunityMutation.mutate({
                                        id: opp.id,
                                        status: "IN_PROGRESS",
                                      })
                                    }
                                  >
                                    <Play className="mr-1 size-3" />
                                    In Progress
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark as In Progress</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updateOpportunityMutation.isPending}
                                  onClick={() =>
                                    updateOpportunityMutation.mutate({
                                      id: opp.id,
                                      status: "COMPLETED",
                                    })
                                  }
                                >
                                  <CheckCircle2 className="mr-1 size-3" />
                                  Complete
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Completed</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-red-500"
                                  disabled={updateOpportunityMutation.isPending}
                                  onClick={() =>
                                    updateOpportunityMutation.mutate({
                                      id: opp.id,
                                      status: "DISMISSED",
                                    })
                                  }
                                >
                                  <XCircle className="mr-1 size-3" />
                                  Dismiss
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Dismiss this opportunity</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════ RECOMMENDATIONS TAB ═════════════════════ */}
          <TabsContent value="recommendations" className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {recommendationsQuery.isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold">{recStats.total}</p>
                        </div>
                        <div className="rounded-lg bg-violet-500/10 p-3">
                          <Lightbulb className="size-5 text-violet-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-2xl font-bold text-sky-600">
                            {recStats.pending}
                          </p>
                        </div>
                        <div className="rounded-lg bg-sky-500/10 p-3">
                          <FileText className="size-5 text-sky-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">In Progress</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {recStats.inProgress}
                          </p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 p-3">
                          <Play className="size-5 text-amber-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-2xl font-bold text-green-600">
                            {recStats.completed}
                          </p>
                        </div>
                        <div className="rounded-lg bg-green-500/10 p-3">
                          <CheckCircle2 className="size-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Recommendation Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={recPriorityFilter} onValueChange={setRecPriorityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={recStatusFilter} onValueChange={setRecStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {REC_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recommendation Cards */}
            <div className="space-y-4">
              {recommendationsQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <OpportunityCardSkeleton key={i} />
                  ))}
                </div>
              ) : recommendationsQuery.error ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-12">
                    <XCircle className="size-10 text-red-400" />
                    <p className="text-sm text-muted-foreground">
                      Failed to load recommendations
                    </p>
                  </CardContent>
                </Card>
              ) : recommendations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-12">
                    <SearchX className="size-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No recommendations yet. Generate some to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {recommendations.map((rec: any) => (
                    <Card
                      key={rec.id}
                      className={cn(
                        "transition-shadow hover:shadow-md",
                        rec.status === "COMPLETED" && "opacity-60",
                        rec.status === "DISMISSED" && "opacity-40"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              PRIORITY_COLORS[rec.priority] ?? ""
                            )}
                          >
                            {rec.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[rec.status] ?? ""
                            )}
                          >
                            {formatStatus(rec.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {rec.problem && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Problem
                            </p>
                            <p className="text-sm text-red-600 line-clamp-2">
                              {rec.problem}
                            </p>
                          </div>
                        )}
                        {rec.opportunity && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Opportunity
                            </p>
                            <p className="text-sm text-green-600 line-clamp-2">
                              {rec.opportunity}
                            </p>
                          </div>
                        )}
                        {rec.recommendedAction && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Recommended Action
                            </p>
                            <p className="text-sm font-bold">
                              {rec.recommendedAction}
                            </p>
                          </div>
                        )}
                        {rec.expectedImpact && (
                          <div className="rounded-md bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Expected Impact
                            </p>
                            <p className="text-sm">{rec.expectedImpact}</p>
                          </div>
                        )}
                        {rec.articleId && (
                          <button
                            onClick={() => onEditArticle(rec.articleId)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="size-3" />
                            View linked article
                          </button>
                        )}
                        {rec.status !== "COMPLETED" && rec.status !== "DISMISSED" && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t">
                            {rec.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updateRecommendationMutation.isPending}
                                onClick={() =>
                                  updateRecommendationMutation.mutate({
                                    id: rec.id,
                                    status: "IN_PROGRESS",
                                  })
                                }
                              >
                                <Play className="mr-1 size-3" />
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateRecommendationMutation.isPending}
                              onClick={() =>
                                updateRecommendationMutation.mutate({
                                  id: rec.id,
                                  status: "COMPLETED",
                                })
                              }
                            >
                              <CheckCircle2 className="mr-1 size-3" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-red-500"
                              disabled={updateRecommendationMutation.isPending}
                              onClick={() =>
                                updateRecommendationMutation.mutate({
                                  id: rec.id,
                                  status: "DISMISSED",
                                })
                              }
                            >
                              <XCircle className="mr-1 size-3" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

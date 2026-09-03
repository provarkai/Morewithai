"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Link2,
  Sparkles,
  Loader2,
  XCircle,
  GripVertical,
  FileText,
  BarChart3,
  Globe,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTopicClusters,
  createTopicCluster,
  updateTopicCluster,
  deleteTopicCluster,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// ─── Helpers ────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getAuthorityColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function getAuthorityTextColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  if (score >= 20) return "text-orange-600";
  return "text-red-600";
}

// ─── Skeletons ──────────────────────────────────────────────────

function ClusterCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Article Row ────────────────────────────────────────────────

function ArticleRow({ article, role }: { article: any; role: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm truncate">{article.title ?? article.id}</span>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-xs",
          role === "PILLAR"
            ? "bg-amber-500/15 text-amber-700 border-amber-500/25"
            : "bg-sky-500/15 text-sky-700 border-sky-500/25"
        )}
      >
        {role === "PILLAR" ? "Pillar" : "Supporting"}
      </Badge>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface ClustersViewProps {
  siteId: string;
}

export function ClustersView({ siteId }: ClustersViewProps) {
  const queryClient = useQueryClient();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [addArticleOpen, setAddArticleOpen] = useState<string | null>(null);
  const [addArticleId, setAddArticleId] = useState("");

  // Create form
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPillarId, setNewPillarId] = useState("");

  // ─── Queries ─────────────────────────────────────────────────

  const clustersQuery = useQuery({
    queryKey: ["topic-clusters", siteId],
    queryFn: () => getTopicClusters(siteId),
  });

  // ─── Mutations ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      description?: string;
      pillarArticleId?: string;
    }) => createTopicCluster(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-clusters"] });
      setCreateOpen(false);
      resetCreateForm();
      toast.success("Cluster created successfully");
    },
    onError: (err) => toast.error(err.message || "Failed to create cluster"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTopicCluster(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-clusters"] });
      toast.success("Cluster deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete cluster"),
  });

  const addArticleMutation = useMutation({
    mutationFn: ({
      clusterId,
      articleId,
    }: {
      clusterId: string;
      articleId: string;
    }) =>
      updateTopicCluster(clusterId, { articleId, action: "add_article" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-clusters"] });
      setAddArticleOpen(null);
      setAddArticleId("");
      toast.success("Article added to cluster");
    },
    onError: (err) => toast.error(err.message || "Failed to add article"),
  });

  const analyzeGapsMutation = useMutation({
    mutationFn: (clusterId: string) =>
      fetch(`/api/growth/clusters/${clusterId}/metrics`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-clusters"] });
      toast.success("Cluster metrics recalculated");
    },
    onError: (err) => toast.error(err.message || "Failed to analyze gaps"),
  });

  const recalculateMutation = useMutation({
    mutationFn: (clusterId: string) =>
      fetch(`/api/growth/clusters/${clusterId}/metrics`, {
        method: "POST",
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-clusters"] });
      toast.success("Metrics recalculated");
    },
    onError: (err) => toast.error(err.message || "Failed to recalculate"),
  });

  // ─── Derived ─────────────────────────────────────────────────

  const clusters = Array.isArray(clustersQuery.data)
    ? clustersQuery.data
    : clustersQuery.data?.clusters ?? [];

  // ─── Form handlers ───────────────────────────────────────────

  function resetCreateForm() {
    setNewName("");
    setNewSlug("");
    setNewDescription("");
    setNewPillarId("");
  }

  function handleNameChange(value: string) {
    setNewName(value);
    if (!newSlug || newSlug === slugify(newName)) {
      setNewSlug(slugify(value));
    }
  }

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      slug: newSlug.trim() || slugify(newName),
      description: newDescription.trim() || undefined,
      pillarArticleId: newPillarId.trim() || undefined,
    });
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-6">
        {/* ─── Top Bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {clusters.length} cluster{clusters.length !== 1 ? "s" : ""}
          </p>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create Cluster
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Topic Cluster</DialogTitle>
                <DialogDescription>
                  Group related articles together to build topical authority.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="cluster-name">Name</Label>
                  <Input
                    id="cluster-name"
                    value={newName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. SEO Guide for Beginners"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cluster-slug">Slug</Label>
                  <Input
                    id="cluster-slug"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="seo-guide-for-beginners"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cluster-desc">Description</Label>
                  <Textarea
                    id="cluster-desc"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What is this cluster about?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pillar-article">Pillar Article ID (optional)</Label>
                  <Input
                    id="pillar-article"
                    value={newPillarId}
                    onChange={(e) => setNewPillarId(e.target.value)}
                    placeholder="Enter article ID"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ─── Clusters List ───────────────────────────────────── */}
        {clustersQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <ClusterCardSkeleton key={i} />
            ))}
          </div>
        ) : clustersQuery.error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 p-12">
              <XCircle className="size-10 text-red-400" />
              <p className="text-sm text-muted-foreground">
                Failed to load clusters
              </p>
            </CardContent>
          </Card>
        ) : clusters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 p-12">
              <GripVertical className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No topic clusters yet. Create one to start organizing your content.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clusters.map((cluster: any) => {
              const articles = Array.isArray(cluster.articles)
                ? cluster.articles
                : [];
              const totalTraffic =
                cluster.totalTraffic ?? cluster.metrics?.totalTraffic ?? 0;
              const avgPosition =
                cluster.avgPosition ?? cluster.metrics?.avgPosition ?? 0;
              const authorityScore =
                cluster.authorityScore ??
                cluster.metrics?.authorityScore ??
                0;
              const displayedArticles = articles.slice(0, 5);

              return (
                <Card
                  key={cluster.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{cluster.name}</CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {cluster.slug}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8">
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit cluster</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              onClick={() => setAddArticleOpen(cluster.id)}
                            >
                              <Link2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add article</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              disabled={analyzeGapsMutation.isPending}
                              onClick={() => analyzeGapsMutation.mutate(cluster.id)}
                            >
                              <Sparkles className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Analyze gaps</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              disabled={recalculateMutation.isPending}
                              onClick={() => recalculateMutation.mutate(cluster.id)}
                            >
                              <RefreshCw
                                className={cn(
                                  "size-4",
                                  recalculateMutation.variables === cluster.id &&
                                    recalculateMutation.isPending &&
                                    "animate-spin"
                                )}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Recalculate metrics</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-muted-foreground hover:text-red-500"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(cluster.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete cluster</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    {cluster.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {cluster.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Articles</span>
                        </div>
                        <p className="mt-0.5 text-lg font-bold">
                          {articles.length}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Traffic</span>
                        </div>
                        <p className="mt-0.5 text-lg font-bold">
                          {formatNumber(totalTraffic)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Search className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Avg Pos</span>
                        </div>
                        <p className="mt-0.5 text-lg font-bold">
                          {avgPosition > 0 ? `#${avgPosition.toFixed(1)}` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Target className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Authority</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress
                            value={authorityScore}
                            className="h-2 flex-1"
                          />
                          <span
                            className={cn(
                              "text-sm font-bold",
                              getAuthorityTextColor(authorityScore)
                            )}
                          >
                            {Math.round(authorityScore)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Article List */}
                    {displayedArticles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Articles ({articles.length}
                          {articles.length > 5 && ", showing first 5"})
                        </p>
                        <div className="space-y-1.5">
                          {displayedArticles.map((article: any) => (
                            <ArticleRow
                              key={article.id}
                              article={article}
                              role={article.role ?? article.clusterArticle?.role ?? "SUPPORTING"}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {articles.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        No articles in this cluster yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ─── Add Article Dialog ──────────────────────────────── */}
        <Dialog
          open={!!addArticleOpen}
          onOpenChange={(open) => {
            if (!open) {
              setAddArticleOpen(null);
              setAddArticleId("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Article to Cluster</DialogTitle>
              <DialogDescription>
                Enter the article ID to add it to this cluster.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-article-id">Article ID</Label>
                <Input
                  id="add-article-id"
                  value={addArticleId}
                  onChange={(e) => setAddArticleId(e.target.value)}
                  placeholder="Enter article ID"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddArticleOpen(null);
                  setAddArticleId("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!addArticleId.trim() || addArticleMutation.isPending}
                onClick={() => {
                  if (addArticleOpen) {
                    addArticleMutation.mutate({
                      clusterId: addArticleOpen,
                      articleId: addArticleId.trim(),
                    });
                  }
                }}
              >
                {addArticleMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Add Article
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

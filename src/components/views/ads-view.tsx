"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  BarChart3,
  DollarSign,
  Power,
  PowerOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getAdPlacements,
  getAdStats,
  createAdPlacement,
  updateAdPlacement,
  deleteAdPlacement,
} from "@/lib/api";

interface AdsViewProps {
  siteId: string;
}

const PLACEMENT_OPTIONS = [
  "HEADER",
  "IN_ARTICLE",
  "SIDEBAR",
  "FOOTER",
] as const;

const placementVariant: Record<string, string> = {
  HEADER:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  IN_ARTICLE:
    "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  SIDEBAR:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  FOOTER:
    "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
};

const enabledVariant: Record<string, string> = {
  true: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  false: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function StatCard({
  title,
  value,
  icon: Icon,
  format = "number",
  currency,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  format?: "number" | "currency";
  currency?: string;
}) {
  const displayValue =
    value !== undefined
      ? format === "currency"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)
        : value.toLocaleString()
      : "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  name: "",
  placement: "IN_ARTICLE",
  provider: "",
  adUnitId: "",
  articleId: "",
  categoryId: "",
  priority: 0,
};

export function AdsView({ siteId }: AdsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const placementsQuery = useQuery({
    queryKey: ["adPlacements", siteId],
    queryFn: () => getAdPlacements(siteId),
  });

  const statsQuery = useQuery({
    queryKey: ["adStats", siteId],
    queryFn: () => getAdStats(siteId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createAdPlacement(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adPlacements"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast({ title: "Ad placement created successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAdPlacement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adPlacements"] });
      toast({ title: "Ad placement updated successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdPlacement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adPlacements"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast({ title: "Ad placement deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      enabled,
    }: {
      id: string;
      enabled: boolean;
    }) => updateAdPlacement(id, { enabled }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adPlacements"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast({
        title: variables.enabled ? "Ad enabled" : "Ad disabled",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Helpers
  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(placement: Record<string, unknown>) {
    setEditing(placement);
    setForm({
      name: (placement.name as string) || "",
      placement: (placement.placement as string) || "IN_ARTICLE",
      provider: (placement.provider as string) || "",
      adUnitId: (placement.adUnitId as string) || "",
      articleId: (placement.articleId as string) || "",
      categoryId: (placement.categoryId as string) || "",
      priority: (placement.priority as number) || 0,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function onSubmit() {
    if (!form.name.trim()) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id as string, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const stats = (statsQuery.data as Record<string, unknown>) || {};
  const placementsData = placementsQuery.data as Record<string, unknown> | undefined;
  const placements =
    Array.isArray(placementsData)
      ? placementsData
      : ((placementsData as unknown as {
          placements?: Record<string, unknown>[];
        })?.placements || []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load ad data
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {(statsQuery.error as Error)?.message || "An unexpected error occurred"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => statsQuery.refetch()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {statsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Placements"
            value={stats.totalPlacements as number}
            icon={LayoutGrid}
          />
          <StatCard
            title="Enabled"
            value={stats.enabledPlacements as number}
            icon={Power}
          />
          <StatCard
            title="Impressions"
            value={stats.totalImpressions as number}
            icon={BarChart3}
          />
          <StatCard
            title="Est. Revenue"
            value={stats.estimatedRevenue as number}
            icon={DollarSign}
            format="currency"
          />
        </div>
      )}

      {/* Placements Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ad Placements</CardTitle>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Placement
          </Button>
        </CardHeader>
        <CardContent>
          {placementsQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : placements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LayoutGrid className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                No ad placements yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Set up ad placements to monetize your content
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Placement
              </Button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placements.map((p) => {
                    const isEnabled = !!(p.enabled as boolean);
                    return (
                      <TableRow key={p.id as string}>
                        <TableCell className="font-medium">
                          {p.name as string}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              placementVariant[(p.placement as string) || ""]
                            )}
                          >
                            {(p.placement as string)?.replace(/_/g, " ") || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.provider as string}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              enabledVariant[String(isEnabled)]
                            )}
                          >
                            {isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.priority as number}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={isEnabled ? "Disable" : "Enable"}
                              onClick={() =>
                                toggleMutation.mutate({
                                  id: p.id as string,
                                  enabled: !isEnabled,
                                })
                              }
                              disabled={toggleMutation.isPending}
                            >
                              {toggleMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isEnabled ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(p.id as string)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Placement" : "Create Ad Placement"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the ad placement configuration."
                : "Add a new ad placement to your site."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ad-name">Name</Label>
              <Input
                id="ad-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g. In-Article Banner"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-placement">Placement</Label>
              <Select
                value={form.placement}
                onValueChange={(v) =>
                  setForm({ ...form, placement: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENT_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-provider">Provider</Label>
              <Input
                id="ad-provider"
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value })
                }
                placeholder="e.g. Google AdSense"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-unit">Ad Unit ID</Label>
              <Input
                id="ad-unit"
                value={form.adUnitId}
                onChange={(e) =>
                  setForm({ ...form, adUnitId: e.target.value })
                }
                placeholder="ca-pub-XXXXXXXXXXXXXX / 1234567890"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ad-article">Article ID (optional)</Label>
                <Input
                  id="ad-article"
                  value={form.articleId}
                  onChange={(e) =>
                    setForm({ ...form, articleId: e.target.value })
                  }
                  placeholder="For specific articles"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ad-category">Category ID (optional)</Label>
                <Input
                  id="ad-category"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  placeholder="For specific categories"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-priority">Priority</Label>
              <Input
                id="ad-priority"
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSaving || !form.name.trim()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Placement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad Placement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ad placement? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteId && deleteMutation.mutate(deleteId)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

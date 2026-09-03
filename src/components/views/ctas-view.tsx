"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MousePointerClick,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Trophy,
  ToggleLeft,
  ToggleRight,
  FlaskConical,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
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
  getCtas,
  getCtaStats,
  getCtaExperiments,
  createCta,
  updateCta,
  deleteCta,
  createCtaExperiment,
  completeCtaExperiment,
} from "@/lib/api";

interface CtasViewProps {
  siteId: string;
}

const CTA_TYPES = ["NEWSLETTER", "LEAD_MAGNET", "AFFILIATE", "PRODUCT", "SERVICE", "DOWNLOAD", "COURSE", "CUSTOM"] as const;
const PLACEMENT_OPTIONS = ["TOP", "AFTER_INTRO", "MID_ARTICLE", "AFTER_SECTION", "BEFORE_CONCLUSION", "AFTER_ARTICLE", "SIDEBAR", "STICKY"] as const;

const ctaStatusVariant: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const experimentStatusVariant: Record<string, string> = {
  RUNNING: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

interface VariantForm {
  name: string;
  headline: string;
  buttonText: string;
  buttonUrl: string;
}

function CtaStatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  isPercent,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  isLoading: boolean;
  isPercent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">
              {isPercent ? `${value.toFixed(1)}%` : value.toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CtasView({ siteId }: CtasViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CTA dialog state
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false);
  const [editingCtaId, setEditingCtaId] = useState<string | null>(null);
  const [ctaForm, setCtaForm] = useState({
    name: "",
    type: "NEWSLETTER" as string,
    headline: "",
    description: "",
    buttonText: "",
    buttonUrl: "",
    targetPlacement: "AFTER_ARTICLE" as string,
  });

  // Experiment dialog state
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    name: "",
    ctaId: "",
    variants: [
      { name: "Variant A", headline: "", buttonText: "", buttonUrl: "" },
      { name: "Variant B", headline: "", buttonText: "", buttonUrl: "" },
    ] as VariantForm[],
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "cta" | "experiment"; id: string } | null>(null);

  // --- QUERIES ---
  const { data: ctaStats, isLoading: ctaStatsLoading } = useQuery({
    queryKey: ["cta-stats", siteId],
    queryFn: () => getCtaStats(siteId),
  });

  const { data: ctasData, isLoading: ctasLoading, isError: ctasError } = useQuery({
    queryKey: ["ctas", siteId],
    queryFn: () => getCtas(siteId),
  });

  const ctas = ctasData?.data ?? ctasData ?? [];

  const { data: experimentsData, isLoading: expsLoading, isError: expsError } = useQuery({
    queryKey: ["cta-experiments", siteId],
    queryFn: () => getCtaExperiments(siteId),
  });

  const experiments = experimentsData?.data ?? experimentsData ?? [];

  // --- MUTATIONS ---
  const createCtaMutation = useMutation({
    mutationFn: (data: typeof ctaForm) => createCta(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ctas"] });
      queryClient.invalidateQueries({ queryKey: ["cta-stats"] });
      closeCtaDialog();
      toast({ title: "CTA created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCtaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof ctaForm }) => updateCta(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ctas"] });
      queryClient.invalidateQueries({ queryKey: ["cta-stats"] });
      closeCtaDialog();
      toast({ title: "CTA updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCtaMutation = useMutation({
    mutationFn: deleteCta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ctas"] });
      queryClient.invalidateQueries({ queryKey: ["cta-stats"] });
      setDeleteTarget(null);
      toast({ title: "CTA deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleCtaMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateCta(id, { isActive } as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ctas"] });
      queryClient.invalidateQueries({ queryKey: ["cta-stats"] });
      toast({ title: "CTA status toggled" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createExpMutation = useMutation({
    mutationFn: (data: { name: string; ctaId: string; variants: VariantForm[] }) =>
      createCtaExperiment(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cta-experiments"] });
      closeExpDialog();
      toast({ title: "Experiment created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const completeExpMutation = useMutation({
    mutationFn: completeCtaExperiment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cta-experiments"] });
      toast({ title: "Experiment completed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteExpMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ctas/experiments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete experiment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cta-experiments"] });
      setDeleteTarget(null);
      toast({ title: "Experiment deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // --- HELPERS ---
  const emptyCtaForm = {
    name: "",
    type: "NEWSLETTER" as string,
    headline: "",
    description: "",
    buttonText: "",
    buttonUrl: "",
    targetPlacement: "AFTER_ARTICLE" as string,
  };

  const closeCtaDialog = () => {
    setCtaDialogOpen(false);
    setEditingCtaId(null);
    setCtaForm(emptyCtaForm);
  };

  const openEditCta = (cta: Record<string, unknown>) => {
    setEditingCtaId(String(cta.id));
    setCtaForm({
      name: String(cta.name ?? ""),
      type: String(cta.type ?? "NEWSLETTER"),
      headline: String(cta.headline ?? ""),
      description: String(cta.description ?? ""),
      buttonText: String(cta.buttonText ?? ""),
      buttonUrl: String(cta.buttonUrl ?? ""),
      targetPlacement: String(cta.targetPlacement ?? "AFTER_ARTICLE"),
    });
    setCtaDialogOpen(true);
  };

  const handleCtaSubmit = () => {
    if (!ctaForm.name.trim()) return;
    if (editingCtaId) {
      updateCtaMutation.mutate({ id: editingCtaId, data: ctaForm });
    } else {
      createCtaMutation.mutate(ctaForm);
    }
  };

  const emptyExpForm = {
    name: "",
    ctaId: "",
    variants: [
      { name: "Variant A", headline: "", buttonText: "", buttonUrl: "" },
      { name: "Variant B", headline: "", buttonText: "", buttonUrl: "" },
    ] as VariantForm[],
  };

  const closeExpDialog = () => {
    setExpDialogOpen(false);
    setExpForm(emptyExpForm);
  };

  const addVariant = () => {
    if (expForm.variants.length >= 5) {
      toast({ title: "Maximum 5 variants allowed", variant: "destructive" });
      return;
    }
    setExpForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        { name: `Variant ${String.fromCharCode(65 + f.variants.length)}`, headline: "", buttonText: "", buttonUrl: "" },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    if (expForm.variants.length <= 2) {
      toast({ title: "Minimum 2 variants required", variant: "destructive" });
      return;
    }
    setExpForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariant = (index: number, field: keyof VariantForm, value: string) => {
    setExpForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    }));
  };

  const handleExpSubmit = () => {
    if (!expForm.name.trim() || !expForm.ctaId) return;
    createExpMutation.mutate(expForm);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CtaStatCard title="Total CTAs" value={ctaStats?.total ?? 0} icon={MousePointerClick} isLoading={ctaStatsLoading} />
        <CtaStatCard title="Total Impressions" value={ctaStats?.totalImpressions ?? 0} icon={Eye} isLoading={ctaStatsLoading} />
        <CtaStatCard title="Total Clicks" value={ctaStats?.totalClicks ?? 0} icon={MousePointerClick} isLoading={ctaStatsLoading} />
        <CtaStatCard title="Avg CTR" value={ctaStats?.avgCtr ?? 0} icon={Trophy} isLoading={ctaStatsLoading} isPercent />
      </div>

      {/* CTA Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Call-to-Actions</CardTitle>
          <Dialog open={ctaDialogOpen} onOpenChange={(open) => !open && closeCtaDialog()}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New CTA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCtaId ? "Edit CTA" : "Create CTA"}</DialogTitle>
                <DialogDescription>{editingCtaId ? "Update this call-to-action." : "Create a new call-to-action for your content."}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="cta-name">Name</Label>
                  <Input id="cta-name" placeholder="Newsletter Signup" value={ctaForm.name} onChange={(e) => setCtaForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={ctaForm.type} onValueChange={(v) => setCtaForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CTA_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Placement</Label>
                    <Select value={ctaForm.targetPlacement} onValueChange={(v) => setCtaForm((f) => ({ ...f, targetPlacement: v }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLACEMENT_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cta-headline">Headline</Label>
                  <Input id="cta-headline" placeholder="Get the latest tips delivered to your inbox" value={ctaForm.headline} onChange={(e) => setCtaForm((f) => ({ ...f, headline: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cta-desc">Description</Label>
                  <Textarea id="cta-desc" rows={3} placeholder="A brief description of what subscribers will get..." value={ctaForm.description} onChange={(e) => setCtaForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cta-btn-text">Button Text</Label>
                  <Input id="cta-btn-text" placeholder="Subscribe Now" value={ctaForm.buttonText} onChange={(e) => setCtaForm((f) => ({ ...f, buttonText: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cta-btn-url">Button URL</Label>
                  <Input id="cta-btn-url" placeholder="/subscribe" value={ctaForm.buttonUrl} onChange={(e) => setCtaForm((f) => ({ ...f, buttonUrl: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCtaDialog}>Cancel</Button>
                <Button
                  onClick={handleCtaSubmit}
                  disabled={createCtaMutation.isPending || updateCtaMutation.isPending || !ctaForm.name.trim()}
                >
                  {(createCtaMutation.isPending || updateCtaMutation.isPending) && <Loader2 className="size-4 animate-spin" />}
                  {editingCtaId ? "Update CTA" : "Create CTA"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {ctasLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : ctasError ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Failed to load CTAs. Please try again.</p>
              </div>
            ) : ctas.length === 0 ? (
              <div className="p-8 text-center">
                <MousePointerClick className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">No CTAs yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Create your first call-to-action to drive conversions.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[110px]">Placement</TableHead>
                      <TableHead className="min-w-[150px]">Headline</TableHead>
                      <TableHead className="w-[110px]">Button</TableHead>
                      <TableHead className="w-[90px] text-right">Impr.</TableHead>
                      <TableHead className="w-[80px] text-right">Clicks</TableHead>
                      <TableHead className="w-[80px] text-right">CTR</TableHead>
                      <TableHead className="w-[90px] text-right">Conv.</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[130px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ctas.map((c: Record<string, unknown>) => {
                      const isActive = c.isActive !== false;
                      const impressions = Number(c.impressions ?? 0);
                      const clicks = Number(c.clicks ?? 0);
                      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                      return (
                        <TableRow key={String(c.id)}>
                          <TableCell className="font-medium text-sm truncate max-w-[140px]">{String(c.name ?? "")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{String(c.type ?? "").replace(/_/g, " ")}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{String(c.targetPlacement ?? "").replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">{String(c.headline ?? "-")}</TableCell>
                          <TableCell className="text-sm">{String(c.buttonText ?? "-")}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{impressions.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{ctr.toFixed(1)}%</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{Number(c.conversions ?? 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs", ctaStatusVariant[isActive ? "active" : "inactive"] ?? "")}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                onClick={() => toggleCtaMutation.mutate({ id: String(c.id), isActive: !isActive })}
                                disabled={toggleCtaMutation.isPending}
                                title={isActive ? "Deactivate" : "Activate"}
                              >
                                {isActive ? <ToggleRight className="size-3 text-emerald-600" /> : <ToggleLeft className="size-3 text-muted-foreground" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                onClick={() => openEditCta(c)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-600 hover:text-red-700"
                                onClick={() => setDeleteTarget({ type: "cta", id: String(c.id) })}
                              >
                                <Trash2 className="size-3" />
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
          </div>
        </CardContent>
      </Card>

      {/* A/B Testing Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="size-4" /> A/B Testing
          </CardTitle>
          <Dialog open={expDialogOpen} onOpenChange={(open) => !open && closeExpDialog()}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New Experiment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create A/B Experiment</DialogTitle>
                <DialogDescription>Set up an A/B test to find the best-performing CTA variant.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="exp-name">Experiment Name</Label>
                  <Input id="exp-name" placeholder="Headline Test - Signup CTA" value={expForm.name} onChange={(e) => setExpForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>CTA to Test</Label>
                  <Select value={expForm.ctaId} onValueChange={(v) => setExpForm((f) => ({ ...f, ctaId: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a CTA" /></SelectTrigger>
                    <SelectContent>
                      {ctas.map((c: Record<string, unknown>) => (
                        <SelectItem key={String(c.id)} value={String(c.id)}>{String(c.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Variants ({expForm.variants.length})</Label>
                    {expForm.variants.length < 5 && (
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addVariant}>
                        <Plus className="size-3" /> Add Variant
                      </Button>
                    )}
                  </div>
                  {expForm.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Variant {String.fromCharCode(65 + vIndex)}</span>
                        {expForm.variants.length > 2 && (
                          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs text-red-600 hover:text-red-700" onClick={() => removeVariant(vIndex)}>
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(e) => updateVariant(vIndex, "name", e.target.value)}
                      />
                      <Input
                        placeholder="Headline"
                        value={variant.headline}
                        onChange={(e) => updateVariant(vIndex, "headline", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Button text"
                          value={variant.buttonText}
                          onChange={(e) => updateVariant(vIndex, "buttonText", e.target.value)}
                        />
                        <Input
                          placeholder="Button URL"
                          value={variant.buttonUrl}
                          onChange={(e) => updateVariant(vIndex, "buttonUrl", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeExpDialog}>Cancel</Button>
                <Button onClick={handleExpSubmit} disabled={createExpMutation.isPending || !expForm.name.trim() || !expForm.ctaId}>
                  {createExpMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Create Experiment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {expsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : expsError ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Failed to load experiments. Please try again.</p>
              </div>
            ) : experiments.length === 0 ? (
              <div className="p-8 text-center">
                <FlaskConical className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">No experiments yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Create an A/B test to optimize your CTAs.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[140px]">CTA</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Impr.</TableHead>
                      <TableHead className="w-[90px] text-right">Clicks</TableHead>
                      <TableHead className="w-[120px]">Winner</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {experiments.map((exp: Record<string, unknown>) => (
                      <TableRow key={String(exp.id)}>
                        <TableCell className="font-medium text-sm">{String(exp.name ?? "")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">{String(exp.ctaName ?? exp.ctaId ?? "-")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", experimentStatusVariant[String(exp.status)] ?? "")}>
                            {String(exp.status ?? "")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{Number(exp.totalImpressions ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{Number(exp.totalClicks ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">
                          {exp.winner ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              <Trophy className="size-3 mr-1" />{String(exp.winner)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {exp.status === "RUNNING" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs text-emerald-600"
                                onClick={() => completeExpMutation.mutate(String(exp.id))}
                                disabled={completeExpMutation.isPending}
                              >
                                <CheckCircle2 className="size-3" />
                                <span className="hidden lg:inline">Complete</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600 hover:text-red-700"
                              onClick={() => setDeleteTarget({ type: "experiment", id: String(exp.id) })}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== DELETE CONFIRMATION ==================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "cta" ? "CTA" : "Experiment"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "cta") {
                  deleteCtaMutation.mutate(deleteTarget.id);
                } else {
                  deleteExpMutation.mutate(deleteTarget.id);
                }
              }}
              disabled={deleteCtaMutation.isPending || deleteExpMutation.isPending}
            >
              {deleteCtaMutation.isPending || deleteExpMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

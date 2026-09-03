"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  DollarSign,
  Link2,
  MousePointerClick,
  ShoppingCart,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getAffiliatePrograms,
  getAffiliateOffers,
  getAffiliateStats,
  createAffiliateProgram,
  updateAffiliateProgram,
  deleteAffiliateProgram,
  createAffiliateOffer,
  updateAffiliateOffer,
  deleteAffiliateOffer,
} from "@/lib/api";

interface AffiliatesViewProps {
  siteId: string;
}

const COMMISSION_TYPES = ["CPA", "CPC", "CPL", "HYBRID", "FLAT", "PERCENTAGE"] as const;

const programStatusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  INACTIVE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const offerStatusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  INACTIVE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
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

const emptyProgramForm = {
  name: "",
  network: "",
  website: "",
  commissionType: "CPA",
  commissionValue: 0,
  cookieDuration: 30,
  terms: "",
};

const emptyOfferForm = {
  name: "",
  programId: "",
  description: "",
  destinationUrl: "",
  affiliateUrl: "",
  category: "",
  commission: 0,
  priority: 0,
};

export function AffiliatesView({ siteId }: AffiliatesViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"programs" | "offers">(
    "programs"
  );

  // Program Dialog state
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [deleteProgramId, setDeleteProgramId] = useState<string | null>(null);

  // Offer Dialog state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [deleteOfferId, setDeleteOfferId] = useState<string | null>(null);

  // Queries - Programs
  const programsQuery = useQuery({
    queryKey: ["affiliatePrograms", siteId],
    queryFn: () => getAffiliatePrograms(siteId),
  });

  const offersQuery = useQuery({
    queryKey: ["affiliateOffers", siteId],
    queryFn: () => getAffiliateOffers(siteId),
  });

  const statsQuery = useQuery({
    queryKey: ["affiliateStats", siteId],
    queryFn: () => getAffiliateStats(siteId),
  });

  // Mutations - Programs
  const createProgramMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createAffiliateProgram(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliatePrograms"] });
      queryClient.invalidateQueries({ queryKey: ["affiliateStats"] });
      toast({ title: "Program created successfully" });
      closeProgramDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAffiliateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliatePrograms"] });
      toast({ title: "Program updated successfully" });
      closeProgramDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id: string) => deleteAffiliateProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliatePrograms"] });
      queryClient.invalidateQueries({ queryKey: ["affiliateStats"] });
      toast({ title: "Program deleted" });
      setDeleteProgramId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Mutations - Offers
  const createOfferMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createAffiliateOffer(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliateOffers"] });
      queryClient.invalidateQueries({ queryKey: ["affiliateStats"] });
      toast({ title: "Offer created successfully" });
      closeOfferDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAffiliateOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliateOffers"] });
      toast({ title: "Offer updated successfully" });
      closeOfferDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id: string) => deleteAffiliateOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliateOffers"] });
      queryClient.invalidateQueries({ queryKey: ["affiliateStats"] });
      toast({ title: "Offer deleted" });
      setDeleteOfferId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Program dialog helpers
  function openCreateProgramDialog() {
    setEditingProgram(null);
    setProgramForm(emptyProgramForm);
    setProgramDialogOpen(true);
  }

  function openEditProgramDialog(program: Record<string, unknown>) {
    setEditingProgram(program);
    setProgramForm({
      name: (program.name as string) || "",
      network: (program.network as string) || "",
      website: (program.website as string) || "",
      commissionType: (program.commissionType as string) || "CPA",
      commissionValue: (program.commissionValue as number) || 0,
      cookieDuration: (program.cookieDuration as number) || 30,
      terms: (program.terms as string) || "",
    });
    setProgramDialogOpen(true);
  }

  function closeProgramDialog() {
    setProgramDialogOpen(false);
    setEditingProgram(null);
    setProgramForm(emptyProgramForm);
  }

  function onSubmitProgram() {
    if (!programForm.name.trim()) return;
    if (editingProgram) {
      updateProgramMutation.mutate({
        id: editingProgram.id as string,
        data: programForm,
      });
    } else {
      createProgramMutation.mutate(programForm);
    }
  }

  // Offer dialog helpers
  function openCreateOfferDialog() {
    setEditingOffer(null);
    setOfferForm(emptyOfferForm);
    setOfferDialogOpen(true);
  }

  function openEditOfferDialog(offer: Record<string, unknown>) {
    setEditingOffer(offer);
    setOfferForm({
      name: (offer.name as string) || "",
      programId: (offer.programId as string) || "",
      description: (offer.description as string) || "",
      destinationUrl: (offer.destinationUrl as string) || "",
      affiliateUrl: (offer.affiliateUrl as string) || "",
      category: (offer.category as string) || "",
      commission: (offer.commission as number) || 0,
      priority: (offer.priority as number) || 0,
    });
    setOfferDialogOpen(true);
  }

  function closeOfferDialog() {
    setOfferDialogOpen(false);
    setEditingOffer(null);
    setOfferForm(emptyOfferForm);
  }

  function onSubmitOffer() {
    if (!offerForm.name.trim()) return;
    if (editingOffer) {
      updateOfferMutation.mutate({
        id: editingOffer.id as string,
        data: offerForm,
      });
    } else {
      createOfferMutation.mutate(offerForm);
    }
  }

  const stats = (statsQuery.data as Record<string, unknown>) || {};
  const programs =
    (programsQuery.data as Record<string, unknown>[]) ||
    (programsQuery.data as unknown as { programs?: Record<string, unknown>[] })
      ?.programs ||
    [];
  const offers =
    (offersQuery.data as Record<string, unknown>[]) ||
    (offersQuery.data as unknown as { offers?: Record<string, unknown>[] })
      ?.offers ||
    [];

  const isLoading =
    programsQuery.isLoading || offersQuery.isLoading || statsQuery.isLoading;
  const isProgramSaving =
    createProgramMutation.isPending || updateProgramMutation.isPending;
  const isOfferSaving =
    createOfferMutation.isPending || updateOfferMutation.isPending;

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load affiliate data
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
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "programs" | "offers")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="programs" className="gap-2">
              <Handshake className="h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <Tag className="h-4 w-4" />
              Offers
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={
              activeTab === "programs"
                ? openCreateProgramDialog
                : openCreateOfferDialog
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "programs" ? "Create Program" : "Create Offer"}
          </Button>
        </div>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
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
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Total Programs"
                value={stats.totalPrograms as number}
                icon={Handshake}
              />
              <StatCard
                title="Active"
                value={stats.activePrograms as number}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Revenue"
                value={stats.totalRevenue as number}
                icon={DollarSign}
                format="currency"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Affiliate Programs</CardTitle>
            </CardHeader>
            <CardContent>
              {programsQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : programs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Handshake className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    No affiliate programs yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Create your first program to start tracking affiliates
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={openCreateProgramDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Program
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Commission Type</TableHead>
                        <TableHead>Commission Value</TableHead>
                        <TableHead className="max-w-[200px]">Terms</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programs.map((p) => (
                        <TableRow key={p.id as string}>
                          <TableCell className="font-medium">
                            {p.name as string}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.network as string}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.commissionType as string}</Badge>
                          </TableCell>
                          <TableCell>
                            {(p.commissionType as string) === "PERCENTAGE"
                              ? `${p.commissionValue}%`
                              : `$${Number(p.commissionValue).toLocaleString()}`}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {p.terms as string}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                programStatusVariant[
                                  (p.status as string) || ""
                                ]
                              )}
                            >
                              {(p.status as string) || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditProgramDialog(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteProgramId(p.id as string)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-6">
          {isLoading ? (
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
                title="Total Offers"
                value={stats.totalOffers as number}
                icon={Tag}
              />
              <StatCard
                title="Total Clicks"
                value={stats.totalClicks as number}
                icon={MousePointerClick}
              />
              <StatCard
                title="Total Conversions"
                value={stats.totalConversions as number}
                icon={ShoppingCart}
              />
              <StatCard
                title="Total Revenue"
                value={stats.totalRevenue as number}
                icon={DollarSign}
                format="currency"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Affiliate Offers</CardTitle>
            </CardHeader>
            <CardContent>
              {offersQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tag className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    No affiliate offers yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Create your first offer to start earning commissions
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={openCreateOfferDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Offer
                  </Button>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="max-w-[180px]">Destination URL</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Conversions</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((o) => (
                        <TableRow key={o.id as string}>
                          <TableCell className="font-medium">
                            {o.name as string}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(o.program as Record<string, unknown>)?.name as string || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{o.category as string}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-muted-foreground">
                            {o.destinationUrl as string}
                          </TableCell>
                          <TableCell>
                            ${(o.commission as number)?.toLocaleString()}
                          </TableCell>
                          <TableCell>{(o.clicks as number)?.toLocaleString() || 0}</TableCell>
                          <TableCell>
                            {(o.conversions as number)?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ${(o.revenue as number)?.toLocaleString() || "0"}
                          </TableCell>
                          <TableCell>{o.priority as number}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                offerStatusVariant[(o.status as string) || ""]
                              )}
                            >
                              {(o.status as string) || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditOfferDialog(o)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteOfferId(o.id as string)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Program Dialog */}
      <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? "Edit Program" : "Create Affiliate Program"}
            </DialogTitle>
            <DialogDescription>
              {editingProgram
                ? "Update the affiliate program details."
                : "Add a new affiliate program to your site."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prog-name">Name</Label>
              <Input
                id="prog-name"
                value={programForm.name}
                onChange={(e) =>
                  setProgramForm({ ...programForm, name: e.target.value })
                }
                placeholder="e.g. Amazon Associates"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prog-network">Network</Label>
              <Input
                id="prog-network"
                value={programForm.network}
                onChange={(e) =>
                  setProgramForm({ ...programForm, network: e.target.value })
                }
                placeholder="e.g. Amazon, ShareASale"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prog-website">Website</Label>
              <Input
                id="prog-website"
                value={programForm.website}
                onChange={(e) =>
                  setProgramForm({ ...programForm, website: e.target.value })
                }
                placeholder="https://example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prog-comm-type">Commission Type</Label>
                <Select
                  value={programForm.commissionType}
                  onValueChange={(v) =>
                    setProgramForm({ ...programForm, commissionType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prog-comm-value">Commission Value</Label>
                <Input
                  id="prog-comm-value"
                  type="number"
                  value={programForm.commissionValue}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      commissionValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prog-cookie">Cookie Duration (days)</Label>
              <Input
                id="prog-cookie"
                type="number"
                value={programForm.cookieDuration}
                onChange={(e) =>
                  setProgramForm({
                    ...programForm,
                    cookieDuration: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prog-terms">Terms</Label>
              <Textarea
                id="prog-terms"
                value={programForm.terms}
                onChange={(e) =>
                  setProgramForm({ ...programForm, terms: e.target.value })
                }
                placeholder="Program terms and conditions..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeProgramDialog}
              disabled={isProgramSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmitProgram}
              disabled={isProgramSaving || !programForm.name.trim()}
            >
              {isProgramSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProgram ? "Save Changes" : "Create Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOffer ? "Edit Offer" : "Create Affiliate Offer"}
            </DialogTitle>
            <DialogDescription>
              {editingOffer
                ? "Update the affiliate offer details."
                : "Add a new affiliate offer to promote."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="offer-name">Name</Label>
              <Input
                id="offer-name"
                value={offerForm.name}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, name: e.target.value })
                }
                placeholder="e.g. Premium VPN Deal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-program">Program</Label>
              <Select
                value={offerForm.programId}
                onValueChange={(v) =>
                  setOfferForm({ ...offerForm, programId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id as string} value={p.id as string}>
                      {p.name as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-desc">Description</Label>
              <Input
                id="offer-desc"
                value={offerForm.description}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, description: e.target.value })
                }
                placeholder="Brief offer description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-dest-url">Destination URL</Label>
              <Input
                id="offer-dest-url"
                value={offerForm.destinationUrl}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    destinationUrl: e.target.value,
                  })
                }
                placeholder="https://example.com/product"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-aff-url">Affiliate URL</Label>
              <Input
                id="offer-aff-url"
                value={offerForm.affiliateUrl}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, affiliateUrl: e.target.value })
                }
                placeholder="https://affiliates.example.com/offer"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="offer-category">Category</Label>
                <Input
                  id="offer-category"
                  value={offerForm.category}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, category: e.target.value })
                  }
                  placeholder="e.g. Tech"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="offer-commission">Commission ($)</Label>
                <Input
                  id="offer-commission"
                  type="number"
                  value={offerForm.commission}
                  onChange={(e) =>
                    setOfferForm({
                      ...offerForm,
                      commission: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="offer-priority">Priority</Label>
                <Input
                  id="offer-priority"
                  type="number"
                  value={offerForm.priority}
                  onChange={(e) =>
                    setOfferForm({
                      ...offerForm,
                      priority: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeOfferDialog}
              disabled={isOfferSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmitOffer}
              disabled={isOfferSaving || !offerForm.name.trim()}
            >
              {isOfferSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingOffer ? "Save Changes" : "Create Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Program Alert */}
      <AlertDialog
        open={!!deleteProgramId}
        onOpenChange={(open) => !open && setDeleteProgramId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be
              undone. All associated offers may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteProgramId && deleteProgramMutation.mutate(deleteProgramId)
              }
              disabled={deleteProgramMutation.isPending}
            >
              {deleteProgramMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Offer Alert */}
      <AlertDialog
        open={!!deleteOfferId}
        onOpenChange={(open) => !open && setDeleteOfferId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate Offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this offer? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteOfferId && deleteOfferMutation.mutate(deleteOfferId)
              }
              disabled={deleteOfferMutation.isPending}
            >
              {deleteOfferMutation.isPending && (
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

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Magnet,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Send,
  FileText,
  Link2,
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
  getLeadMagnets,
  getLeadMagnetStats,
  createLeadMagnet,
  updateLeadMagnet,
  deleteLeadMagnet,
} from "@/lib/api";

interface LeadMagnetsViewProps {
  siteId: string;
}

const FILE_TYPES = [
  "PDF",
  "DOCX",
  "XLSX",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "OTHER",
] as const;

const statusVariant: Record<string, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  INACTIVE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value !== undefined ? value.toLocaleString() : "—"}
        </div>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  name: "",
  title: "",
  description: "",
  fileType: "PDF",
  fileUrl: "",
  ctaText: "",
  ctaDescription: "",
  thankYouMessage: "",
  thankYouUrl: "",
};

export function LeadMagnetsView({ siteId }: LeadMagnetsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const magnetsQuery = useQuery({
    queryKey: ["leadMagnets", siteId],
    queryFn: () => getLeadMagnets(siteId),
  });

  const statsQuery = useQuery({
    queryKey: ["leadMagnetStats", siteId],
    queryFn: () => getLeadMagnetStats(siteId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createLeadMagnet(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadMagnets"] });
      queryClient.invalidateQueries({ queryKey: ["leadMagnetStats"] });
      toast({ title: "Lead magnet created successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateLeadMagnet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadMagnets"] });
      toast({ title: "Lead magnet updated successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLeadMagnet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadMagnets"] });
      queryClient.invalidateQueries({ queryKey: ["leadMagnetStats"] });
      toast({ title: "Lead magnet deleted" });
      setDeleteId(null);
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

  function openEditDialog(magnet: Record<string, unknown>) {
    setEditing(magnet);
    setForm({
      name: (magnet.name as string) || "",
      title: (magnet.title as string) || "",
      description: (magnet.description as string) || "",
      fileType: (magnet.fileType as string) || "PDF",
      fileUrl: (magnet.fileUrl as string) || "",
      ctaText: (magnet.ctaText as string) || "",
      ctaDescription: (magnet.ctaDescription as string) || "",
      thankYouMessage: (magnet.thankYouMessage as string) || "",
      thankYouUrl: (magnet.thankYouUrl as string) || "",
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
  const magnets =
    (magnetsQuery.data as Record<string, unknown>[]) ||
    (magnetsQuery.data as unknown as {
      leadMagnets?: Record<string, unknown>[];
    })?.leadMagnets ||
    [];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load lead magnet data
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
            title="Total Magnets"
            value={stats.totalMagnets as number}
            icon={Magnet}
          />
          <StatCard
            title="Active"
            value={stats.activeMagnets as number}
            icon={Send}
          />
          <StatCard
            title="Total Deliveries"
            value={stats.totalDeliveries as number}
            icon={FileText}
          />
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Lead Magnets</CardTitle>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Lead Magnet
          </Button>
        </CardHeader>
        <CardContent>
          {magnetsQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : magnets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Magnet className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                No lead magnets yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Create a lead magnet to grow your email list
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Lead Magnet
              </Button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>CTA Text</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {magnets.map((m) => (
                    <TableRow key={m.id as string}>
                      <TableCell className="font-medium">
                        {m.name as string}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.title as string}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <Send className="h-3 w-3 text-muted-foreground" />
                          {m.ctaText as string}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(m.fileType as string) === "" || !(m.fileType as string)
                            ? "Link"
                            : (m.fileType as string)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(m.deliveries as number)?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            statusVariant[(m.status as string) || ""]
                          )}
                        >
                          {(m.status as string) || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(m)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(m.id as string)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Lead Magnet" : "Create Lead Magnet"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the lead magnet details."
                : "Create a new lead magnet to capture email addresses."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lm-name">Name</Label>
              <Input
                id="lm-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g. Free SEO Checklist"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lm-title">Title</Label>
              <Input
                id="lm-title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Display title shown to users"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lm-desc">Description</Label>
              <Textarea
                id="lm-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What is this lead magnet about?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lm-filetype">File Type</Label>
                <Select
                  value={form.fileType}
                  onValueChange={(v) =>
                    setForm({ ...form, fileType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lm-fileurl">File URL</Label>
                <Input
                  id="lm-fileurl"
                  value={form.fileUrl}
                  onChange={(e) =>
                    setForm({ ...form, fileUrl: e.target.value })
                  }
                  placeholder="https://cdn.example.com/..."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lm-cta-text">CTA Text</Label>
              <Input
                id="lm-cta-text"
                value={form.ctaText}
                onChange={(e) =>
                  setForm({ ...form, ctaText: e.target.value })
                }
                placeholder='e.g. "Download Now"'
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lm-cta-desc">CTA Description</Label>
              <Input
                id="lm-cta-desc"
                value={form.ctaDescription}
                onChange={(e) =>
                  setForm({ ...form, ctaDescription: e.target.value })
                }
                placeholder="Short description next to the CTA"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lm-ty-msg">Thank You Message</Label>
              <Textarea
                id="lm-ty-msg"
                value={form.thankYouMessage}
                onChange={(e) =>
                  setForm({ ...form, thankYouMessage: e.target.value })
                }
                placeholder="Message shown after opting in..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lm-ty-url">Thank You URL</Label>
              <Input
                id="lm-ty-url"
                value={form.thankYouUrl}
                onChange={(e) =>
                  setForm({ ...form, thankYouUrl: e.target.value })
                }
                placeholder="https://example.com/thank-you"
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
              {editing ? "Save Changes" : "Create Lead Magnet"}
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
            <AlertDialogTitle>Delete Lead Magnet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead magnet? This action
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

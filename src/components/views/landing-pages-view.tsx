"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  ExternalLink,
  Globe,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  getLandingPages,
  getLandingPageStats,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
} from "@/lib/api";

interface LandingPagesViewProps {
  siteId: string;
}

const PAGE_SIZE = 10;

const statusVariant: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  DRAFT: "bg-secondary text-secondary-foreground",
  ARCHIVED: "border-border text-muted-foreground",
};

function StatCard({ title, value, icon: Icon }: { title: string; value: number | undefined; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value !== undefined ? value.toLocaleString() : "—"}</div>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  title: "",
  slug: "",
  headline: "",
  subheadline: "",
  content: "",
  ctaText: "",
  ctaUrl: "",
  status: "DRAFT",
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function LandingPagesView({ siteId }: LandingPagesViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Queries
  const pagesQuery = useQuery({
    queryKey: ["landingPages", siteId, debouncedSearch, page],
    queryFn: () => getLandingPages(siteId, { search: debouncedSearch || undefined, page, limit: PAGE_SIZE }),
  });

  const statsQuery = useQuery({
    queryKey: ["landingPageStats", siteId],
    queryFn: () => getLandingPageStats(siteId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => createLandingPage(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
      queryClient.invalidateQueries({ queryKey: ["landingPageStats"] });
      toast({ title: "Landing page created successfully" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => updateLandingPage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
      queryClient.invalidateQueries({ queryKey: ["landingPageStats"] });
      toast({ title: "Landing page updated successfully" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLandingPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
      queryClient.invalidateQueries({ queryKey: ["landingPageStats"] });
      toast({ title: "Landing page deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Search debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setDebouncedSearch(value);
    setPage(1);
  };

  // Helpers
  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
    setDialogOpen(true);
  }

  function openEditDialog(lp: Record<string, any>) {
    setEditing(lp);
    setForm({
      title: lp.title || "",
      slug: lp.slug || "",
      headline: lp.headline || "",
      subheadline: lp.subheadline || "",
      content: lp.content || "",
      ctaText: lp.ctaText || "",
      ctaUrl: lp.ctaUrl || "",
      status: lp.status || "DRAFT",
    });
    setSlugManuallyEdited(true);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
  }

  function onTitleChange(value: string) {
    setForm({ ...form, title: value });
    if (!slugManuallyEdited) {
      setForm((prev) => ({ ...prev, title: value, slug: toSlug(value) }));
    }
  }

  function onSubmit() {
    if (!form.title.trim()) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  // Data extraction
  const stats = (statsQuery.data as Record<string, any>) || {};
  const pagesData = pagesQuery.data as Record<string, any> | undefined;
  const pages = (pagesData?.landingPages as Record<string, any>[]) || (pagesData as any as Record<string, any>[]) || [];
  const total = (pagesData?.total as number) || pages.length || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load landing pages data</p>
        <p className="mt-1 text-sm text-muted-foreground">{(statsQuery.error as Error)?.message || "An unexpected error occurred"}</p>
        <Button variant="outline" className="mt-4" onClick={() => statsQuery.refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {statsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard title="Total" value={stats.totalPages as number} icon={FileText} />
          <StatCard title="Published" value={stats.publishedPages as number} icon={Globe} />
          <StatCard title="Drafts" value={stats.draftPages as number} icon={Edit} />
          <StatCard title="Total Views" value={stats.totalViews as number} icon={Eye} />
          <StatCard title="Conversions" value={stats.totalConversions as number} icon={ExternalLink} />
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Landing Pages</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              New Landing Page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pagesQuery.isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">No landing pages yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Create your first landing page to start capturing leads</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />New Landing Page</Button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>CTA</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((p: Record<string, any>) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{p.slug}</TableCell>
                      <TableCell>
                        <Badge className={cn(statusVariant[p.status || ""])}>{p.status || "—"}</Badge>
                      </TableCell>
                      <TableCell>{(p.views as number)?.toLocaleString() || 0}</TableCell>
                      <TableCell>{(p.conversions as number)?.toLocaleString() || 0}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{p.ctaText || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Landing Page" : "New Landing Page"}</DialogTitle>
            <DialogDescription>{editing ? "Update the landing page details." : "Create a new landing page to capture leads."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lp-title">Title</Label>
              <Input id="lp-title" value={form.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Free SEO Audit" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-slug">Slug</Label>
              <Input id="lp-slug" value={form.slug} onChange={(e) => { setSlugManuallyEdited(true); setForm({ ...form, slug: e.target.value }); }} placeholder="auto-generated-from-title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-headline">Headline</Label>
              <Input id="lp-headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Main headline for the page" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-subheadline">Subheadline</Label>
              <Input id="lp-subheadline" value={form.subheadline} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} placeholder="Supporting text below the headline" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-content">Content</Label>
              <Textarea id="lp-content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Page body content..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lp-cta-text">CTA Text</Label>
                <Input id="lp-cta-text" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder='e.g. "Get Started"' />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lp-cta-url">CTA URL</Label>
                <Input id="lp-cta-url" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="https://example.com/signup" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
            <Button onClick={onSubmit} disabled={isSaving || !form.title.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this landing page? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ExternalLink,
  PenLine,
  CheckCircle2,
  Send,
  Trash2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Filter,
  Globe,
  CalendarClock,
  CalendarPlus,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, allStatuses } from "@/components/app/status-badge";
import { SeoPanel } from "@/components/seo-panel";
import {
  getArticles,
  updateArticle,
  deleteArticle,
  rewriteArticle,
  publishArticle,
  scheduleArticle,
} from "@/lib/api";
import type { Article } from "@/lib/api";

interface ArticlesViewProps {
  siteId: string;
  onEditArticle?: (articleId: string) => void;
}

export function ArticlesView({ siteId, onEditArticle }: ArticlesViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const [detailArticle, setDetailArticle] = useState<Article | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scheduleDialogArticle, setScheduleDialogArticle] = useState<Article | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["articles", siteId, statusFilter, page],
    queryFn: () =>
      getArticles(siteId, {
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit,
      }),
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; siteId: string; status?: string; title?: string; category?: string; seoTitle?: string; seoDescription?: string; seoKeywords?: string; adsenseEnabled?: boolean; scheduledAt?: string }) => updateArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: "Article updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArticle(id, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      setDeleteId(null);
      toast({ title: "Article deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rewriteMutation = useMutation({
    mutationFn: (articleId: string) => rewriteArticle(siteId, { articleId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: data.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (articleId: string) => publishArticle(siteId, { articleId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: data.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: { articleId: string; scheduledDate: string }) => scheduleArticle(siteId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      setScheduleDialogArticle(null);
      setScheduleDate("");
      toast({ title: data.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isBusy = updateMutation.isPending || deleteMutation.isPending || rewriteMutation.isPending || publishMutation.isPending || scheduleMutation.isPending;

  return (
    <>
      <PageHeader
        title="Articles"
        description={`${total} articles in pipeline`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64 pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40">
                <Filter className="mr-1.5 size-3.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex flex-1 flex-col p-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Loading articles...</span>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="size-10" />
              <div className="text-center">
                <h3 className="font-medium">No articles found</h3>
                <p className="text-sm">{statusFilter !== "all" ? "No articles match this filter." : "Start by adding RSS feeds and fetching articles."}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-36">Source</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-44">Date</TableHead>
                    <TableHead className="w-48 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles
                    .filter((a) => (search ? a.title.toLowerCase().includes(search.toLowerCase()) : true))
                    .map((article, idx) => (
                      <TableRow key={article.id}>
                        <TableCell className="text-muted-foreground text-xs">{(page - 1) * limit + idx + 1}</TableCell>
                        <TableCell>
                          <button className="max-w-md truncate text-left text-sm font-medium hover:underline" onClick={() => onEditArticle ? onEditArticle(article.id) : setDetailArticle(article)}>
                            {article.title}
                          </button>
                          {article.seoTitle && <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">SEO</Badge>}
                          {article.errorMessage && <p className="mt-0.5 truncate text-xs text-destructive">{article.errorMessage}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="truncate block max-w-32">{article.feed?.name || "—"}</span>
                        </TableCell>
                        <TableCell><StatusBadge status={article.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {article.scheduledAt && article.status === "scheduled"
                            ? format(new Date(article.scheduledAt), "MMM d, h:mm a")
                            : formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEditArticle ? onEditArticle(article.id) : setDetailArticle(article)} title="Edit"><Eye className="size-3.5" /></Button>
                            {(article.status === "fetched" || article.status === "rewritten") && (
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => rewriteMutation.mutate(article.id)} disabled={isBusy} title="Rewrite with AI">
                                {rewriteMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PenLine className="size-3.5" />}
                              </Button>
                            )}
                            {article.status === "rewritten" && (
                              <>
                                <Button variant="ghost" size="icon" className="size-8 text-emerald-600" onClick={() => updateMutation.mutate({ id: article.id, status: "approved", siteId })} disabled={isBusy} title="Approve">
                                  <CheckCircle2 className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8 text-orange-600" onClick={() => { setScheduleDialogArticle(article); const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); setScheduleDate(d.toISOString().slice(0, 16)); }} title="Schedule">
                                  <CalendarPlus className="size-3.5" />
                                </Button>
                              </>
                            )}
                            {article.status === "approved" && (
                              <>
                                <Button variant="ghost" size="icon" className="size-8 text-violet-600" onClick={() => publishMutation.mutate(article.id)} disabled={isBusy} title="Publish now">
                                  {publishMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8 text-orange-600" onClick={() => { setScheduleDialogArticle(article); const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); setScheduleDate(d.toISOString().slice(0, 16)); }} title="Schedule">
                                  <CalendarPlus className="size-3.5" />
                                </Button>
                              </>
                            )}
                            {article.status === "scheduled" && (
                              <Button variant="ghost" size="icon" className="size-8 text-violet-600" onClick={() => publishMutation.mutate(article.id)} disabled={isBusy} title="Publish now">
                                <Send className="size-3.5" />
                              </Button>
                            )}
                            {article.wordpressUrl && (
                              <Button variant="ghost" size="icon" className="size-8" asChild>
                                <a href={article.wordpressUrl} target="blank" rel="noopener noreferrer" title="View on WordPress"><Globe className="size-3.5" /></a>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(article.id)} title="Delete"><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /> Previous</Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" className="size-8" onClick={() => setPage(pageNum)}>{pageNum}</Button>;
                    })}
                  </div>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="size-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Article Detail Sheet with SEO Panel */}
      <Sheet open={!!detailArticle} onOpenChange={() => setDetailArticle(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {detailArticle && (
            <>
              <SheetHeader>
                <SheetTitle className="leading-snug">{detailArticle.rewrittenTitle || detailArticle.title}</SheetTitle>
                <SheetDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={detailArticle.status} />
                    <Badge variant="outline">{detailArticle.category}</Badge>
                    {detailArticle.seoTitle && <Badge variant="secondary" className="text-xs">SEO Ready</Badge>}
                  </div>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* SEO Panel - show for rewritten+ articles */}
                {(detailArticle.status === "rewritten" || detailArticle.status === "approved" || detailArticle.status === "scheduled" || detailArticle.status === "published") && (
                  <SeoPanel article={detailArticle} siteId={siteId} />
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Original Title</h4>
                  <p className="text-sm">{detailArticle.originalTitle}</p>
                </div>
                {detailArticle.rewrittenTitle && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Rewritten Title</h4>
                    <p className="text-sm font-medium">{detailArticle.rewrittenTitle}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Content Preview</h4>
                  <div className="rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {detailArticle.rewrittenContent || detailArticle.originalContent}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Source Feed</span><p className="font-medium">{detailArticle.feed?.name || "—"}</p></div>
                  <div><span className="text-muted-foreground">Category</span><p className="font-medium">{detailArticle.category}</p></div>
                  <div><span className="text-muted-foreground">Fetched</span><p className="font-medium">{formatDistanceToNow(new Date(detailArticle.fetchedAt), { addSuffix: true })}</p></div>
                  {detailArticle.rewrittenAt && <div><span className="text-muted-foreground">Rewritten</span><p className="font-medium">{formatDistanceToNow(new Date(detailArticle.rewrittenAt), { addSuffix: true })}</p></div>}
                  {detailArticle.scheduledAt && <div><span className="text-muted-foreground">Scheduled</span><p className="font-medium">{format(new Date(detailArticle.scheduledAt), "MMM d, yyyy h:mm a")}</p></div>}
                  {detailArticle.publishedAt && <div><span className="text-muted-foreground">Published</span><p className="font-medium">{formatDistanceToNow(new Date(detailArticle.publishedAt), { addSuffix: true })}</p></div>}
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button asChild variant="outline" size="sm">
                    <a href={detailArticle.sourceUrl} target="blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" /> Source</a>
                  </Button>
                  {onEditArticle && (
                    <Button size="sm" variant="outline" onClick={() => { onEditArticle(detailArticle.id); setDetailArticle(null); }}>
                      <PenLine className="size-3.5" /> Open Editor
                    </Button>
                  )}
                  {(detailArticle.status === "fetched" || detailArticle.status === "rewritten") && (
                    <Button size="sm" onClick={() => { rewriteMutation.mutate(detailArticle.id); setDetailArticle(null); }} disabled={isBusy}><PenLine className="size-3.5" /> Rewrite</Button>
                  )}
                  {detailArticle.status === "rewritten" && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { updateMutation.mutate({ id: detailArticle.id, status: "approved", siteId }); setDetailArticle(null); }} disabled={isBusy}><CheckCircle2 className="size-3.5" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => { updateMutation.mutate({ id: detailArticle.id, status: "rejected", siteId }); setDetailArticle(null); }} disabled={isBusy}><XCircle className="size-3.5" /> Reject</Button>
                    </>
                  )}
                  {(detailArticle.status === "approved" || detailArticle.status === "scheduled") && (
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { publishMutation.mutate(detailArticle.id); setDetailArticle(null); }} disabled={isBusy}><Send className="size-3.5" /> Publish Now</Button>
                  )}
                  {detailArticle.wordpressUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a href={detailArticle.wordpressUrl} target="blank" rel="noopener noreferrer"><Globe className="size-3.5" /> View Live</a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Schedule Dialog */}
      <Dialog open={!!scheduleDialogArticle} onOpenChange={() => { setScheduleDialogArticle(null); setScheduleDate(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5" /> Schedule Article</DialogTitle>
            <DialogDescription>Choose when this article should be published to WordPress</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-2">
              <Label htmlFor="schedule-date">Publish Date & Time</Label>
              <Input id="schedule-date" type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Articles scheduled for optimal engagement (morning/afternoon)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setScheduleDialogArticle(null); setScheduleDate(""); }}>Cancel</Button>
            <Button onClick={() => { if (scheduleDialogArticle && scheduleDate) scheduleMutation.mutate({ articleId: scheduleDialogArticle.id, scheduledDate: new Date(scheduleDate).toISOString() }); }} disabled={!scheduleDate || scheduleMutation.isPending} className="gap-1.5">
              {scheduleMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              <CalendarClock className="size-4" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this article? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
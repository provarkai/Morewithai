"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  RefreshCw,
  Rss,
  ExternalLink,
  Loader2,
  MoreVertical,
  Power,
  PowerOff,
  Clock,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PageHeader } from "@/components/app/page-header";
import { getFeeds, createFeed, updateFeed, deleteFeed, fetchArticles } from "@/lib/api";
import type { FeedWithCount } from "@/lib/api";

interface FeedsViewProps {
  siteId: string;
}

export function FeedsView({ siteId }: FeedsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", category: "AI" });

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ["feeds", siteId],
    queryFn: () => getFeeds(siteId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; category: string }) => createFeed(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds", siteId] });
      setDialogOpen(false);
      setNewFeed({ name: "", url: "", category: "AI" });
      toast({ title: "Feed added successfully" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (feed: FeedWithCount) => updateFeed({ id: feed.id, isActive: !feed.isActive, siteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds", siteId] });
      toast({ title: "Feed updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeed(id, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds", siteId] });
      setDeleteId(null);
      toast({ title: "Feed deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const fetchMutation = useMutation({
    mutationFn: (feedId: string) => fetchArticles(siteId, { feedId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["feeds", siteId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: data.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <PageHeader
        title="RSS Feeds"
        description="Manage your article sources"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Add Feed
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add RSS Feed</DialogTitle>
                <DialogDescription>
                  Enter the URL of an RSS/Atom feed to start fetching articles.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="feed-name">Name (optional)</Label>
                  <Input
                    id="feed-name"
                    placeholder="e.g., TechCrunch AI"
                    value={newFeed.name}
                    onChange={(e) => setNewFeed((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feed-url">Feed URL *</Label>
                  <Input
                    id="feed-url"
                    placeholder="https://example.com/feed.xml"
                    value={newFeed.url}
                    onChange={(e) => setNewFeed((f) => ({ ...f, url: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feed-category">Category</Label>
                  <Input
                    id="feed-category"
                    placeholder="AI"
                    value={newFeed.category}
                    onChange={(e) => setNewFeed((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate(newFeed)}
                  disabled={!newFeed.url || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Add Feed
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Loading feeds...</span>
            </div>
          </div>
        ) : feeds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Rss className="size-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-medium">No feeds yet</h3>
                <p className="text-sm text-muted-foreground">Add your first RSS feed to start fetching articles.</p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" /> Add Feed
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feeds.map((feed) => (
              <Card key={feed.id} className={!feed.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{feed.name}</CardTitle>
                      <CardDescription className="truncate text-xs">{feed.url}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={feed.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" /> Open Feed
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => fetchMutation.mutate(feed.id)}
                          disabled={fetchMutation.isPending}
                        >
                          {fetchMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                          Fetch Now
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleMutation.mutate(feed)}>
                          {feed.isActive ? (<><PowerOff className="size-4" /> Disable</>) : (<><Power className="size-4" /> Enable</>)}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(feed.id)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        {feed._count.articles} articles
                      </span>
                      <Badge variant="secondary" className="text-xs">{feed.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {feed.lastFetched && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatDistanceToNow(new Date(feed.lastFetched), { addSuffix: true })}
                        </span>
                      )}
                      <Switch
                        checked={feed.isActive}
                        onCheckedChange={() => toggleMutation.mutate(feed)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feed</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this feed and all its articles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
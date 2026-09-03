"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw, Eye, Clock, User, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { formatDistanceToNow } from "date-fns";
import { getArticleVersions, createArticleVersion, restoreArticleVersion } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  content?: string;
  excerpt?: string;
  changeReason?: string;
  changeType?: string;
  wordCount?: number;
  createdBy?: { name: string } | null;
  createdAt: string;
}

interface ArticleHistoryPanelProps {
  articleId: string;
  siteId: string;
 currentTitle?: string;
  currentContent?: string;
 onRestored?: () => void;
}

export function ArticleHistoryPanel({ articleId, siteId, currentTitle, currentContent, onRestored }: ArticleHistoryPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewVersion, setViewVersion] = useState<Version | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Version | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveReason, setSaveReason] = useState("");

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["versions", articleId],
    queryFn: () => getArticleVersions(articleId),
    staleTime: 30 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: () => createArticleVersion(articleId, { title: currentTitle, content: currentContent, changeReason: saveReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", articleId] });
      setShowSaveDialog(false);
      setSaveReason("");
      toast({ title: "Version saved" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (vid: string) => restoreArticleVersion(articleId, vid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", articleId] });
      queryClient.invalidateQueries({ queryKey: ["article", articleId] });
      setRestoreTarget(null);
      onRestored?.();
      toast({ title: "Version restored" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="size-4 text-pink-500" />
          <h3 className="text-sm font-semibold">History</h3>
          {versions.length > 0 && <Badge variant="secondary" className="text-[10px]">{versions.length}</Badge>}
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => setShowSaveDialog(true)}>
          <Save className="size-3" /> Save Version
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length > 0 ? (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {versions.map((v: Version) => (
              <div key={v.id} className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">v{v.versionNumber}</Badge>
                      {v.changeReason && <Badge variant="secondary" className="text-[10px] max-w-[120px] truncate">{v.changeReason}</Badge>}
                    </div>
                    <p className="text-xs font-medium truncate mt-1">{v.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                  </span>
                  {v.createdBy && (
                    <span className="flex items-center gap-0.5">
                      <User className="size-2.5" /> {v.createdBy.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1 h-6 text-[10px] gap-1" onClick={() => setViewVersion(v)}>
                    <Eye className="size-2.5" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-6 text-[10px] gap-1" onClick={() => setRestoreTarget(v)}>
                    <RotateCcw className="size-2.5" /> Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <History className="size-8 opacity-30" />
          <p className="text-xs text-center">No version history yet.</p>
          <p className="text-[10px] text-center">Click &quot;Save Version&quot; to create a snapshot of the current content.</p>
        </div>
      )}

      {/* Save Version Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Save className="size-4" /> Save Version</DialogTitle>
          </DialogHeader>
          <div className="py-4 grid gap-2">
            <Label className="text-xs">Change Reason (optional)</Label>
            <Input value={saveReason} onChange={(e) => setSaveReason(e.target.value)} placeholder="e.g. 'Revised introduction' or 'Added SEO metadata'" className="text-sm" />
            <p className="text-[10px] text-muted-foreground">A snapshot of the current title and content will be saved.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSaveDialog(false); setSaveReason(""); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog open={!!viewVersion} onOpenChange={() => setViewVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-4" /> Version {viewVersion?.versionNumber}
            </DialogTitle>
          </DialogHeader>
          {viewVersion && (
            <div className="overflow-y-auto max-h-[60vh]">
              {viewVersion.changeReason && (
                <p className="text-sm text-muted-foreground italic mb-4">{viewVersion.changeReason}</p>
              )}
              <h3 className="text-lg font-semibold mb-2">{viewVersion.title}</h3>
              {viewVersion.excerpt && <p className="text-sm text-muted-foreground mb-4 border-l-2 border-primary pl-3 italic">{viewVersion.excerpt}</p>}
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: viewVersion.content || '<p className="text-muted-foreground">No content in this version</p>' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version {restoreTarget?.versionNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current article content with the version from{" "}
              {restoreTarget?.createdAt ? formatDistanceToNow(new Date(restoreTarget.createdAt), { addSuffix: true }) : 'this version'}. A version of the current state will be saved automatically before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreTarget && restoreMutation.mutate(restoreTarget.id)}>
              {restoreMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

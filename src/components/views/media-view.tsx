"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Image, FileText, Trash2, Copy, Edit, Grid3X3, List,
  Search, X, FolderOpen, HardDrive, Loader2, Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/app/page-header";
import { getMedia, getMediaStats, getMediaFolders, deleteMediaItem, updateMediaItem, uploadMediaFile } from "@/lib/api";

interface MediaViewProps { siteId: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStorage(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isImageMime(mimeType?: string) {
  return mimeType?.startsWith("image/");
}

export function MediaView({ siteId }: MediaViewProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<{ id: string; alt: string } | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["media-stats", siteId],
    queryFn: () => getMediaStats(siteId),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["media-folders", siteId],
    queryFn: () => getMediaFolders(siteId),
  });

  const mimeTypeParam = typeFilter === "images" ? "image/" : typeFilter === "documents" ? "application/" : undefined;

  const { data: mediaData, isLoading } = useQuery({
    queryKey: ["media", siteId, search, folder, typeFilter, page],
    queryFn: () => getMedia(siteId, {
      search: search || undefined,
      folder: folder !== "all" ? folder : undefined,
      mimeType: mimeTypeParam,
      page,
      limit: 12,
    }),
  });

  const items = mediaData?.items ?? mediaData?.media ?? mediaData ?? [];
  const total = mediaData?.total ?? items.length;
  const totalPages = Math.ceil(total / 12);

  const uploadMutation = useMutation({
    mutationFn: ({ file, folder: f, alt }: { file: File; folder?: string; alt?: string }) => {
      setUploadProgress(`Uploading ${file.name}...`);
      return uploadMediaFile(siteId, file, f, alt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", siteId] });
      queryClient.invalidateQueries({ queryKey: ["media-stats", siteId] });
      setUploadProgress(null);
    },
    onError: (err: Error) => {
      setUploadProgress(err.message);
      setTimeout(() => setUploadProgress(null), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMediaItem(id, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", siteId] });
      queryClient.invalidateQueries({ queryKey: ["media-stats", siteId] });
      setDeleteId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) => updateMediaItem(id, siteId, { alt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", siteId] });
      setEditItem(null);
    },
  });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => uploadMutation.mutate({ file }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const s = stats ?? {};

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Manage uploaded files and images"
        actions={
          <>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFiles} />
            <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload Files
            </Button>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Files", value: s.totalFiles ?? 0, icon: HardDrive, color: "text-emerald-600" },
            { label: "Total Storage", value: formatStorage(s.totalSize ?? 0), icon: FolderOpen, color: "text-amber-600" },
            { label: "Images", value: s.imageCount ?? 0, icon: Image, color: "text-violet-600" },
            { label: "Documents", value: s.documentCount ?? 0, icon: FileText, color: "text-rose-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="truncate text-sm font-semibold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upload progress */}
        {uploadProgress && (
          <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <Loader2 className="size-4 animate-spin" />
            {uploadProgress}
          </div>
        )}

        {/* Copied feedback */}
        {copiedId && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="size-4" /> URL copied to clipboard
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-8"
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={folder} onValueChange={(v) => { setFolder(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All folders" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All folders</SelectItem>
                {Array.isArray(folders) && folders.map((f: string) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-md border">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="size-9 rounded-r-none" onClick={() => setViewMode("grid")}>
                <Grid3X3 className="size-4" />
              </Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="size-9 rounded-l-none" onClick={() => setViewMode("list")}>
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Media content */}
        {isLoading || statsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Loading media...</span>
            </div>
          </div>
        ) : !items.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Image className="size-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-medium">No media found</h3>
                <p className="text-sm text-muted-foreground">
                  {search || folder !== "all" || typeFilter !== "all"
                    ? "Try adjusting your filters or search query."
                    : "Upload your first file to get started."}
                </p>
              </div>
              {!search && folder === "all" && typeFilter === "all" && (
                <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-4" /> Upload Files
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item: any) => (
              <Card key={item.id} className="group overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {isImageMime(item.mimeType) ? (
                    <img src={item.url} alt={item.alt || item.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <FileText className="size-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="size-8 shadow">
                          <Edit className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopy(item.url, item.id)}>
                          <Copy className="size-4" /> Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditItem({ id: item.id, alt: item.alt || "" }); setEditAlt(item.alt || ""); }}>
                          <Edit className="size-4" /> Edit Alt Text
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatSize(item.size ?? 0)}</span>
                    <Badge variant="secondary" className="px-1.5 text-[10px]">
                      {item.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-4 p-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {isImageMime(item.mimeType) ? (
                      <img src={item.url} alt={item.alt || item.name} className="size-full rounded-lg object-cover" />
                    ) : (
                      <FileText className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(item.size ?? 0)} · {item.mimeType || "unknown"}</p>
                  </div>
                  {item.alt && <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">Alt: {item.alt}</span>}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handleCopy(item.url, item.id)}>
                      {copiedId === item.id ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditItem({ id: item.id, alt: item.alt || "" }); setEditAlt(item.alt || ""); }}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file. This action cannot be undone.
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

      {/* Alt text edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Alt Text</DialogTitle>
            <DialogDescription>Update the alt text for this media file.</DialogDescription>
          </DialogHeader>
          <Input
            value={editAlt}
            onChange={(e) => setEditAlt(e.target.value)}
            placeholder="Enter alt text..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && editItem) updateMutation.mutate({ id: editItem.id, alt: editAlt });
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => editItem && updateMutation.mutate({ id: editItem.id, alt: editAlt })} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

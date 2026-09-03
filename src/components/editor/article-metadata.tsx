"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Link2, ImageIcon, User, Hash, AlignLeft, Eye, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAuthors, createAuthor } from "@/lib/api";

interface ArticleMetadataProps {
  slug: string;
  excerpt: string;
  featuredImage: string | null;
  isPublished: boolean;
  siteId: string;
  authorId?: string | null;
  onSlugChange: (slug: string) => void;
  onExcerptChange: (excerpt: string) => void;
  onFeaturedImageChange: (url: string) => void;
  onAuthorChange: (authorId: string) => void;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function ArticleMetadata({
  slug, excerpt, featuredImage, isPublished, siteId, authorId,
  onSlugChange, onExcerptChange, onFeaturedImageChange, onAuthorChange,
}: ArticleMetadataProps) {
  const [localSlug, setLocalSlug] = useState(slug || "");
  const [localExcerpt, setLocalExcerpt] = useState(excerpt || "");
  const [localImage, setLocalImage] = useState(featuredImage || "");
  const [showPreview, setShowPreview] = useState(false);
  const [lockSlug, setLockSlug] = useState(isPublished);
  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");

  const { data: authors = [], refetch } = useQuery({
    queryKey: ["authors", siteId], queryFn: () => getAuthors(siteId),
    staleTime: 60 * 1000,
  });

  useEffect(() => { if (isPublished) setLockSlug(true); }, [isPublished]);

  const handleSlugBlur = () => { if (!lockSlug) onSlugChange(localSlug); };
  const handleExcerptBlur = () => { onExcerptChange(localExcerpt); };
  const handleImageBlur = () => { onFeaturedImageChange(localImage); };

  const autoGenerateSlug = useCallback((title: string) => {
    if (!lockSlug && !localSlug) {
      const s = slugify(title);
      setLocalSlug(s);
      onSlugChange(s);
    }
  }, [lockSlug, localSlug, onSlugChange]);

  useEffect(() => {
    (window as any).__editorAutoSlug = autoGenerateSlug;
    return () => { delete (window as any).__editorAutoSlug; };
  }, [autoGenerateSlug]);

  const handleCreateAuthor = async () => {
    if (!newAuthorName.trim()) return;
    await createAuthor(siteId, { name: newAuthorName.trim() });
    setNewAuthorName("");
    setShowNewAuthor(false);
    refetch();
  };

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2">
        <Hash className="size-4 text-blue-500" />
        <h3 className="text-sm font-semibold">Metadata</h3>
      </div>

      {/* Author Selector */}
      <div className="grid gap-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <User className="size-3" /> Author
        </Label>
        <div className="flex gap-1.5">
          <Select value={authorId || "_none"} onValueChange={(v) => { if (v !== "_none") onAuthorChange(v); }}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No author</SelectItem>
              {authors.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center gap-2">
                    {a.avatarUrl && <Avatar className="size-4"><AvatarImage src={a.avatarUrl} /><AvatarFallback>{a.name[0]}</AvatarFallback></Avatar>}
                    <span>{a.name}</span>
                    {a._count?.articles > 0 && <span className="text-muted-foreground">({a._count.articles})</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => setShowNewAuthor(true)} title="Add author">
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Slug */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5"><Link2 className="size-3" /> URL Slug</Label>
          {isPublished && <span className="text-[10px] text-muted-foreground">Locked</span>}
        </div>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/</span>
          <Input value={localSlug} onChange={(e) => setLocalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))} onBlur={handleSlugBlur} placeholder="article-url-slug" disabled={lockSlug} className="pl-6 h-8 text-xs font-mono" />
        </div>
      </div>

      {/* Excerpt */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5"><AlignLeft className="size-3" /> Excerpt</Label>
          <span className={cn("text-[10px]", localExcerpt.length > 0 && localExcerpt.length <= 160 ? "text-emerald-500" : "text-muted-foreground")}>{localExcerpt.length}/160</span>
        </div>
        <Textarea value={localExcerpt} onChange={(e) => setLocalExcerpt(e.target.value.slice(0, 160))} onBlur={handleExcerptBlur} placeholder="A brief summary of the article (shown in listings)..." className="text-xs min-h-[60px] resize-none" />
      </div>

      {/* Featured Image */}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5"><ImageIcon className="size-3" /> Featured Image</Label>
          {localImage && <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => setShowPreview(!showPreview)}><Eye className="size-2.5" /> {showPreview ? "Hide" : "Preview"}</Button>}
        </div>
        <Input value={localImage} onChange={(e) => setLocalImage(e.target.value)} onBlur={handleImageBlur} placeholder="https://example.com/image.jpg" className="h-8 text-xs font-mono" />
        {showPreview && localImage && (
          <div className="relative rounded-md overflow-hidden border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={localImage} alt="Featured" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <div><Label className="text-xs">Lock slug</Label><p className="text-[10px] text-muted-foreground">Prevent auto-generation</p></div>
        <Switch checked={lockSlug} onCheckedChange={setLockSlug} />
      </div>

      {/* New Author Dialog */}
      <Dialog open={showNewAuthor} onOpenChange={setShowNewAuthor}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Author</DialogTitle></DialogHeader>
          <div className="py-4 grid gap-2">
            <Label className="text-xs">Author Name</Label>
            <Input value={newAuthorName} onChange={(e) => setNewAuthorName(e.target.value)} placeholder="John Doe" className="text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAuthor(); }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAuthor(false)}>Cancel</Button>
            <Button onClick={handleCreateAuthor} disabled={!newAuthorName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

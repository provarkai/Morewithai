"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Search,
  BarChart3,
  Link2,
  Send,
  History,
  DollarSign,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArticleToolbar, type SaveStatus } from "./article-toolbar";
import { ArticleStatusBar } from "./article-status-bar";
import { ArticleContentEditor } from "./article-content-editor";
import { ArticleMetadata } from "./article-metadata";
import { ArticleAiPanel } from "./article-ai-panel";
import { ArticleSeoPanel } from "./article-seo-panel";
import { ArticleQualityPanel } from "./article-quality-panel";
import { ArticleLinksPanel } from "./article-links-panel";
import { ArticleHistoryPanel } from "./article-history-panel";
import { ArticlePublishPanel } from "./article-publish-panel";
import { ArticleMonetizationPanel } from "./article-monetization-panel";
import { getArticles, updateArticle, deleteArticle, publishArticle, scheduleArticle } from "@/lib/api";
import type { Article } from "@/lib/api";

interface ArticleEditorProps {
  articleId: string;
  siteId: string;
  onBack: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

// Autosave delay in ms
const AUTOSAVE_DELAY = 2000;

export function ArticleEditor({ articleId, siteId, onBack, onNavigate, hasPrev = false, hasNext = false }: ArticleEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // --- Fetch article ---
  const { data, isLoading } = useQuery({
    queryKey: ["article", articleId, siteId],
    queryFn: async () => {
      const res = await getArticles(siteId, { page: 1, limit: 100 });
      const article = res.articles.find((a) => a.id === articleId);
      if (!article) throw new Error("Article not found");
      return article;
    },
    staleTime: 30 * 1000,
  });

  const article = data as Article | undefined;

  // --- Local editing state ---
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localSlug, setLocalSlug] = useState("");
  const [localExcerpt, setLocalExcerpt] = useState("");
  const [localFeaturedImage, setLocalFeaturedImage] = useState("");
  const [localSeoTitle, setLocalSeoTitle] = useState("");
  const [localSeoDescription, setLocalSeoDescription] = useState("");
  const [localSeoKeywords, setLocalSeoKeywords] = useState("");
  const [localAdsenseEnabled, setLocalAdsenseEnabled] = useState(false);

  // Derived content for editor
  const editTitle = localTitle || article?.rewrittenTitle || article?.title || "";
  const editContent = localContent || article?.rewrittenContent || article?.originalContent || "";
  const editSlug = localSlug || article?.slug || "";
  const editExcerpt = localExcerpt || article?.excerpt || "";
  const editSeoTitle = localSeoTitle || article?.seoTitle || "";
  const editSeoDesc = localSeoDescription || article?.seoDescription || "";
  const editSeoKw = localSeoKeywords || article?.seoKeywords || "";

  // --- Dirty tracking & save status ---
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [activeTab, setActiveTab] = useState("ai");

  // --- Mutations ---
  const saveMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      updateArticle({ id: articleId, siteId, ...updates } as any),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      setSaveStatus("saved");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["article", articleId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
    },
    onError: () => setSaveStatus("error"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      updateArticle({ id: articleId, siteId, status } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article", articleId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: `Status updated` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishArticle(siteId, { articleId }),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["article", articleId] });
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      toast({ title: d.message });
    },
    onError: (err) => toast({ title: "Publish failed", description: err.message, variant: "destructive" }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (scheduledDate: string) =>
      scheduleArticle(siteId, { articleId, scheduledDate }),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["article", articleId] });
      toast({ title: d.message });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticle(articleId, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles", siteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", siteId] });
      toast({ title: "Article deleted" });
      onBack();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // --- Autosave ---
  const triggerAutosave = useCallback(() => {
    if (!isDirty || saveMutation.isPending) return;
    saveMutation.mutate({
      title: editTitle,
      rewrittenTitle: editTitle,
      rewrittenContent: editContent,
      slug: editSlug || undefined,
      excerpt: editExcerpt || undefined,
      thumbnailUrl: localFeaturedImage || undefined,
    });
  }, [isDirty, saveMutation, editTitle, editContent, editSlug, editExcerpt, localFeaturedImage]);

  // Autosave timer
  useEffect(() => {
    if (isDirty) {
      setSaveStatus("unsaved");
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(triggerAutosave, AUTOSAVE_DELAY);
      return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    }
  }, [isDirty, editTitle, editContent, editSlug, editExcerpt, localFeaturedImage, triggerAutosave]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!localSlug && editTitle && !(window as any).__editorAutoSlug) {
 // Only auto-slug if not locked
      const s = editTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      if (s) setLocalSlug(s);
    }
  }, [editTitle, localSlug]);

  // --- Handlers ---
  const handleTitleChange = (val: string) => { setLocalTitle(val); setIsDirty(true); };
  const handleContentChange = (val: string) => { setLocalContent(val); setIsDirty(true); };
  const handleSlugChange = (val: string) => { setLocalSlug(val); setIsDirty(true); };
  const handleExcerptChange = (val: string) => { setLocalExcerpt(val); setIsDirty(true); };
  const handleFeaturedImageChange = (val: string) => { setLocalFeaturedImage(val); setIsDirty(true); };

  const handleSeoSave = (data: Record<string, unknown>) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => deleteMutation.mutate();

  const handlePreview = () => {
    if (article?.wordpressUrl) window.open(article.wordpressUrl, '_blank');
  };

  // --- Loading state ---
  if (isLoading || !article) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  const isPublished = ['PUBLISHED', 'published'].includes(article.status);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <ArticleToolbar
        article={article}
        saveStatus={saveStatus}
        isSaving={saveMutation.isPending}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onBack={onBack}
        onSave={triggerAutosave}
        onStatusChange={(status) => statusMutation.mutate(status)}
        onPublish={() => publishMutation.mutate()}
        onSchedule={() => {/* handled by publish panel */}}
        onPrev={() => onNavigate?.('prev')}
        onNext={() => onNavigate?.('next')}
        onPreview={handlePreview}
        onDelete={() => setDeleteDialog(true)}
        isPublishing={publishMutation.isPending}
      />

      {/* Main Content: Left editor + Right panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Content Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <ArticleContentEditor
            title={editTitle}
            content={editContent}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            readOnly={isPublished}
          />
        </div>

        {/* Right: Tabbed Panels (desktop) */}
        <div className="hidden md:flex w-80 lg:w-96 border-l flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
              <TabsTrigger value="ai" className="gap-1 text-xs data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:shadow-none rounded-none px-3 py-2.5">
                <Sparkles className="size-3" /> AI
              </TabsTrigger>
              <TabsTrigger value="seo" className="gap-1 text-xs data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:shadow-none rounded-none px-3 py-2.5">
                <Search className="size-3" /> SEO
              </TabsTrigger>
              <TabsTrigger value="quality" className="gap-1 text-xs data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:shadow-none rounded-none px-3 py-2.5">
                <BarChart3 className="size-3" /> Quality
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-1 text-xs data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none rounded-none px-3 py-2.5">
                <Link2 className="size-3" /> Links
              </TabsTrigger>
              <TabsTrigger value="monetization" className="gap-1 text-xs data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:shadow-none rounded-none px-3 py-2.5">
                <DollarSign className="size-3" /> Money
              </TabsTrigger>
              <TabsTrigger value="publish" className="gap-1 text-xs data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:shadow-none rounded-none px-3 py-2.5">
                <Send className="size-3" /> Publish
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="ai" className="m-0 mt-0">
                <ArticleAiPanel
                  articleId={articleId}
                  siteId={siteId}
                  title={editTitle}
                  content={editContent}
                  onGenerateComplete={(d) => {
                    if (d.title) { setLocalTitle(d.title); setLocalTitle(""); }
                    if (d.content) { setLocalContent(""); }
                    // Force refresh
                    queryClient.invalidateQueries({ queryKey: ["article", articleId] });
                  }}
                  onSeoComplete={(d) => {
                    if (d.seoTitle) setLocalSeoTitle("");
                    if (d.metaDescription) setLocalSeoDescription("");
                    queryClient.invalidateQueries({ queryKey: ["article", articleId] });
                  }}
                />
              </TabsContent>
              <TabsContent value="seo" className="m-0">
                <ArticleSeoPanel
                  article={article}
                  siteId={siteId}
                  seoTitle={editSeoTitle}
                  seoDescription={editSeoDesc}
                  seoKeywords={editSeoKw}
                  adsenseEnabled={localAdsenseEnabled}
                  seoSchema={article.seoSchema}
                  onSeoTitleChange={setLocalSeoTitle}
                  onSeoDescriptionChange={setLocalSeoDescription}
                  onSeoKeywordsChange={setLocalSeoKeywords}
                  onAdsenseChange={setLocalAdsenseEnabled}
                  onSave={handleSeoSave}
                  isSaving={saveMutation.isPending}
                />
              </TabsContent>
              <TabsContent value="quality" className="m-0">
                <ArticleQualityPanel
                  article={article}
                  siteId={siteId}
                  qualityData={null}
                  onRefresh={() => { setActiveTab("ai"); toast({ title: "Run Quality Analysis from AI panel" }); }}
                />
              </TabsContent>
              <TabsContent value="links" className="m-0">
                <ArticleLinksPanel
                  articleId={articleId}
                  siteId={siteId}
                  links={[]}
                  onRefresh={() => { setActiveTab("ai"); toast({ title: "Run Internal Links from AI panel" }); }}
                  onApplyLink={(rec) => {
                    // Insert link anchor into content
                    const linkHtml = `<a href="/blog/${rec.targetSlug || rec.targetArticleId}">${rec.anchorText}</a>`;
                    handleContentChange(editContent + '\n' + linkHtml);
                  }}
                />
              </TabsContent>
              <TabsContent value="monetization" className="m-0">
                <ArticleMonetizationPanel articleId={articleId} siteId={siteId} />
              </TabsContent>
              <TabsContent value="publish" className="m-0">
                <div className="space-y-4">
                  <ArticlePublishPanel
                    article={article}
                    siteId={siteId}
                    onPublish={() => publishMutation.mutate()}
                    onSchedule={(date) => scheduleMutation.mutate(date)}
                    onUnschedule={() => statusMutation.mutate('APPROVED')}
                    onStatusChange={(s) => statusMutation.mutate(s)}
                    isPublishing={publishMutation.isPending}
                  />
                  <div className="border-t">
                    <ArticleMetadata
                      slug={editSlug}
                      excerpt={editExcerpt}
                      featuredImage={localFeaturedImage}
                      isPublished={isPublished}
                      siteId={siteId}
                      authorId={article?.authorId}
                      onSlugChange={handleSlugChange}
                      onExcerptChange={handleExcerptChange}
                      onFeaturedImageChange={handleFeaturedImageChange}
                      onAuthorChange={(aid) => saveMutation.mutate({ authorId: aid })}
                    />
                  </div>
                  <div className="border-t">
                    <ArticleHistoryPanel
                      articleId={articleId}
                      siteId={siteId}
                      currentTitle={editTitle}
                      currentContent={editContent}
                      onRestored={() => {
                        queryClient.invalidateQueries({ queryKey: ["article", articleId] });
                        toast({ title: "Version restored — check the editor" });
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Mobile: Bottom drawer-style tabs */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
          <div className="flex">
            {[
              { key: "ai", Icon: Sparkles, label: "AI" },
              { key: "seo", Icon: Search, label: "SEO" },
              { key: "quality", Icon: BarChart3, label: "Score" },
              { key: "monetization", Icon: DollarSign, label: "Money" },
              { key: "publish", Icon: Send, label: "Publish" },
            ].map(({ key, Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${activeTab === key ? "text-violet-600" : "text-muted-foreground"}`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="md:hidden" /> {/* Spacer for mobile bottom tabs */}
      <ArticleStatusBar article={article} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

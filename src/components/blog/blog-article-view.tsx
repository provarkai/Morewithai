"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Tag, Loader2, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlogHeader } from "./blog-header";
import { BlogFooter } from "./blog-footer";
import { BlogToc } from "./blog-toc";
import { BlogBreadcrumbs } from "./blog-breadcrumbs";
import { BlogShare } from "./blog-share";
import { BlogRelated } from "./blog-related";
import { getPublicArticle } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { useEffect, useMemo } from "react";

type Article = import("@/lib/api").Article;

function processContentForToc(contentHtml: string): string {
  // Add IDs to h2/h3 headings for TOC linking
  return contentHtml.replace(/<(h[23])>([^<]+)<\/\1>/gi, (_match, tag, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    return `<${tag} id="${id}">${text}</${tag}>`;
  });
}

export function BlogArticleView({
  siteId,
  siteName,
  article,
  onBack,
  onGoAdmin,
}: {
  siteId: string;
  siteName: string;
  article: Article;
  onBack: () => void;
  onGoAdmin: () => void;
}) {
  const { data: fullArticle, isLoading } = useQuery({
    queryKey: ["public-article", article.id],
    queryFn: () => {
      const slug = article.slug || (article.rewrittenTitle || article.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      return getPublicArticle(siteId, slug);
    },
    enabled: !!article.id,
  });

  const a = fullArticle || article;
  const rawContent = a.rewrittenContent || a.originalContent;
  const contentHtml = useMemo(() => processContentForToc(rawContent), [rawContent]);
  const displayTitle = a.rewrittenTitle || a.title;
  const tags = (a as any).tags;
  const tagList = tags?.map((t: any) => t.tag?.name || t.name).filter(Boolean) || [];
  const relatedArticles = (a as any).relatedArticles || [];
  const categoryName = (a as any).category?.name || (typeof a.category === 'object' ? (a.category as any)?.name : a.category);
  const categorySlug = (a as any).category?.slug || (typeof a.category === 'object' ? (a.category as any)?.slug : undefined);

  // SEO head injection
  useEffect(() => {
    const seoTitle = a.seoTitle || displayTitle;
    const seoDesc = a.seoDescription || a.excerpt || "";
    document.title = seoTitle;

    // Update meta tags
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(name.startsWith("og:") ? "property" : "name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", seoDesc);
    setMeta("og:title", seoTitle);
    setMeta("og:description", seoDesc);
    setMeta("og:type", "article");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", seoTitle);
    setMeta("twitter:description", seoDesc);
    if (a.thumbnailUrl) {
      setMeta("og:image", a.thumbnailUrl);
      setMeta("twitter:image", a.thumbnailUrl);
    }
  }, [a, displayTitle]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BlogHeader siteName={siteName} onGoAdmin={onGoAdmin} />

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-8">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={onBack}>
            <ArrowLeft className="size-4" /> Back to Articles
          </Button>

          {/* Breadcrumbs */}
          <BlogBreadcrumbs
            items={[
              ...(categorySlug ? [{ label: categoryName || "Category", href: `/category/${categorySlug}` }] : []),
              { label: displayTitle },
            ]}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <header className="mb-8">
                {/* Category badge */}
                {categoryName && (
                  <a href={categorySlug ? `/category/${categorySlug}` : undefined}>
                    <Badge variant="secondary" className="mb-3 hover:bg-secondary/80 transition-colors">
                      {categoryName}
                    </Badge>
                  </a>
                )}

                <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  {displayTitle}
                </h1>

                {a.seoDescription && (
                  <p className="text-lg text-muted-foreground">{a.seoDescription}</p>
                )}

                {/* Meta row: author, date, reading time, share */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Author Byline */}
                    {a.author ? (
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {a.author.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.author.avatarUrl} alt={a.author.name} className="size-8 rounded-full object-cover" />
                          ) : (
                            a.author.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.author.name}</p>
                          <p className="text-xs text-muted-foreground">Author</p>
                        </div>
                      </div>
                    ) : null}
                    <span className="text-sm text-muted-foreground">
                      {a.publishedAt && format(new Date(a.publishedAt), "MMM d, yyyy")}
                      {a.updatedAt && a.publishedAt && new Date(a.updatedAt).getTime() > new Date(a.publishedAt).getTime() + 86400000 && (
                        <span> · Updated {format(new Date(a.updatedAt), "MMM d, yyyy")}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="size-3.5" />
                      {formatDistanceToNow(new Date(a.publishedAt || a.createdAt), { addSuffix: true })}
                    </span>
                    {(a.wordCount || a.readingTime) && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BookOpen className="size-3.5" />
                        {a.readingTime || Math.max(1, Math.ceil((a.wordCount || 0) / 200))} min read
                      </span>
                    )}
                  </div>
                  <BlogShare title={displayTitle} />
                </div>
              </header>

              {/* Layout: content + sidebar TOC */}
              <div className="flex gap-8">
                <div className="min-w-0 flex-1">
                  {a.thumbnailUrl && (
                    <div className="mb-8 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.thumbnailUrl} alt={displayTitle} className="w-full object-cover" />
                    </div>
                  )}

                  <div
                    data-article-content
                    className="prose prose-neutral dark:prose-invert max-w-none
                      [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4
                      [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3
                      [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2
                      [&_p]:mb-4 [&_p]:leading-relaxed
                      [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
                      [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6
                      [&_li]:mb-1
                      [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic
                      [&_a]:text-primary [&_a]:underline
                      scroll-mt-20"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />

                  {/* Tags */}
                  {tagList.length > 0 && (
                    <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-6">
                      <Tag className="size-4 text-muted-foreground" />
                      {tagList.map((name: string) => (
                        <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Related Articles */}
                  <BlogRelated articles={relatedArticles} />
                </div>

                {/* Sidebar TOC (desktop) */}
                <aside className="hidden w-56 shrink-0 lg:block">
                  <div className="sticky top-20">
                    <BlogToc contentHtml={contentHtml} />
                  </div>
                </aside>
              </div>
            </>
          )}
        </article>
      </main>

      <BlogFooter siteName={siteName} />
    </div>
  );
}
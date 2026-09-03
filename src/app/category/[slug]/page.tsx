"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogFooter } from "@/components/blog/blog-footer";
import { getPublicArticles } from "@/lib/api";

export default function CategoryArchivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["category-articles", slug, page],
    queryFn: () => getPublicArticles(data?.site?.id || "", { category: slug, page, limit: 12 }),
    enabled: false,
  });

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 12);
  const siteName = data?.site?.name || "MoreWithAI";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BlogHeader siteName={siteName} onGoAdmin={() => {}} />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Button variant="ghost" size="sm" className="mb-6 gap-1.5" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" /> Back
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold capitalize">{slug.replace(/-/g, " ")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{total} article{total !== 1 ? "s" : ""}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          ) : articles.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No articles in this category yet.</p>
          ) : (
            <div className="space-y-6">
              {articles.map((article: any) => (
                <article key={article.id} className="group border-b pb-6 last:border-0">
                  <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {article.rewrittenTitle || article.title}
                  </h2>
                  {(article.seoDescription || article.excerpt) && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {article.seoDescription || article.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { addSuffix: true })}
                    </span>
                    {article.wordCount && <span>{article.wordCount} words</span>}
                    {article.readingTime && <span>{article.readingTime} min read</span>}
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      </main>
      <BlogFooter siteName={siteName} />
    </div>
  );
}
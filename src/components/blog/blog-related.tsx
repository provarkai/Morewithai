"use client";

import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface RelatedArticle {
  id: string;
  title: string;
  rewrittenTitle?: string | null;
  seoDescription?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
  slug: string;
  excerpt?: string | null;
  author?: { id: string; name: string; avatarUrl?: string | null; slug: string } | null;
}

interface BlogRelatedProps {
  articles: RelatedArticle[];
  onReadArticle?: (article: any) => void;
}

export function BlogRelated({ articles, onReadArticle }: BlogRelatedProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="mb-6 text-xl font-bold">Related Articles</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {articles.map((article) => {
          const displayTitle = article.rewrittenTitle || article.title;
          return (
            <Card
              key={article.id}
              className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => onReadArticle?.(article)}
            >
              {article.thumbnailUrl && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={article.thumbnailUrl}
                    alt={displayTitle}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                  {displayTitle}
                </h3>
                {(article.seoDescription || article.excerpt) && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {article.seoDescription || article.excerpt}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {article.author && <span>{article.author.name}</span>}
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Clock, Tag, Loader2, Bot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BlogHeader } from "./blog-header";
import { BlogFooter } from "./blog-footer";
import { getPublicArticles } from "@/lib/api";
import type { Article } from "@/lib/api";

export function BlogHomeView({
  siteId,
  siteName,
  onReadArticle,
  onGoAdmin,
}: {
  siteId: string;
  siteName: string;
  onReadArticle: (article: Article) => void;
  onGoAdmin: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["public-articles", siteId, page],
    queryFn: () => getPublicArticles(siteId, { page, limit: 12 }),
  });

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 12);

  const filteredArticles = search
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.seoDescription?.toLowerCase().includes(search.toLowerCase())
      )
    : articles;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BlogHeader siteName={siteName} onGoAdmin={onGoAdmin} />

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-muted/50 to-background">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Bot className="size-4" />
              Powered by AI
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">
              More With <span className="text-primary">AI</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Discover the latest insights in artificial intelligence, machine learning, and emerging tech.
              Curated and enhanced by AI daily.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">No articles published yet.</p>
              <p className="text-sm text-muted-foreground">Check back soon!</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                    onClick={() => onReadArticle(article)}
                  >
                    {article.thumbnailUrl && (
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={article.thumbnailUrl}
                          alt={article.title}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="mb-2 flex items-center gap-2">
                        {article.category && <Badge variant="secondary" className="text-xs">{article.category}</Badge>}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="mb-2 line-clamp-2 font-semibold leading-tight group-hover:text-primary transition-colors">
                        {article.rewrittenTitle || article.title}
                      </h3>
                      {article.seoDescription && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{article.seoDescription}</p>
                      )}
                      <div className="mt-3 flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Read more <ArrowRight className="ml-1 size-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <BlogFooter siteName={siteName} />
    </div>
  );
}

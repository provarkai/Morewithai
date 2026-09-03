"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogFooter } from "@/components/blog/blog-footer";
import { getAuthors, getPublicArticles, getSites } from "@/lib/api";

export default function AuthorArchivePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const siteId = sites[0]?.id;

  const { data: authors = [] } = useQuery({
    queryKey: ["authors", siteId],
    queryFn: () => getAuthors(siteId || ""),
    enabled: !!siteId,
  });

  const author = authors.find((a: any) => a.slug === slug);

  const { data: articlesData } = useQuery({
    queryKey: ["author-articles", siteId, slug],
    queryFn: () => getPublicArticles(siteId!, { limit: 50 }),
    enabled: !!siteId,
  });

  const authorArticles = articlesData?.articles?.filter(
    (a: any) => a.author?.id === author?.id
  ) || [];

  if (!author) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <BlogHeader siteName={sites[0]?.name || "MoreWithAI"} onGoAdmin={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <User className="size-12 mx-auto mb-4 text-muted-foreground/30" />
            <h1 className="text-xl font-semibold mb-2">Author Not Found</h1>
            <p className="text-sm text-muted-foreground">The author profile you are looking for does not exist.</p>
          </div>
        </div>
        <BlogFooter siteName={sites[0]?.name || "MoreWithAI"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BlogHeader siteName={sites[0]?.name || "MoreWithAI"} onGoAdmin={() => {}} />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Button variant="ghost" size="sm" className="mb-6 gap-1.5" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" /> Back
          </Button>

          {/* Author Profile Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-bold">
              {author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatarUrl} alt={author.name} className="size-16 rounded-full object-cover" />
              ) : (
                author.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{author.name}</h1>
              {author.bio && <p className="text-sm text-muted-foreground mt-1">{author.bio}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{authorArticles.length} article{authorArticles.length !== 1 ? "s" : ""}</Badge>
                {author.website && (
                  <a href={author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                    <Globe className="size-3" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Articles List */}
          {authorArticles.length > 0 ? (
            <div className="space-y-6">
              {authorArticles.map((article: any) => (
                <article key={article.id} className="group">
                  <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {article.rewrittenTitle || article.title}
                  </h2>
                  {article.seoDescription && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.seoDescription}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {article.category && <Badge variant="outline" className="text-[10px]">{article.category}</Badge>}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No published articles by this author yet.</p>
            </div>
          )}
        </div>
      </main>
      <BlogFooter siteName={sites[0]?.name || "MoreWithAI"} />
    </div>
  );
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// GET public blog API (NO AUTH required)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json({ error: 'action query param is required (published, article, related)' }, { status: 400 });
    }

    // action=published: return published articles for a site
    if (action === 'published') {
      const siteId = searchParams.get('siteId');
      if (!siteId) {
        return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const categorySlug = searchParams.get('category') || undefined;
      const tagSlug = searchParams.get('tag') || undefined;

      const site = await db.site.findUnique({
        where: { id: siteId },
        select: { id: true, name: true, slug: true, description: true, domain: true, theme: true },
      });

      if (!site) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 });
      }

      const where: Record<string, unknown> = { siteId, status: { in: ['PUBLISHED', 'published', 'UPDATED'] } };
      if (categorySlug) {
        const category = await db.category.findFirst({ where: { slug: categorySlug, siteId } });
        if (category) where.categoryId = category.id;
        else return NextResponse.json({ articles: [], total: 0, page, limit });
      }

      if (tagSlug) {
        const tag = await db.tag.findFirst({ where: { slug: tagSlug, siteId } });
        if (tag) {
          where.tags = { some: { tagId: tag.id } };
        } else {
          return NextResponse.json({ articles: [], total: 0, page, limit });
        }
      }

      const [articles, total] = await Promise.all([
        db.article.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true, title: true, rewrittenTitle: true, rewrittenContent: true,
            seoTitle: true, seoDescription: true, seoKeywords: true,
            thumbnailUrl: true, publishedAt: true, updatedAt: true,
            wordCount: true, readingTime: true, slug: true, excerpt: true,
            author: { select: { id: true, name: true, avatarUrl: true, slug: true } },
            category: { select: { id: true, name: true, slug: true } },
            tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          },
        }),
        db.article.count({ where }),
      ]);

      const publicArticles = articles.map((a) => ({
        ...a,
        displayTitle: a.rewrittenTitle || a.title,
        slug: a.slug || slugify(a.rewrittenTitle || a.title),
      }));

      // Get all categories for filter
      const categories = await db.category.findMany({
        where: { siteId, isActive: true },
        select: { name: true, slug: true, _count: { select: { articles: true } } },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ site, articles: publicArticles, total, page, limit, categories });
    }

    // action=article: return single article by slug
    if (action === 'article') {
      const siteId = searchParams.get('siteId');
      const slug = searchParams.get('slug');

      if (!siteId || !slug) {
        return NextResponse.json({ error: 'siteId and slug are required' }, { status: 400 });
      }

      // Use slug field directly (indexed), fallback to computed slug
      const article = await db.article.findFirst({
        where: {
          siteId,
          status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
          OR: [
            { slug },
            // Fallback: compute slug from title (for articles without slug set)
          ],
        },
        select: {
          id: true, title: true, originalTitle: true, originalContent: true,
          rewrittenTitle: true, rewrittenContent: true, sourceUrl: true,
          thumbnailUrl: true, seoTitle: true, seoDescription: true,
          seoKeywords: true, seoSchema: true, publishedAt: true, updatedAt: true,
          wordCount: true, readingTime: true, slug: true, excerpt: true,
          author: { select: { id: true, name: true, avatarUrl: true, bio: true, website: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      });

      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }

      const displaySlug = article.slug || slugify(article.rewrittenTitle || article.title);

      // Related articles: same category (excluding current), limited to 3
      let relatedArticles: any[] = [];
      if (article.category?.id) {
        relatedArticles = await db.article.findMany({
          where: {
            siteId, id: { not: article.id },
            status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
            categoryId: article.category.id,
          },
          orderBy: { publishedAt: 'desc' },
          take: 3,
          select: {
            id: true, title: true, rewrittenTitle: true, seoDescription: true,
            thumbnailUrl: true, publishedAt: true, slug: true, excerpt: true,
            author: { select: { id: true, name: true, avatarUrl: true, slug: true } },
          },
        });
        relatedArticles = relatedArticles.map((a) => ({
          ...a,
          displayTitle: a.rewrittenTitle || a.title,
          slug: a.slug || slugify(a.rewrittenTitle || a.title),
        }));
      }

      return NextResponse.json({
        ...article,
        displayTitle: article.rewrittenTitle || article.title,
        slug: displaySlug,
        relatedArticles,
      });
    }

    // action=related: get related articles for a given article
    if (action === 'related') {
      const siteId = searchParams.get('siteId');
      const articleId = searchParams.get('articleId');
      if (!siteId || !articleId) {
        return NextResponse.json({ error: 'siteId and articleId are required' }, { status: 400 });
      }
      const article = await db.article.findUnique({ where: { id: articleId }, select: { categoryId: true, id: true } });
      if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

      const related = await db.article.findMany({
        where: {
          siteId, id: { not: articleId },
          status: { in: ['PUBLISHED', 'published', 'UPDATED'] },
          ...(article.categoryId ? { categoryId: article.categoryId } : {}),
        },
        orderBy: { publishedAt: 'desc' }, take: 3,
        select: {
          id: true, title: true, rewrittenTitle: true, seoDescription: true,
          thumbnailUrl: true, publishedAt: true, slug: true, excerpt: true,
          author: { select: { id: true, name: true, avatarUrl: true, slug: true } },
        },
      });
      return NextResponse.json(related.map((a) => ({
        ...a, displayTitle: a.rewrittenTitle || a.title,
        slug: a.slug || slugify(a.rewrittenTitle || a.title),
      })));
    }

    return NextResponse.json({ error: 'Invalid action. Use: published, article, related' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch public data' }, { status: 500 });
  }
}

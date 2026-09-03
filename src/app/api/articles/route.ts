import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { fetchFromFeed, fetchAllFeeds } from '@/lib/services/fetch.service';
import { createVersion } from '@/lib/articles/versioning';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const status = searchParams.get('status');
    const authorId = searchParams.get('authorId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const where: Record<string, unknown> = { siteId };
    if (status) where.status = status;
    if (authorId) where.authorId = authorId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { rewrittenTitle: { contains: search } },
        { originalTitle: { contains: search } },
        { primaryKeyword: { contains: search } },
      ];
    }
    const [articles, total] = await Promise.all([
      db.article.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: {
          feed: { select: { name: true } },
          author: { select: { id: true, name: true, avatarUrl: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true } } } },
        },
      }),
      db.article.count({ where }),
    ]);
    return NextResponse.json({ articles, total, page, limit });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.create');
    const body = await req.json();
    const { feedId, fetchAll, siteId } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (fetchAll) {
      const result = await fetchAllFeeds(siteId);
      return NextResponse.json({ message: 'Fetched ' + result.totalFetched + ' articles', count: result.totalFetched });
    }
    if (feedId) {
      const feed = await db.rssFeed.findFirst({ where: { id: feedId, siteId } });
      if (!feed) return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
      const count = await fetchFromFeed(feedId, feed.url, siteId);
      return NextResponse.json({ message: 'Fetched ' + count + ' articles', count });
    }
    // Manual article creation
    const { title, content, sourceUrl, sourceType, categoryId, authorId } = body;
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    const words = (content || '').split(/\s+/).filter(Boolean).length;
    const article = await db.article.create({
      data: {
        siteId, title, originalTitle: title, originalContent: content || '',
        rewrittenTitle: title, rewrittenContent: content || '',
        sourceUrl: sourceUrl || 'manual-' + Date.now(),
        slug, categoryId: categoryId || null, authorId: authorId || null,
        status: 'DRAFT', wordCount: words, readingTime: Math.max(1, Math.ceil(words / 200)),
      },
    });
    if (sourceUrl) {
      await db.articleSource.create({
        data: { articleId: article.id, url: sourceUrl, sourceType: sourceType || 'MANUAL' },
      });
    }
    return NextResponse.json(article, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requirePermission('article.edit');
    const body = await req.json();
    const { id, status, title, category, seoTitle, seoDescription, seoKeywords, adsenseEnabled, scheduledAt, siteId, categoryId, authorId, primaryKeyword, secondaryKeywords, searchIntent, excerpt, slug, rewrittenTitle, rewrittenContent, tags, thumbnailUrl, seoSchema } = body;
    if (!id || !siteId) return NextResponse.json({ error: 'id and siteId required' }, { status: 400 });
    const existing = await db.article.findFirst({ where: { id, siteId } });
    if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    if (category) updateData.category = category;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (seoKeywords !== undefined) updateData.seoKeywords = seoKeywords;
    if (adsenseEnabled !== undefined) updateData.adsenseEnabled = adsenseEnabled;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (authorId !== undefined) updateData.authorId = authorId;
    if (primaryKeyword !== undefined) updateData.primaryKeyword = primaryKeyword;
    if (secondaryKeywords !== undefined) updateData.secondaryKeywords = secondaryKeywords;
    if (searchIntent !== undefined) updateData.searchIntent = searchIntent;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (slug !== undefined && existing.status !== 'published') updateData.slug = slug;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (seoSchema !== undefined) updateData.seoSchema = seoSchema;
    if (rewrittenTitle !== undefined) updateData.rewrittenTitle = rewrittenTitle;
    if (rewrittenContent !== undefined) {
      updateData.rewrittenContent = rewrittenContent;
      const words = rewrittenContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
      updateData.wordCount = words;
      updateData.readingTime = Math.max(1, Math.ceil(words / 200));
    }
    if (tags && Array.isArray(tags)) {
      await db.articleTag.deleteMany({ where: { articleId: id } });
      for (const tagName of tags) {
        let tag = await db.tag.findFirst({ where: { siteId, name: tagName } });
        if (!tag) {
          tag = await db.tag.create({ data: { siteId, name: tagName, slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } });
        }
        await db.articleTag.create({ data: { articleId: id, tagId: tag.id } }).catch(() => {});
      }
    }
    const article = await db.article.update({ where: { id }, data: updateData });

    // Auto-create version when publishing
    if (status === 'PUBLISHED' || status === 'published') {
      try {
        await createVersion({
          articleId: id,
          title: article.rewrittenTitle || article.title,
          content: article.rewrittenContent || article.originalContent,
          excerpt: article.excerpt,
          changeReason: 'Auto-saved on publish',
        });
      } catch { /* non-blocking */ }
    }

    return NextResponse.json(article);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission('article.delete');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const siteId = searchParams.get('siteId');
    if (!id || !siteId) return NextResponse.json({ error: 'id and siteId required' }, { status: 400 });
    const existing = await db.article.findFirst({ where: { id, siteId } });
    if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    await db.article.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import Parser from 'rss-parser';

const parser = new Parser();

// GET all feeds for a site
export async function GET(req: NextRequest) {
  try {
    await requirePermission('feed.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const feeds = await db.rssFeed.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { articles: true } } },
    });
    return NextResponse.json(feeds);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 });
  }
}

// POST create feed
export async function POST(req: NextRequest) {
  try {
    await requirePermission('feed.write');
    const body = await req.json();
    const { name, url, category, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Verify the site exists
    const site = await db.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Test the RSS feed first
    try {
      await parser.parseURL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid RSS feed URL or unreachable' }, { status: 400 });
    }

    // Check uniqueness per site (composite unique: [url, siteId])
    const existing = await db.rssFeed.findFirst({ where: { url, siteId } });
    if (existing) {
      return NextResponse.json({ error: 'Feed already exists for this site' }, { status: 409 });
    }

    const feed = await db.rssFeed.create({
      data: {
        name: name || new URL(url).hostname,
        url,
        category: category || 'AI',
        siteId,
      },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create feed' }, { status: 500 });
  }
}

// PUT update feed
export async function PUT(req: NextRequest) {
  try {
    await requirePermission('feed.write');
    const body = await req.json();
    const { id, name, url, category, isActive, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const feed = await db.rssFeed.findFirst({ where: { id, siteId } });
    if (!feed) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.rssFeed.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update feed' }, { status: 500 });
  }
}

// DELETE feed
export async function DELETE(req: NextRequest) {
  try {
    await requirePermission('feed.write');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const siteId = searchParams.get('siteId');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const feed = await db.rssFeed.findFirst({ where: { id, siteId } });
    if (!feed) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    await db.article.deleteMany({ where: { sourceFeedId: id, siteId } });
    await db.rssFeed.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete feed' }, { status: 500 });
  }
}

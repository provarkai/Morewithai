import { db } from '@/lib/db';
import Parser from 'rss-parser';

const parser = new Parser();

export async function fetchFromFeed(feedId: string, feedUrl: string, siteId: string): Promise<number> {
  try {
    const feed = await db.rssFeed.findUnique({ where: { id: feedId } });
    const category = feed?.category || 'AI';
    const result = await parser.parseURL(feedUrl);
    let newCount = 0;

    for (const item of result.items) {
      if (!item.title || !item.link) continue;

      const existing = await db.article.findFirst({
        where: { sourceUrl: item.link, siteId },
      });
      if (existing) continue;

      const content = item.contentSnippet || item.content || '';
      const thumbnail = item.enclosure?.url || null;

      await db.article.create({
        data: {
          title: item.title,
          originalTitle: item.title,
          originalContent: content,
          sourceUrl: item.link,
          sourceFeedId: feedId,
          thumbnailUrl: thumbnail,
          status: 'fetched',
          siteId,
          slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
        },
      });
      newCount++;
    }

    await db.rssFeed.update({
      where: { id: feedId },
      data: { lastFetched: new Date(), fetchCount: { increment: 1 } },
    });

    return newCount;
  } catch (error) {
    console.error(`Error fetching feed ${feedUrl}:`, error);
    return 0;
  }
}

export async function fetchAllFeeds(siteId: string): Promise<{ totalFetched: number; errors: number; feedCount: number }> {
  const feeds = await db.rssFeed.findMany({ where: { isActive: true, siteId } });
  let totalFetched = 0;
  let errors = 0;

  for (const feed of feeds) {
    try {
      const count = await fetchFromFeed(feed.id, feed.url, siteId);
      totalFetched += count;
    } catch {
      errors++;
    }
  }

  return { totalFetched, errors, feedCount: feeds.length };
}

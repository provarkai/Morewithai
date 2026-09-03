import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';

// GET scheduled articles for a site
export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const articles = await db.article.findMany({
      where: { status: 'scheduled', siteId },
      orderBy: { scheduledAt: 'asc' },
      include: { feed: { select: { name: true } } },
    });
    return NextResponse.json(articles);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch scheduled articles';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message.includes('401') ? 401 : 500 });
  }
}

// POST schedule articles for a site
export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.edit');
    const body = await req.json();
    const { articleId, scheduleAll, scheduledDate, batchSize, intervalMinutes, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Schedule a single article
    if (articleId && scheduledDate) {
      const article = await db.article.findFirst({ where: { id: articleId, siteId } });
      if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      if (article.status !== 'rewritten' && article.status !== 'approved') {
        return NextResponse.json({ error: 'Article must be rewritten or approved to schedule' }, { status: 400 });
      }

      await db.article.update({
        where: { id: articleId },
        data: { status: 'scheduled', scheduledAt: new Date(scheduledDate) },
      });

      return NextResponse.json({ message: `Article scheduled for ${new Date(scheduledDate).toLocaleString()}` });
    }

    // Schedule all approved articles with staggered times
    if (scheduleAll) {
      const articles = await db.article.findMany({ where: { status: 'approved', siteId } });
      if (articles.length === 0) {
        return NextResponse.json({ error: 'No approved articles to schedule' }, { status: 400 });
      }

      const size = batchSize || 3;
      const interval = (intervalMinutes || 120) * 60 * 1000; // default 2 hours
      const startHour = 9; // 9 AM
      const now = new Date();
      let scheduleTime = new Date(now);
      scheduleTime.setHours(startHour, 0, 0, 0);
      if (scheduleTime <= now) scheduleTime.setDate(scheduleTime.getDate() + 1);

      let scheduledCount = 0;
      const articlesPerDay = size;

      for (let i = 0; i < articles.length; i++) {
        const dayOffset = Math.floor(i / articlesPerDay);
        const slotInDay = i % articlesPerDay;
        const publishTime = new Date(scheduleTime);
        publishTime.setDate(publishTime.getDate() + dayOffset);
        publishTime.setTime(publishTime.getTime() + slotInDay * interval);

        await db.article.update({
          where: { id: articles[i].id },
          data: { status: 'scheduled', scheduledAt: publishTime },
        });
        scheduledCount++;
      }

      await db.automationLog.create({
        data: {
          action: 'schedule',
          status: 'success',
          message: `Scheduled ${scheduledCount} articles (${size}/day, every ${intervalMinutes || 120}min)`,
          siteId,
        },
      });

      return NextResponse.json({ message: `Scheduled ${scheduledCount} articles`, count: scheduledCount });
    }

    return NextResponse.json({ error: 'Provide articleId+scheduledDate or scheduleAll' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to schedule';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message.includes('401') ? 401 : 500 });
  }
}

// PUT update schedule time for a site
export async function PUT(req: NextRequest) {
  try {
    await requirePermission('article.edit');
    const body = await req.json();
    const { id, scheduledAt, status, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.article.findFirst({ where: { id, siteId } });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
    if (status) data.status = status;

    const article = await db.article.update({ where: { id }, data });
    return NextResponse.json(article);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update schedule';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message.includes('401') ? 401 : 500 });
  }
}

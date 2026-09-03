import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { publishArticle, batchPublishArticles, getWpSettings } from '@/lib/services/publish.service';

// GET test WordPress connection
export async function GET(req: NextRequest) {
  try {
    await requirePermission('article.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const wp = await getWpSettings(siteId);

    if (!wp) {
      return NextResponse.json({
        connected: false,
        message: 'WordPress credentials not configured',
        siteUrl: '',
      });
    }

    try {
      const response = await fetch(`${wp.wpUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${wp.wpUser}:${wp.wpAppPwd}`).toString('base64'),
        },
      });
      if (response.ok) {
        const user = await response.json();
        return NextResponse.json({
          connected: true,
          message: `Connected as ${user.name}`,
          siteUrl: wp.wpUrl,
          userName: user.name,
        });
      }
      return NextResponse.json({ connected: false, message: 'Invalid credentials', siteUrl: wp.wpUrl });
    } catch {
      return NextResponse.json({ connected: false, message: 'Could not reach WordPress site', siteUrl: wp.wpUrl });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check WordPress connection' }, { status: 500 });
  }
}

// POST publish articles
export async function POST(req: NextRequest) {
  try {
    await requirePermission('article.publish');
    const body = await req.json();
    const { articleId, publishAllApproved, publishScheduled, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    let articles;
    if (publishScheduled) {
      articles = await db.article.findMany({
        where: { status: 'scheduled', scheduledAt: { lte: new Date() }, siteId },
      });
    } else if (publishAllApproved) {
      articles = await db.article.findMany({ where: { status: 'approved', siteId } });
    } else if (articleId) {
      const article = await db.article.findFirst({ where: { id: articleId, siteId } });
      articles = article ? [article] : [];
    } else {
      return NextResponse.json(
        { error: 'articleId, publishAllApproved, or publishScheduled is required' },
        { status: 400 },
      );
    }

    if (articles.length === 0) {
      return NextResponse.json({ message: 'No articles to publish', success: 0, failed: 0 });
    }

    const articleIds = articles.map((a) => a.id);
    const result = await batchPublishArticles(articleIds);

    await db.automationLog.create({
      data: {
        action: 'publish',
        status: result.failed === 0 ? 'success' : 'partial',
        message: `Published ${result.success} articles to WordPress${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        siteId,
      },
    });

    return NextResponse.json({
      message: `Published ${result.success}, ${result.failed} failed`,
      success: result.success,
      failed: result.failed,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 });
  }
}

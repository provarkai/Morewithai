import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createSocialPost, listSocialPosts, generatePostsForArticle, repurposeArticle, getSocialStats } from '@/lib/social/service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('growth.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getSocialStats(siteId);
      return NextResponse.json(stats);
    }

    const result = await listSocialPosts(siteId, {
      platform: searchParams.get('platform') as any || undefined,
      status: searchParams.get('status') || undefined,
      articleId: searchParams.get('articleId') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list social posts';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('growth.write');
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'generate') {
      const body = await req.json();
      const { siteId, articleId } = body;
      if (!siteId || !articleId) return NextResponse.json({ error: 'siteId and articleId are required' }, { status: 400 });

      const posts = await generatePostsForArticle(articleId, siteId);
      return NextResponse.json({ posts, count: posts.length });
    }

    if (action === 'repurpose') {
      const body = await req.json();
      const { siteId, articleId } = body;
      if (!siteId || !articleId) return NextResponse.json({ error: 'siteId and articleId are required' }, { status: 400 });

      const result = await repurposeArticle(articleId, siteId);
      return NextResponse.json(result);
    }

    // Standard create
    const body = await req.json();
    const { siteId, ...data } = body;
    if (!siteId || !data.platform || !data.content) {
      return NextResponse.json({ error: 'siteId, platform, and content are required' }, { status: 400 });
    }

    const post = await createSocialPost({ siteId, ...data });
    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create social post';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

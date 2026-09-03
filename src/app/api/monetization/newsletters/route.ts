import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createNewsletterTier, getNewsletterTiers, getNewsletterAnalytics, getGatedContent } from '@/lib/monetization/paid-newsletters.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.view');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const action = req.nextUrl.searchParams.get('action');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (action === 'analytics') return NextResponse.json(await getNewsletterAnalytics(siteId));
    if (action === 'gated') {
      const articleId = req.nextUrl.searchParams.get('articleId');
      if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });
      return NextResponse.json(await getGatedContent(articleId, siteId, req.nextUrl.searchParams.get('email') || undefined));
    }
    return NextResponse.json(await getNewsletterTiers(siteId));
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { siteId, name, description, price, interval, features } = body;
    if (!siteId || !name) return NextResponse.json({ error: 'siteId and name required' }, { status: 400 });
    const tier = await createNewsletterTier(siteId, { name, description: description || '', price: price || 0, interval: interval || 'MONTHLY', features: features || [] });
    return NextResponse.json(tier);
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

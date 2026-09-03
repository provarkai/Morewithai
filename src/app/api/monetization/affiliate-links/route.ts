import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createCloakedLink, getCloakedLinks, resolveCloakedLink, enableAbTest, getAffiliateAnalytics } from '@/lib/monetization/affiliate-cloaking.service';

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const slug = req.nextUrl.searchParams.get('slug');

    // Public: resolve cloaked link redirect
    if (slug && !siteId) {
      const result = await resolveCloakedLink(slug);
      if (!result) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
      return NextResponse.redirect(result.redirectUrl);
    }

    await requirePermission('articles.view');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (action === 'analytics') return NextResponse.json(await getAffiliateAnalytics(siteId));
    return NextResponse.json(await getCloakedLinks(siteId));
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, siteId, linkId, originalUrl, title, category, variants } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    switch (action) {
      case 'create': {
        if (!originalUrl || !title) return NextResponse.json({ error: 'originalUrl and title required' }, { status: 400 });
        return NextResponse.json(await createCloakedLink(siteId, { originalUrl, title, category }));
      }
      case 'enable-ab': {
        if (!linkId || !variants?.length) return NextResponse.json({ error: 'linkId and variants required' }, { status: 400 });
        return NextResponse.json(await enableAbTest(linkId, variants));
      }
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

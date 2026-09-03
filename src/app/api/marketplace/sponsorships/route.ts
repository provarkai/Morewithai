import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createSponsorship, getBrandSponsorships, getOpenSponsorships, applyToSponsorship, getPublisherApplications, getMarketplaceListings, getSponsorshipStats, acceptApplication } from '@/lib/marketplace/sponsored-content.service';

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const brandId = req.nextUrl.searchParams.get('brandId');
    const publisherId = req.nextUrl.searchParams.get('publisherId');

    if (action === 'marketplace') return NextResponse.json(await getMarketplaceListings());
    if (action === 'open') return NextResponse.json(await getOpenSponsorships(siteId || undefined));
    if (action === 'stats' && siteId) {
      await requirePermission('articles.view');
      return NextResponse.json(await getSponsorshipStats(siteId));
    }
    if (publisherId) {
      await requirePermission('articles.view');
      return NextResponse.json(await getPublisherApplications(publisherId));
    }
    if (brandId) {
      await requirePermission('articles.view');
      return NextResponse.json(await getBrandSponsorships(brandId));
    }
    return NextResponse.json({ error: 'Parameter required' }, { status: 400 });
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, ...data } = body;
    switch (action) {
      case 'create': return NextResponse.json(await createSponsorship(data));
      case 'apply': return NextResponse.json(await applyToSponsorship(data.sponsorshipId, data));
      case 'accept': return NextResponse.json(await acceptApplication(data.sponsorshipId, data.applicationId, data.brandId));
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

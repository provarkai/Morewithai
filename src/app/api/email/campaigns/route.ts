import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { listCampaigns, createCampaign, getCampaignStats } from '@/lib/email/campaign.service';
import { CAMPAIGN_TYPE } from '@/lib/email/types';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('email.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getCampaignStats(siteId);
      return NextResponse.json(stats);
    }

    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await listCampaigns(siteId, { type, status, page, limit });
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('email.write');
    const body = await req.json();
    const { siteId, name, type, subject, previewText, content } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!subject?.trim()) return NextResponse.json({ error: 'subject required' }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

    if (type && !Object.values(CAMPAIGN_TYPE).includes(type)) {
      return NextResponse.json({ error: `Invalid campaign type: ${type}` }, { status: 400 });
    }

    const campaign = await createCampaign({ siteId, name, type, subject, previewText, content });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

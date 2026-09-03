import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import {
  getCampaign,
  updateCampaign,
  deleteCampaign,
  scheduleCampaign,
  sendCampaign,
} from '@/lib/email/campaign.service';
import { CAMPAIGN_TYPE } from '@/lib/email/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const campaign = await getCampaign(id, siteId);
    return NextResponse.json(campaign);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Campaign not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const body = await req.json();
    const { name, type, subject, previewText, content } = body;

    if (type && !Object.values(CAMPAIGN_TYPE).includes(type)) {
      return NextResponse.json({ error: `Invalid campaign type: ${type}` }, { status: 400 });
    }

    const campaign = await updateCampaign(id, siteId, {
      name,
      type,
      subject,
      previewText,
      content,
    });
    return NextResponse.json(campaign);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Campaign not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    await deleteCampaign(id, siteId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Campaign not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('email.write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const body = await req.json();
    const { action, scheduledAt } = body;

    if (action === 'schedule') {
      if (!scheduledAt) {
        return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
      }
      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
      }
      const campaign = await scheduleCampaign(id, siteId, date);
      return NextResponse.json(campaign);
    }

    if (action === 'send') {
      const result = await sendCampaign(id, siteId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action. Use "send" or "schedule".' }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : 'Failed';
    const status = msg === 'Campaign not found' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

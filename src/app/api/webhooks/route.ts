import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createWebhook, listWebhooks, updateWebhook, deleteWebhook, testWebhook, getWebhookDeliveries, WEBHOOK_EVENT_TYPES } from '@/lib/webhooks/webhook-builder.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.view');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const action = req.nextUrl.searchParams.get('action');

    if (action === 'events') {
      return NextResponse.json(WEBHOOK_EVENT_TYPES);
    }

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'deliveries') {
      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
      const deliveries = await getWebhookDeliveries(siteId, limit);
      return NextResponse.json({ deliveries });
    }

    const webhooks = await listWebhooks(siteId);
    return NextResponse.json({ webhooks });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, siteId, webhookId, url, eventTypes } = body;

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    switch (action) {
      case 'create': {
        if (!url || !eventTypes?.length) {
          return NextResponse.json({ error: 'url and eventTypes required' }, { status: 400 });
        }
        const webhook = await createWebhook(siteId, url, eventTypes);
        return NextResponse.json(webhook);
      }
      case 'update': {
        if (!webhookId) return NextResponse.json({ error: 'webhookId required' }, { status: 400 });
        const updated = await updateWebhook(webhookId, siteId, { url, eventTypes, isActive: body.isActive });
        return NextResponse.json(updated);
      }
      case 'delete': {
        if (!webhookId) return NextResponse.json({ error: 'webhookId required' }, { status: 400 });
        const deleted = await deleteWebhook(webhookId, siteId);
        return NextResponse.json({ deleted });
      }
      case 'test': {
        if (!webhookId) return NextResponse.json({ error: 'webhookId required' }, { status: 400 });
        const delivery = await testWebhook(webhookId, siteId);
        return NextResponse.json(delivery);
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

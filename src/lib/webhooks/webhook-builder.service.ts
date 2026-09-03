import { db } from '@/lib/db';
import crypto from 'crypto';

// ─── Types ──────────────────────────────────────────────────

export type WebhookEventType =
  | 'article.published'
  | 'article.updated'
  | 'article.deleted'
  | 'subscriber.created'
  | 'subscriber.removed'
  | 'revenue.created'
  | 'campaign.sent'
  | 'cta.clicked'
  | 'affiliate.conversion'
  | 'lead.created'
  | 'product.purchased';

export interface WebhookConfig {
  id: string;
  siteId: string;
  url: string;
  eventTypes: WebhookEventType[];
  secret: string;
  isActive: boolean;
  lastTriggered: string | null;
  successCount: number;
  failCount: number;
  createdAt: string;
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  siteId: string;
  data: Record<string, unknown>;
  webhookId: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: WebhookPayload;
  statusCode: number | null;
  response: string | null;
  success: boolean;
  deliveredAt: string;
  duration: number;
}

// ─── Event Type Metadata ────────────────────────────────────

export const WEBHOOK_EVENT_TYPES: { type: WebhookEventType; label: string; description: string; category: string }[] = [
  { type: 'article.published', label: 'Article Published', description: 'When an article goes live', category: 'Content' },
  { type: 'article.updated', label: 'Article Updated', description: 'When article content changes', category: 'Content' },
  { type: 'article.deleted', label: 'Article Deleted', description: 'When an article is removed', category: 'Content' },
  { type: 'subscriber.created', label: 'New Subscriber', description: 'When someone subscribes', category: 'Audience' },
  { type: 'subscriber.removed', label: 'Subscriber Removed', description: 'When someone unsubscribes', category: 'Audience' },
  { type: 'revenue.created', label: 'Revenue Event', description: 'When revenue is recorded', category: 'Revenue' },
  { type: 'campaign.sent', label: 'Campaign Sent', description: 'When an email campaign is sent', category: 'Email' },
  { type: 'cta.clicked', label: 'CTA Clicked', description: 'When a call-to-action is clicked', category: 'Engagement' },
  { type: 'affiliate.conversion', label: 'Affiliate Conversion', description: 'When an affiliate link converts', category: 'Revenue' },
  { type: 'lead.created', label: 'New Lead', description: 'When a lead magnet is downloaded', category: 'Audience' },
  { type: 'product.purchased', label: 'Product Purchased', description: 'When a product is bought', category: 'Revenue' },
];

// ─── Webhook Management ─────────────────────────────────────

export async function createWebhook(
  siteId: string,
  url: string,
  eventTypes: WebhookEventType[],
): Promise<WebhookConfig> {
  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await db.webhook.create({
    data: {
      siteId,
      url,
      eventTypes: JSON.stringify(eventTypes),
      secret,
      isActive: true,
    },
  });

  return {
    id: webhook.id,
    siteId: webhook.siteId,
    url: webhook.url,
    eventTypes: eventTypes,
    secret: webhook.secret || secret,
    isActive: webhook.isActive,
    lastTriggered: webhook.lastTriggered?.toISOString() || null,
    successCount: webhook.successCount,
    failCount: webhook.failCount,
    createdAt: webhook.createdAt.toISOString(),
  };
}

export async function listWebhooks(siteId: string): Promise<WebhookConfig[]> {
  const webhooks = await db.webhook.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
  });

  return webhooks.map((w) => ({
    id: w.id,
    siteId: w.siteId,
    url: w.url,
    eventTypes: JSON.parse(w.eventTypes || '[]'),
    secret: w.secret || '',
    isActive: w.isActive,
    lastTriggered: w.lastTriggered?.toISOString() || null,
    successCount: w.successCount,
    failCount: w.failCount,
    createdAt: w.createdAt.toISOString(),
  }));
}

export async function updateWebhook(
  webhookId: string,
  siteId: string,
  updates: { url?: string; eventTypes?: WebhookEventType[]; isActive?: boolean },
): Promise<WebhookConfig | null> {
  const webhook = await db.webhook.findFirst({ where: { id: webhookId, siteId } });
  if (!webhook) return null;

  const updated = await db.webhook.update({
    where: { id: webhookId },
    data: {
      ...(updates.url !== undefined ? { url: updates.url } : {}),
      ...(updates.eventTypes !== undefined ? { eventTypes: JSON.stringify(updates.eventTypes) } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    },
  });

  return {
    id: updated.id,
    siteId: updated.siteId,
    url: updated.url,
    eventTypes: JSON.parse(updated.eventTypes || '[]'),
    secret: updated.secret || '',
    isActive: updated.isActive,
    lastTriggered: updated.lastTriggered?.toISOString() || null,
    successCount: updated.successCount,
    failCount: updated.failCount,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteWebhook(webhookId: string, siteId: string): Promise<boolean> {
  const webhook = await db.webhook.findFirst({ where: { id: webhookId, siteId } });
  if (!webhook) return false;
  await db.webhook.delete({ where: { id: webhookId } });
  return true;
}

// ─── Webhook Triggering ─────────────────────────────────────

export async function triggerWebhooks(
  siteId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<WebhookDelivery[]> {
  const webhooks = await db.webhook.findMany({
    where: { siteId, isActive: true },
  });

  const deliveries: WebhookDelivery[] = [];

  for (const webhook of webhooks) {
    const eventTypes: string[] = JSON.parse(webhook.eventTypes || '[]');
    if (!eventTypes.includes(eventType)) continue;

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      siteId,
      data,
      webhookId: webhook.id,
    };

    const startTime = Date.now();
    let statusCode: number | null = null;
    let response: string | null = null;
    let success = false;

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret || '',
          'X-Webhook-Event': eventType,
          'X-Webhook-ID': webhook.id,
          'User-Agent': 'MoreWithAI-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      statusCode = res.status;
      response = await res.text().catch(() => '');
      success = res.ok;

      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date(),
          successCount: success ? webhook.successCount + 1 : webhook.successCount,
          failCount: success ? webhook.failCount : webhook.failCount + 1,
        },
      });
    } catch (err: unknown) {
      response = err instanceof Error ? err.message : 'Request failed';
      await db.webhook.update({
        where: { id: webhook.id },
        data: { failCount: webhook.failCount + 1 },
      });
    }

    // Log the delivery
    await db.webhookEvent.create({
      data: {
        webhookId: webhook.id,
        eventType,
        payload: JSON.stringify(payload),
        statusCode: statusCode || 0,
        response: response?.slice(0, 1000) || null,
        durationMs: Date.now() - startTime,
      },
    });

    deliveries.push({
      id: `delivery-${webhook.id}-${Date.now()}`,
      webhookId: webhook.id,
      eventType,
      payload,
      statusCode,
      response: response?.slice(0, 500) || null,
      success,
      deliveredAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    });
  }

  return deliveries;
}

/**
 * Test a webhook by sending a ping event.
 */
export async function testWebhook(webhookId: string, siteId: string): Promise<WebhookDelivery> {
  return triggerWebhooks(siteId, 'article.published', {
    test: true,
    message: 'Webhook test from MoreWithAI',
    timestamp: new Date().toISOString(),
  }).then((d) => d[0] || {
    id: `test-${Date.now()}`,
    webhookId,
    eventType: 'article.published',
    payload: { event: 'article.published', timestamp: new Date().toISOString(), siteId, data: { test: true }, webhookId },
    statusCode: null,
    response: 'No matching webhooks found',
    success: false,
    deliveredAt: new Date().toISOString(),
    duration: 0,
  });
}

/**
 * Gets recent webhook deliveries for a site.
 */
export async function getWebhookDeliveries(
  siteId: string,
  limit: number = 20,
): Promise<WebhookDelivery[]> {
  const webhooks = await db.webhook.findMany({ where: { siteId }, select: { id: true } });
  const webhookIds = webhooks.map((w) => w.id);

  if (webhookIds.length === 0) return [];

  const events = await db.webhookEvent.findMany({
    where: { webhookId: { in: webhookIds } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map((e) => ({
    id: e.id,
    webhookId: e.webhookId,
    eventType: e.eventType,
    payload: JSON.parse(e.payload || '{}'),
    statusCode: e.statusCode,
    response: e.response,      success: e.statusCode !== null && e.statusCode >= 200 && e.statusCode < 300,
    deliveredAt: e.createdAt.toISOString(),      duration: e.durationMs || 0,
  }));
}

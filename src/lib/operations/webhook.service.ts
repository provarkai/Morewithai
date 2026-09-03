import { db } from '@/lib/db';
import crypto from 'crypto';

export async function createWebhook(data: { siteId: string; url: string; events: string[]; secret?: string }) {
  const secret = data.secret || crypto.randomBytes(32).toString('hex');
  return db.webhook.create({ data: { siteId: data.siteId, url: data.url, eventTypes: JSON.stringify(data.events), secret } });
}

export async function listWebhooks(siteId: string) {
  return db.webhook.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' } });
}

export async function deleteWebhook(id: string, siteId: string) {
  return db.webhook.delete({ where: { id, siteId } });
}

export async function deliverWebhook(siteId: string, eventType: string, payload: Record<string, unknown>) {
  const webhooks = await db.webhook.findMany({ where: { siteId, isActive: true } });
  const results: any[] = [];
  for (const webhook of webhooks) {
    try {
      const events: string[] = JSON.parse(webhook.eventTypes || '[]');
      if (!events.includes(eventType) && !events.includes('*')) continue;
      const startTime = Date.now();
      const signature = crypto.createHmac('sha256', webhook.secret || '').update(JSON.stringify(payload)).digest('hex');
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Event': eventType },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      const durationMs = Date.now() - startTime;
      await (db as any).webhookEvent.create({
        data: { webhookId: webhook.id, eventType, payload: JSON.stringify(payload), statusCode: response.status, durationMs },
      });
      await db.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggered: new Date(), successCount: { increment: 1 } },
      });
      results.push({ webhookId: webhook.id, success: response.ok, statusCode: response.status, durationMs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await (db as any).webhookEvent.create({
        data: { webhookId: webhook.id, eventType, payload: JSON.stringify(payload), durationMs: 0 },
      });
      await db.webhook.update({ where: { id: webhook.id }, data: { failCount: { increment: 1 } } });
      results.push({ webhookId: webhook.id, success: false, error: message });
    }
  }
  return results;
}

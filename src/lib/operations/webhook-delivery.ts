import crypto from 'crypto';
import { db } from '@/lib/db';

interface WebhookDeliveryResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  durationMs: number;
  error?: string;
}

/**
 * Deliver a webhook event to all subscribed webhooks.
 * Signs the payload with HMAC-SHA256 and records delivery results.
 */
export async function deliverWebhook(
  siteId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<WebhookDeliveryResult[]> {
  const webhooks = await db.webhook.findMany({
    where: {
      siteId,
      isActive: true,
    },
  });

  const results: WebhookDeliveryResult[] = [];

  for (const webhook of webhooks) {
    try {
      // Check if this webhook subscribes to this event type
      const eventTypes: string[] = JSON.parse(webhook.eventTypes || '[]');
      if (!eventTypes.includes(eventType) && !eventTypes.includes('*')) {
        continue;
      }

      const startTime = Date.now();
      const body = JSON.stringify(payload);

      // Sign the payload with HMAC-SHA256
      const signature = crypto
        .createHmac('sha256', webhook.secret || '')
        .update(body)
        .digest('hex');

      // Send the webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': eventType,
          'X-Webhook-Delivery': crypto.randomUUID(),
          'User-Agent': 'MoreWithAI-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      const durationMs = Date.now() - startTime;

      // Record the delivery event
      await db.webhookEvent.create({
        data: {
          webhookId: webhook.id,
          eventType,
          payload: body.slice(0, 10000), // Truncate large payloads
          statusCode: response.status,
          durationMs,
        },
      });

      // Update webhook stats
      if (response.ok) {
        await db.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggered: new Date(),
            successCount: { increment: 1 },
          },
        });
      } else {
        await db.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggered: new Date(),
            failCount: { increment: 1 },
          },
        });
      }

      results.push({
        webhookId: webhook.id,
        success: response.ok,
        statusCode: response.status,
        durationMs,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const durationMs = 0;

      // Record the failed delivery
      await db.webhookEvent.create({
        data: {
          webhookId: webhook.id,
          eventType,
          payload: JSON.stringify(payload).slice(0, 10000),
          durationMs,
        },
      });

      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date(),
          failCount: { increment: 1 },
        },
      });

      results.push({
        webhookId: webhook.id,
        success: false,
        durationMs,
        error: message,
      });
    }
  }

  return results;
}

/**
 * Verify a webhook signature against a payload.
 * Use this in webhook receivers to validate incoming webhooks.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  if (receivedSignature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature),
  );
}

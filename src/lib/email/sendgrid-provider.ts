import type { EmailProvider } from './provider';

/**
 * SendGridProvider — sends emails via the SendGrid Web API v3.
 * Requires SENDGRID_API_KEY environment variable.
 */
export class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = 'noreply@morewithai.online') {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async send(
    to: string,
    subject: string,
    html: string,
    options?: {
      from?: string;
      replyTo?: string;
      previewText?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: to }],
            subject,
            ...(options?.previewText
              ? { custom_args: { preview_text: options.previewText } }
              : {}),
          },
        ],
        from: { email: options?.from || this.fromEmail },
        reply_to: options?.replyTo ? { email: options.replyTo } : undefined,
        content: [{ type: 'text/html', value: html }],
      };

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as any)?.errors?.[0]?.message || `SendGrid API error ${res.status}`;
        return { success: false, error: msg };
      }

      // SendGrid returns 202 with x-message-id header
      const messageId = res.headers.get('x-message-id') || `sg_${Date.now()}`;
      return { success: true, messageId };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email via SendGrid',
      };
    }
  }
}

/**
 * Create a SendGridProvider from environment variables.
 * Returns null if SENDGRID_API_KEY is not set.
 */
export function createSendGridProvider(): SendGridProvider | null {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@morewithai.online';
  return new SendGridProvider(apiKey, fromEmail);
}

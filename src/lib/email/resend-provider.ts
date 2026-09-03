import { Resend } from 'resend';
import type { EmailProvider } from './provider';

/**
 * ResendProvider — sends emails via the Resend API.
 * Requires RESEND_API_KEY environment variable.
 */
export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = 'noreply@morewithai.online') {
    this.resend = new Resend(apiKey);
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
      const result = await this.resend.emails.send({
        from: options?.from || this.fromEmail,
        to: [to],
        subject,
        html,
        text: this.htmlToText(html),
        headers: options?.previewText
          ? { 'X-Preview-Text': options.previewText }
          : undefined,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Resend API error',
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email via Resend',
      };
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Create a ResendProvider from environment variables.
 * Returns null if RESEND_API_KEY is not set.
 */
export function createResendProvider(): ResendProvider | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@morewithai.online';
  return new ResendProvider(apiKey, fromEmail);
}

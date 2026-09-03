import { db } from '@/lib/db';
import type { EmailResult } from './types';
import { createResendProvider, type ResendProvider } from './resend-provider';
import { createSendGridProvider, type SendGridProvider } from './sendgrid-provider';

export interface EmailProvider {
  send(
    to: string,
    subject: string,
    html: string,
    options?: {
      from?: string;
      replyTo?: string;
      previewText?: string;
    },
  ): Promise<EmailResult>;
}

/**
 * LogProvider — logs emails to console and returns success.
 * Used for development and testing.
 */
class LogProvider implements EmailProvider {
  async send(
    to: string,
    subject: string,
    html: string,
    options?: { from?: string; replyTo?: string; previewText?: string },
  ): Promise<EmailResult> {
    console.log('─── 📧 EMAIL (LogProvider) ───');
    console.log(`  To:      ${to}`);
    console.log(`  From:    ${options?.from ?? '(default)'}`);
    console.log(`  ReplyTo: ${options?.replyTo ?? '(none)'}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Preview: ${options?.previewText ?? '(none)'}`);
    console.log(`  HTML:    ${html.length > 200 ? html.slice(0, 200) + '...' : html}`);
    console.log('─────────────────────────────');

    return {
      success: true,
      messageId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    };
  }
}

const logProvider = new LogProvider();

/**
 * Resolves the appropriate email provider for a site based on its settings.
 * Falls back to LogProvider when no provider is configured.
 */
export async function getEmailProvider(siteId: string): Promise<EmailProvider> {
  try {
    // For global auth emails (siteId === 'global'), skip site-specific settings
    // and go directly to env-var-based provider detection
    if (siteId !== 'global') {
      const setting = await db.setting.findUnique({
        where: { key_siteId: { key: 'email_provider', siteId } },
      });

      if (setting) {
        const providerType = setting.value;

        switch (providerType) {
          case 'smtp': {
            console.warn(`[email] SMTP provider not yet implemented, using LogProvider for site ${siteId}`);
            return logProvider;
          }
          case 'resend': {
            const resendProvider = createResendProvider();
            if (resendProvider) return resendProvider;
            console.warn(`[email] RESEND_API_KEY not set, falling back to LogProvider for site ${siteId}`);
            return logProvider;
          }
          case 'sendgrid': {
            const sendgridProvider = createSendGridProvider();
            if (sendgridProvider) return sendgridProvider;
            console.warn(`[email] SENDGRID_API_KEY not set, falling back to LogProvider for site ${siteId}`);
            return logProvider;
          }
          case 'log':
            return logProvider;
        }
      }
    }

    // Auto-detect from environment variables (used for global emails or when no site setting exists)
    const resendProvider = createResendProvider();
    if (resendProvider) return resendProvider;

    const sendgridProvider = createSendGridProvider();
    if (sendgridProvider) return sendgridProvider;

    // Fallback to log
    return logProvider;
  } catch {
    return logProvider;
  }
}

interface EmailTemplateResult {
  subject: string;
  html: string;
}

function wrapHtml(bodyHtml: string, siteName?: string, previewText?: string): string {
  const displayName = siteName ?? 'MoreWithAI';
  const preview = previewText ?? '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  ${preview ? `<meta name="x-preview-text" content="${preview.replace(/"/g, '&quot;')}" />` : ''}
  <title>${displayName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding:24px 0; text-align:center;">
              <span style="font-size:22px; font-weight:700; color:#18181b;">${displayName}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff; border-radius:12px; padding:40px 32px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:13px; color:#a1a1aa;">
                &copy; ${new Date().getFullYear()} ${displayName}. All rights reserved.
              </p>
              <p style="margin:0; font-size:13px; color:#a1a1aa;">
                <a href="{{unsubscribe_url}}" style="color:#71717a; text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmail(subscriber: { firstName?: string | null; siteName?: string }): EmailTemplateResult {
  const greeting = subscriber.firstName ? `Hi ${subscriber.firstName}` : 'Hello';

  const body = `
    <p style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#18181b;">${greeting}, welcome aboard! 🎉</p>
    <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#3f3f46;">
      Thanks for subscribing to <strong>${subscriber.siteName ?? 'our newsletter'}</strong>. We're excited to have you as part of our community.
    </p>
    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#3f3f46;">
      You can expect regular updates, curated content, and exclusive insights delivered straight to your inbox.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
      <tr>
        <td style="border-radius:8px; background-color:#18181b;">
          <a href="{{site_url}}" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
            Explore Our Content
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Welcome to ${subscriber.siteName ?? 'our newsletter'}!`,
    html: wrapHtml(body, subscriber.siteName, `Welcome to ${subscriber.siteName ?? 'our newsletter'}!`),
  };
}

export function buildLeadMagnetEmail(
  subscriber: { firstName?: string | null },
  magnet: { name: string; fileUrl?: string; title?: string },
): EmailTemplateResult {
  const greeting = subscriber.firstName ? `Hi ${subscriber.firstName}` : 'Hello';
  const magnetTitle = magnet.title ?? magnet.name;

  let downloadSection = '';
  if (magnet.fileUrl) {
    downloadSection = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr>
          <td style="border-radius:8px; background-color:#18181b;">
            <a href="${magnet.fileUrl}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
              Download Now
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  const body = `
    <p style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#18181b;">${greeting}, here's your download!</p>
    <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#3f3f46;">
      Thanks for your interest in <strong>${magnetTitle}</strong>. Your resource is ready below.
    </p>
    <div style="margin:24px 0; padding:20px; background-color:#f4f4f5; border-radius:8px; border-left:4px solid #18181b;">
      <p style="margin:0 0 4px 0; font-size:16px; font-weight:600; color:#18181b;">${magnetTitle}</p>
      <p style="margin:0; font-size:14px; color:#71717a;">Click the button below to access your download.</p>
    </div>
    ${downloadSection}
    <p style="margin:16px 0 0 0; font-size:14px; line-height:1.6; color:#71717a;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <a href="${magnet.fileUrl ?? '#'}" style="color:#18181b; word-break:break-all;">${magnet.fileUrl ?? '#'}</a>
    </p>
  `;

  return {
    subject: `Your download: ${magnetTitle}`,
    html: wrapHtml(body, undefined, `Your download: ${magnetTitle}`),
  };
}

export function buildNewsletterEmail(content: string, previewText?: string): EmailTemplateResult {
  const body = `
    <div style="font-size:15px; line-height:1.7; color:#3f3f46;">
      ${content}
    </div>
  `;

  const subject = 'Newsletter Update';

  return {
    subject,
    html: wrapHtml(body, undefined, previewText ?? subject),
  };
}

export function buildArticleDigestEmail(
  articles: { title: string; slug: string; excerpt?: string }[],
  siteName: string,
): EmailTemplateResult {
  const articleItems = articles
    .map((article) => {
      const excerptHtml = article.excerpt
        ? `<p style="margin:4px 0 0 0; font-size:14px; color:#71717a; line-height:1.5;">${article.excerpt}</p>`
        : '';

      return `
      <tr>
        <td style="padding:16px 0; border-bottom:1px solid #e4e4e7;">
          <a href="{{site_url}}/${article.slug}" style="font-size:16px; font-weight:600; color:#18181b; text-decoration:none;">
            ${article.title}
          </a>
          ${excerptHtml}
        </td>
      </tr>
      `;
    })
    .join('');

  const body = `
    <p style="margin:0 0 24px 0; font-size:18px; font-weight:600; color:#18181b;">This Week's Top Articles</p>
    <p style="margin:0 0 16px 0; font-size:15px; color:#3f3f46;">
      Here are the latest articles from ${siteName} that we think you'll enjoy.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${articleItems}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr>
        <td style="border-radius:8px; background-color:#18181b;">
          <a href="{{site_url}}" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
            Read More Articles
          </a>
        </td>
      </tr>
    </table>
  `;

  const count = articles.length;
  const subject = count > 0 ? `${articles[0].title}${count > 1 ? ` + ${count - 1} more` : ''}` : 'This Week\'s Articles';

  return {
    subject: `${siteName}: ${subject}`,
    html: wrapHtml(body, siteName, `${count} new articles from ${siteName}`),
  };
}

export function buildPasswordResetEmail(params: {
  resetUrl: string;
  userName?: string;
  expiryMinutes?: number;
}): EmailTemplateResult {
  const greeting = params.userName ? `Hi ${params.userName}` : 'Hello';
  const expiry = params.expiryMinutes ?? 60;

  const body = `
    <p style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#18181b;">${greeting},</p>
    <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#3f3f46;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:8px; background-color:#18181b;">
          <a href="${params.resetUrl}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0; font-size:14px; line-height:1.6; color:#71717a;">
      This link will expire in ${expiry} minutes. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
    </p>
    <p style="margin:0; font-size:14px; line-height:1.6; color:#71717a;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <a href="${params.resetUrl}" style="color:#18181b; word-break:break-all;">${params.resetUrl}</a>
    </p>
  `;

  return {
    subject: 'Reset your MoreWithAI password',
    html: wrapHtml(body, undefined, 'Reset your MoreWithAI password'),
  };
}

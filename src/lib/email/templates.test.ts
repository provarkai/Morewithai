import { describe, it, expect } from 'vitest';
import {
  buildPasswordResetEmail,
  buildWelcomeEmail,
  buildLeadMagnetEmail,
  buildNewsletterEmail,
  buildArticleDigestEmail,
} from './templates';

describe('buildPasswordResetEmail', () => {
  it('generates reset email with URL and user name', () => {
    const result = buildPasswordResetEmail({
      resetUrl: 'https://example.com/auth/reset?token=abc123',
      userName: 'Alice',
      expiryMinutes: 60,
    });

    expect(result.subject).toContain('Reset');
    expect(result.html).toContain('Hi Alice');
    expect(result.html).toContain('https://example.com/auth/reset?token=abc123');
    expect(result.html).toContain('60 minutes');
    expect(result.html).toContain('Reset Password');
  });

  it('uses default greeting when no name', () => {
    const result = buildPasswordResetEmail({
      resetUrl: 'https://example.com/reset?token=xyz',
    });

    expect(result.html).toContain('Hello');
    expect(result.html).toContain('https://example.com/reset?token=xyz');
    expect(result.html).toContain('60 minutes'); // default expiry
  });

  it('uses custom expiry', () => {
    const result = buildPasswordResetEmail({
      resetUrl: 'https://example.com/reset?t=1',
      expiryMinutes: 30,
    });
    expect(result.html).toContain('30 minutes');
  });

  it('includes the link as fallback text', () => {
    const url = 'https://example.com/auth/reset?token=test123';
    const result = buildPasswordResetEmail({ resetUrl: url });
    // The HTML contains the URL twice: once in the button, once as fallback text
    const matches = result.html.match(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    expect(matches && matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('buildWelcomeEmail', () => {
  it('generates welcome email with name', () => {
    const result = buildWelcomeEmail({
      firstName: 'Bob',
      siteName: 'TechBlog',
    });
    expect(result.subject).toContain('TechBlog');
    expect(result.html).toContain('Hi Bob');
    expect(result.html).toContain('TechBlog');
  });

  it('uses default greeting when no name', () => {
    const result = buildWelcomeEmail({});
    expect(result.html).toContain('Hello');
  });
});

describe('buildLeadMagnetEmail', () => {
  it('generates email with download link', () => {
    const result = buildLeadMagnetEmail(
      { firstName: 'Carol' },
      { name: 'AI Guide', fileUrl: 'https://example.com/guide.pdf' },
    );
    expect(result.subject).toContain('AI Guide');
    expect(result.html).toContain('Hi Carol');
    expect(result.html).toContain('Download Now');
    expect(result.html).toContain('https://example.com/guide.pdf');
  });

  it('omits download button when no fileUrl', () => {
    const result = buildLeadMagnetEmail(
      {},
      { name: 'Checklist' },
    );
    expect(result.html).not.toContain('Download Now');
  });
});

describe('buildNewsletterEmail', () => {
  it('wraps content in email template', () => {
    const result = buildNewsletterEmail('<p>This week in AI...</p>');
    expect(result.subject).toBe('Newsletter Update');
    expect(result.html).toContain('<p>This week in AI...</p>');
    expect(result.html).toContain('DOCTYPE');
  });

  it('uses custom preview text', () => {
    const result = buildNewsletterEmail('<p>Hi</p>', 'Latest AI news');
    expect(result.html).toContain('Latest AI news');
  });
});

describe('buildArticleDigestEmail', () => {
  it('lists articles with titles and links', () => {
    const articles = [
      { title: 'Article 1', slug: 'article-1', excerpt: 'First article' },
      { title: 'Article 2', slug: 'article-2' },
    ];
    const result = buildArticleDigestEmail(articles, 'TechBlog');

    expect(result.subject).toContain('TechBlog');
    expect(result.subject).toContain('Article 1');
    expect(result.html).toContain('Article 1');
    expect(result.html).toContain('Article 2');
    expect(result.html).toContain('First article');
    expect(result.html).toContain('article-1');
    expect(result.html).toContain('article-2');
  });

  it('handles empty article list', () => {
    const result = buildArticleDigestEmail([], 'TechBlog');
    expect(result.subject).toContain('TechBlog');
  });

  it('shows count in subject for multiple articles', () => {
    const articles = [
      { title: 'First', slug: 'first' },
      { title: 'Second', slug: 'second' },
      { title: 'Third', slug: 'third' },
    ];
    const result = buildArticleDigestEmail(articles, 'Blog');
    expect(result.subject).toContain('+ 2 more');
  });
});

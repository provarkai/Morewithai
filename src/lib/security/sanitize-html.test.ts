import { describe, it, expect } from 'vitest';
import { sanitizeHtml, isSafeUrl } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('passes through safe HTML', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('removes script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('removes script tags with attributes', () => {
    const html = '<script src="evil.js" type="text/javascript"></script>';
    expect(sanitizeHtml(html)).toBe('');
  });

  it('removes style blocks', () => {
    const html = '<style>.red{color:red}</style><p>Text</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<style');
    expect(result).toContain('<p>Text</p>');
  });

  it('removes event handler attributes', () => {
    const html = '<a href="https://example.com" onclick="alert(1)">Click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('onclick');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('Click');
  });

  it('sanitizes javascript: protocol in href', () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('javascript:');
    expect(result).toContain('href="#"');
  });

  it('sanitizes data: protocol in src', () => {
    const html = '<img src="data:text/html,<script>alert(1)</script>" />';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('data:');
    expect(result).toContain('src="#"');
  });

  it('preserves safe protocols (https, http)', () => {
    const html = '<a href="https://example.com">Link</a><img src="http://img.test/p.png" />';
    const result = sanitizeHtml(html);
    expect(result).toContain('https://example.com');
    expect(result).toContain('http://img.test/p.png');
  });

  it('preserves inline styles', () => {
    const html = '<p style="color: red; font-size: 16px;">Styled text</p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('preserves AdSense data attributes', () => {
    const html = '<ins class="adsbygoogle" data-ad-client="ca-pub-123" data-ad-slot="456"></ins>';
    const result = sanitizeHtml(html);
    expect(result).toContain('data-ad-client="ca-pub-123"');
    expect(result).toContain('data-ad-slot="456"');
  });

  it('handles self-closing script tags', () => {
    const html = '<script src="evil.js"/>';
    expect(sanitizeHtml(html)).toBe('');
  });

  it('removes noscript content', () => {
    const html = '<noscript>Please enable JavaScript</noscript><p>Content</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('noscript');
    expect(result).toContain('<p>Content</p>');
  });
});

describe('isSafeUrl', () => {
  it('allows https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
  });

  it('allows http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('allows relative URLs', () => {
    expect(isSafeUrl('/blog/my-article')).toBe(true);
    expect(isSafeUrl('#section')).toBe(true);
  });

  it('blocks javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('JAVASCRIPT:void(0)')).toBe(false);
  });

  it('blocks data: URLs', () => {
    expect(isSafeUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('blocks vbscript: URLs', () => {
    expect(isSafeUrl('vbscript:MsgBox(1)')).toBe(false);
  });

  it('trims and case-insensitive', () => {
    expect(isSafeUrl('  JavaScript:alert(1)  ')).toBe(false);
    expect(isSafeUrl('  https://example.com  ')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';

// Test the HTML to text conversion logic
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('HTML to text conversion', () => {
  it('strips HTML tags', () => {
    expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('handles nested tags', () => {
    expect(htmlToText('<div><h1>Title</h1><p>Body</p></div>')).toBe('TitleBody');
  });

  it('removes style blocks', () => {
    expect(htmlToText('<style>.red{color:red}</style><p>Text</p>')).toBe('Text');
  });

  it('decodes common HTML entities', () => {
    expect(htmlToText('A &amp; B')).toBe('A & B');
  });

  it('collapses whitespace', () => {
    expect(htmlToText('<p>  Hello   world  </p>')).toBe('Hello world');
  });
});

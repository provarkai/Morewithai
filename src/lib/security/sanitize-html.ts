/**
 * Basic HTML sanitizer for article content.
 * Allows safe article markup, blocks script injection and dangerous attributes.
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'pre', 'code',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'q', 'cite',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'a', 'img', 'figure', 'figcaption', 'picture', 'source',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'div', 'span', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav',
  'details', 'summary',
  'iframe', // limited
  'video', 'audio', 'source',
]);

const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id', 'style',
  'width', 'height', 'loading', 'decoding', 'crossorigin',
  'target', 'rel', 'colspan', 'rowspan', 'scope',
  'start', 'type', 'controls', 'poster', 'preload',
  'data-ad-client', 'data-ad-slot', 'data-ad-format', 'data-full-width-responsive',
]);

const DANGEROUS_ATTRS = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress', 'oncontextmenu', 'ondrag', 'ondrop', 'onresize', 'onscroll'];

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let result = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<script[^>]*\/>/gi, '');

  // Remove style blocks (but keep inline styles on elements)
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove dangerous event handler attributes
  for (const attr of DANGEROUS_ATTRS) {
    const re = new RegExp(`\\s+${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*)`, 'gi');
    result = result.replace(re, '');
  }

  // Sanitize href/src values with dangerous protocols
  result = result.replace(/(href|src)\s*=\s*(["'])([^"']*)\2/gi, (match, attr, quote, value) => {
    const trimmed = value.trim().toLowerCase();
    if (DANGEROUS_PROTOCOLS.some((p) => trimmed.startsWith(p))) {
      return `${attr}=${quote}#${quote}`;
    }
    return match;
  });

  // Remove noscript content that could be abused
  result = result.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  return result;
}

export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return !DANGEROUS_PROTOCOLS.some((p) => trimmed.startsWith(p));
}

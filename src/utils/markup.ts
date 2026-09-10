import { createElement, Fragment } from 'react';
import type { ReactNode } from 'react';

const INLINE_TAGS = new Set(['b', 'strong', 'i', 'em', 'code', 'span']);
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Resolves `href` against `base` and drops anything that is not http(s) or mailto. */
export function toSafeHref(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function convertNode(node: Node, key: string, base: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (tag === 'br') return createElement('br', { key });

  const children = Array.from(element.childNodes, (child, i) =>
    convertNode(child, `${key}.${i}`, base),
  );
  if (INLINE_TAGS.has(tag)) return createElement(tag, { key }, children);
  if (tag !== 'a') return createElement(Fragment, { key }, children);

  const href = toSafeHref(element.getAttribute('href'), base);
  if (!href) return createElement(Fragment, { key }, children);
  return createElement('a', { key, href, target: '_blank', rel: 'noopener noreferrer' }, children);
}

/**
 * Renders the small HTML subset banners allow (bold, italic, code, line breaks,
 * links) as React elements instead of injecting markup. Everything else is
 * reduced to its text. `DOMParser` documents are inert, so nothing executes.
 */
export function renderInlineMarkup(html: string, base: string): ReactNode[] {
  if (typeof DOMParser === 'undefined') {
    return [html.replace(/<[^>]*>/g, '')];
  }
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return Array.from(body.childNodes, (node, i) => convertNode(node, String(i), base));
}

import { createElement, Fragment } from 'react';
import type { ReactNode } from 'react';
import type * as t from '@/types';

const INLINE_TAGS = new Set(['b', 'strong', 'i', 'em', 'code', 'span']);
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Resolves a banner link. Root-relative paths (`/users`) are admin-panel pages,
 * so they get the deployment base path; anything that is not http(s) or mailto
 * is dropped.
 */
export function resolveLink(href: string | null, base: t.LinkBase): t.ResolvedLink | null {
  if (!href) return null;
  const isRootPath = href.startsWith('/') && !href.startsWith('//');
  try {
    const url = new URL(isRootPath ? `${base.basePath}${href}` : href, `${base.origin}/`);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    return { href: url.href, external: url.origin !== base.origin };
  } catch {
    return null;
  }
}

/** Anchor props that open external links in a new tab and keep admin links in place. */
export function linkProps(link: t.ResolvedLink): {
  href: string;
  target?: string;
  rel?: string;
} {
  if (!link.external) return { href: link.href };
  return { href: link.href, target: '_blank', rel: 'noopener noreferrer' };
}

function convertNode(node: Node, key: string, base: t.LinkBase): ReactNode {
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

  const link = resolveLink(element.getAttribute('href'), base);
  if (!link) return createElement(Fragment, { key }, children);
  return createElement('a', { key, ...linkProps(link) }, children);
}

/**
 * Renders the small HTML subset banners allow (bold, italic, code, line breaks,
 * links) as React elements instead of injecting markup. Everything else is
 * reduced to its text. `DOMParser` documents are inert, so nothing executes.
 */
export function renderInlineMarkup(html: string, base: t.LinkBase): ReactNode[] {
  if (typeof DOMParser === 'undefined') {
    return [html.replace(/<[^>]*>/g, '')];
  }
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return Array.from(body.childNodes, (node, i) => convertNode(node, String(i), base));
}

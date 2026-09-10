import { createElement, Fragment } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderInlineMarkup, toSafeHref } from './markup';

const BASE = 'https://synapse.bdren.net.bd';

const renderMarkup = (html: string) =>
  render(createElement(Fragment, null, renderInlineMarkup(html, BASE))).container;

describe('toSafeHref', () => {
  it('resolves chat-app paths against the chat base URL', () => {
    expect(toSafeHref('/c/new', BASE)).toBe('https://synapse.bdren.net.bd/c/new');
  });

  it('keeps http(s) and mailto links', () => {
    expect(toSafeHref('https://bdren.net.bd/news', BASE)).toBe('https://bdren.net.bd/news');
    expect(toSafeHref('mailto:support@bdren.net.bd', BASE)).toBe('mailto:support@bdren.net.bd');
  });

  it('rejects script and data URLs', () => {
    expect(toSafeHref('javascript:alert(1)', BASE)).toBeNull();
    expect(toSafeHref('data:text/html,<script>alert(1)</script>', BASE)).toBeNull();
    expect(toSafeHref(null, BASE)).toBeNull();
  });
});

describe('renderInlineMarkup', () => {
  it('renders the allowed inline tags', () => {
    const container = renderMarkup('Faster <b>answers</b> at a <em>lower</em> cost.<br>Try it');
    expect(container.querySelector('b')).toHaveTextContent('answers');
    expect(container.querySelector('em')).toHaveTextContent('lower');
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('opens safe links in a new tab and resolves relative paths', () => {
    const link = renderMarkup('See <a href="/c/new">the model menu</a>').querySelector('a');
    expect(link).toHaveAttribute('href', `${BASE}/c/new`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('reduces unsafe or unknown markup to text', () => {
    const container = renderMarkup(
      '<script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">click</a><div onclick="x">plain</div>',
    );
    expect(container.querySelector('script, img, div, a')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(container).toHaveTextContent('clickplain');
  });
});

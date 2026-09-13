import { createElement, Fragment } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type * as t from '@/types';
import { renderInlineMarkup, resolveLink } from './markup';

const BASE: t.LinkBase = { origin: 'https://admin.synapse.bdren.net.bd', basePath: '' };
const SUBPATH: t.LinkBase = { origin: 'https://synapse.bdren.net.bd', basePath: '/admin' };

const renderMarkup = (html: string) =>
  render(createElement(Fragment, null, renderInlineMarkup(html, BASE))).container;

describe('resolveLink', () => {
  it('treats root paths as admin-panel pages that stay in the same tab', () => {
    expect(resolveLink('/users', BASE)).toEqual({
      href: 'https://admin.synapse.bdren.net.bd/users',
      external: false,
    });
  });

  it('adds the deployment base path to admin-panel pages', () => {
    expect(resolveLink('/users', SUBPATH)).toEqual({
      href: 'https://synapse.bdren.net.bd/admin/users',
      external: false,
    });
  });

  it('marks other sites as external', () => {
    expect(resolveLink('https://bdren.net.bd/news', BASE)).toEqual({
      href: 'https://bdren.net.bd/news',
      external: true,
    });
    expect(resolveLink('mailto:support@bdren.net.bd', BASE)?.external).toBe(true);
  });

  it('rejects script and data URLs', () => {
    expect(resolveLink('javascript:alert(1)', BASE)).toBeNull();
    expect(resolveLink('data:text/html,<script>alert(1)</script>', BASE)).toBeNull();
    expect(resolveLink('//evil.example/x', BASE)?.external).toBe(true);
    expect(resolveLink(null, BASE)).toBeNull();
  });
});

describe('renderInlineMarkup', () => {
  it('renders the allowed inline tags', () => {
    const container = renderMarkup('Faster <b>answers</b> at a <em>lower</em> cost.<br>Try it');
    expect(container.querySelector('b')).toHaveTextContent('answers');
    expect(container.querySelector('em')).toHaveTextContent('lower');
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('keeps admin links in the same tab and opens other sites in a new one', () => {
    const container = renderMarkup(
      'Open <a href="/users">Users</a> or read <a href="https://bdren.net.bd/news">the news</a>',
    );
    const [internal, external] = container.querySelectorAll('a');
    expect(internal).toHaveAttribute('href', `${BASE.origin}/users`);
    expect(internal).not.toHaveAttribute('target');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
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

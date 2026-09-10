import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as t from '@/types';
import translations from '@/locales/en/translation.json';
import { Banner } from './Banner';

const server = vi.hoisted(() => ({
  getBannerFn: vi.fn(),
  markBannerSeenFn: vi.fn(),
  dismissBannerFn: vi.fn(),
}));

vi.mock('@/server', () => server);

vi.mock('@/hooks/useLocalize', () => ({
  useLocalize: () => (key: string) => (translations as Record<string, string>)[key] ?? key,
}));

vi.mock('@clickhouse/click-ui', () => ({
  Icon: ({ name }: { name: string }) => <svg data-icon={name} />,
  Button: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock('@/server/utils/url', () => ({
  getApiBaseUrl: () => 'https://synapse.bdren.net.bd',
}));

const baseBanner: t.Banner = {
  bannerId: 'gemini-38',
  type: 'banner',
  title: 'Gemini 3.8 Flash is here',
  message: 'Faster answers at a <b>lower</b> cost.',
  category: 'feature',
  display: 'once',
  linkLabel: 'Try it',
  linkUrl: '/c/new',
};

function renderBanner() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Banner userId="admin-1" />
    </QueryClientProvider>,
  );
}

describe('Banner (admin panel, bar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.markBannerSeenFn.mockResolvedValue(undefined);
    server.dismissBannerFn.mockResolvedValue(undefined);
  });

  it('renders nothing when there is no active banner', async () => {
    server.getBannerFn.mockResolvedValue(null);
    const { container } = renderBanner();
    await waitFor(() => expect(server.getBannerFn).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the same content as the chat app, with links pointing at the chat app', async () => {
    server.getBannerFn.mockResolvedValue(baseBanner);
    renderBanner();

    const region = await screen.findByRole('region', { name: 'Announcement' });
    expect(region).toHaveTextContent('New');
    expect(region).toHaveTextContent('Gemini 3.8 Flash is here');
    expect(region.querySelector('b')).toHaveTextContent('lower');
    expect(screen.getByRole('link', { name: 'Try it →' })).toHaveAttribute(
      'href',
      'https://synapse.bdren.net.bd/c/new',
    );
  });

  it('records a once banner as seen exactly once', async () => {
    server.getBannerFn.mockResolvedValue(baseBanner);
    renderBanner();

    await screen.findByRole('region', { name: 'Announcement' });
    await waitFor(() => expect(server.markBannerSeenFn).toHaveBeenCalledTimes(1));
    expect(server.markBannerSeenFn).toHaveBeenCalledWith({ data: { bannerId: 'gemini-38' } });
  });

  it('hides the banner and records the dismissal', async () => {
    server.getBannerFn.mockResolvedValue({ ...baseBanner, display: 'until_dismissed' });
    renderBanner();

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss announcement' }));

    await waitFor(() =>
      expect(server.dismissBannerFn).toHaveBeenCalledWith({ data: { bannerId: 'gemini-38' } }),
    );
    expect(server.markBannerSeenFn).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Announcement' })).not.toBeInTheDocument();
  });

  it('cannot be dismissed when display is always', async () => {
    server.getBannerFn.mockResolvedValue({ ...baseBanner, category: 'outage', display: 'always' });
    renderBanner();

    const region = await screen.findByRole('region', { name: 'Announcement' });
    expect(region).toHaveTextContent('Outage');
    expect(screen.queryByRole('button', { name: 'Dismiss announcement' })).not.toBeInTheDocument();
  });
});

describe('Banner (admin panel, floating card)', () => {
  const cardBanner: t.Banner = { ...baseBanner, type: 'popup' };

  beforeEach(() => {
    vi.clearAllMocks();
    server.markBannerSeenFn.mockResolvedValue(undefined);
    server.dismissBannerFn.mockResolvedValue(undefined);
  });

  it('renders the card with its call to action pointing at the chat app', async () => {
    server.getBannerFn.mockResolvedValue(cardBanner);
    renderBanner();

    const card = await screen.findByRole('region', { name: 'Announcement' });
    expect(card.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { name: 'Gemini 3.8 Flash is here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try it' })).toHaveAttribute(
      'href',
      'https://synapse.bdren.net.bd/c/new',
    );
    await waitFor(() => expect(server.markBannerSeenFn).toHaveBeenCalledTimes(1));
  });

  it('"Got it" closes the card and records the dismissal', async () => {
    server.getBannerFn.mockResolvedValue(cardBanner);
    renderBanner();

    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));

    await waitFor(() =>
      expect(server.dismissBannerFn).toHaveBeenCalledWith({ data: { bannerId: 'gemini-38' } }),
    );
    expect(screen.queryByRole('region', { name: 'Announcement' })).not.toBeInTheDocument();
  });

  it('an always card cannot be closed', async () => {
    server.getBannerFn.mockResolvedValue({ ...cardBanner, category: 'outage', display: 'always' });
    renderBanner();

    expect(await screen.findByRole('region', { name: 'Announcement' })).toHaveTextContent('Outage');
    expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss announcement' })).not.toBeInTheDocument();
  });
});

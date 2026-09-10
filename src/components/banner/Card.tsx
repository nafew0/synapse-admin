import { Button, Icon } from '@clickhouse/click-ui';
import type * as t from '@/types';
import { CATEGORY_LABEL_KEYS } from './labels';
import { useLocalize } from '@/hooks';
import { cn } from '@/utils';

const NODES: [number, number][] = [
  [20, 70],
  [62, 34],
  [104, 78],
  [148, 28],
  [190, 64],
  [232, 30],
  [270, 82],
  [120, 50],
  [210, 92],
  [320, 46],
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 7],
  [7, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [2, 7],
  [4, 8],
  [8, 6],
  [2, 8],
  [5, 9],
  [6, 9],
];
const ACCENT_NODE = 3;

function Network() {
  return (
    <svg
      viewBox="0 0 340 104"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={NODES[a][0]}
          y1={NODES[a][1]}
          x2={NODES[b][0]}
          y2={NODES[b][1]}
          className="synapse-network-edge"
        />
      ))}
      {NODES.map(([x, y], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={i === ACCENT_NODE ? 5 : 3}
          className={i === ACCENT_NODE ? 'synapse-network-accent' : 'synapse-network-node'}
        />
      ))}
      <circle
        cx={NODES[ACCENT_NODE][0]}
        cy={NODES[ACCENT_NODE][1]}
        r={11}
        className="synapse-network-ring"
      />
    </svg>
  );
}

/** Floating card in the top-right corner, matching the chat app's card. */
export function Card({ banner, category, message, linkHref, onDismiss }: t.BannerViewProps) {
  const localize = useLocalize();
  const canDismiss = banner.display !== 'always';

  return (
    <section
      aria-label={localize('com_banner_label')}
      className="synapse-banner-card fixed inset-x-3 top-16 z-(--z-banner) overflow-hidden rounded-2xl bg-(--cui-color-background-panel) text-(--cui-color-text-default) md:inset-x-auto md:right-6 md:w-88"
    >
      <div className={cn('relative h-24', `synapse-banner-card-${category}`)}>
        <Network />
        {canDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={localize('com_banner_dismiss')}
            className="synapse-banner-card-close absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent"
          >
            <span aria-hidden="true" className="flex">
              <Icon name="cross" size="sm" />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <span
          className={cn(
            'text-xs font-semibold tracking-wide uppercase',
            `synapse-banner-eyebrow-${category}`,
          )}
        >
          {localize(CATEGORY_LABEL_KEYS[category])}
        </span>
        {banner.title && (
          <h2 className="text-base leading-snug font-semibold text-(--cui-color-title-default)">
            {banner.title}
          </h2>
        )}
        <p className="text-sm leading-relaxed text-(--cui-color-text-muted) [&_a]:underline">
          {message}
        </p>
        {(canDismiss || linkHref) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {linkHref && (
              <a
                href={linkHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={canDismiss ? onDismiss : undefined}
                className="synapse-banner-cta inline-flex h-8 items-center rounded-md px-3 text-sm font-medium no-underline"
              >
                {banner.linkLabel || localize('com_banner_learn_more')}
              </a>
            )}
            {canDismiss && (
              <Button type="secondary" label={localize('com_banner_got_it')} onClick={onDismiss} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

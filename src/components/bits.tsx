'use client';

// Small shared pieces of the poster design language: color = meaning,
// chunky uppercase chips, flat blocks.

import type { CSSProperties, ReactNode } from 'react';
import type { EventKind } from '@/lib/herrang/types';

/** Kind → poster color. Jams speak the social/meet-up pink. */
export function kindColor(kind: EventKind): string {
  const token = kind === 'jam' ? 'social' : kind;
  return `var(--hg-${token})`;
}

/** Kind → the label the poster itself would print above a block. */
export function kindLabel(kind: EventKind): string {
  switch (kind) {
    case 'dj':
      return 'DJ Set';
    case 'show':
      return 'Show';
    case 'taster':
      return 'Taster Class';
    case 'social':
      return 'Social';
    case 'jam':
      return 'Jam';
    case 'special':
      return 'Special';
  }
}

/** Flat block styling for a night event of a given kind. */
export function blockStyle(kind: EventKind, tba?: boolean): CSSProperties {
  if (tba) {
    // Mystery card: dashed outline in the kind color, no fill.
    return {
      border: `2px dashed ${kindColor(kind)}`,
      color: 'var(--hg-ink)',
      borderRadius: 'var(--hg-radius)',
    };
  }
  return {
    background: kindColor(kind),
    color: kind === 'special' ? 'var(--hg-on-special)' : 'var(--hg-on-block)',
    borderRadius: 'var(--hg-radius)',
  };
}

export function Chip({
  children,
  filled,
}: {
  children: ReactNode;
  filled?: boolean;
}) {
  return (
    <span
      className="hg-time inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={
        filled
          ? { background: 'var(--hg-ink)', color: 'var(--hg-ground)' }
          : { border: '1px solid currentColor' }
      }
    >
      {children}
    </span>
  );
}

/** Neutral ink card — the day-classes surface. */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`p-5 ${className}`}
      style={{
        background: 'var(--hg-card)',
        border: '1px solid var(--hg-line)',
        borderRadius: 'var(--hg-radius)',
      }}
    >
      {children}
    </section>
  );
}

/** One-joke-per-screen message card. */
export function BigSay({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <Card>
      <h2 className="hg-display text-[clamp(1.6rem,7.5vw,2.6rem)]">{title}</h2>
      {sub ? (
        <div className="mt-3 text-sm" style={{ color: 'var(--hg-soft)' }}>
          {sub}
        </div>
      ) : null}
    </Card>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex overflow-hidden"
      style={{ border: '1px solid var(--hg-ink)', borderRadius: 999 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
            style={
              active
                ? { background: 'var(--hg-ink)', color: 'var(--hg-ground)' }
                : { color: 'var(--hg-ink)' }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

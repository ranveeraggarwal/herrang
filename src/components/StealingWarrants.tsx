'use client';

// The stealing warrants. Camp hands out teal silicone bands stamped
// "Stealable" — band on, you're happy to be stolen from a dance; band off,
// you're not. The rules that go with the band live here, opened by a little
// teal band tucked under tonight's program. No hint the band does anything
// (same rule as the pep talk and the mosquito forecast) — you find it, or a
// friend shows you, the way you'd learn the real ones in the ballroom.
//
// The four rules are a real consent system, so they stay plain and faithful:
// this is the one card in the app where being clear beats being clever.

import { useEffect } from 'react';

/** The little teal band. Looks like the wristband it is; tapping opens the
 *  rules. Sits quietly under the program — decoration until you press it. */
export function StealableBand({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Stealing warrants"
      className="hg-display self-start rounded-full px-3.5 py-1 text-[11px] tracking-[0.14em]"
      style={{
        background: 'var(--hg-taster)',
        color: 'var(--hg-on-block)',
        border: '1px solid rgba(0,0,0,0.18)',
      }}
    >
      Stealable
    </button>
  );
}

/** First-visit only: the same band, dropped in at the top of the screen so
 *  it gets seen without scrolling all the way to the quiet one under the
 *  program. Drops in, holds a beat, retreats back up — one run, then it's
 *  marked seen (onDone) and never nags again. The wrapper eats no taps
 *  except on the band itself. */
export function StealableReveal({
  onOpen,
  onDone,
}: {
  onOpen: () => void;
  onDone: () => void;
}) {
  return (
    <div
      className="hg-band-reveal pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10rem)' }}
      onAnimationEnd={onDone}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="Stealing warrants"
        className="hg-display pointer-events-auto rounded-full px-3.5 py-1 text-[11px] tracking-[0.14em]"
        style={{
          background: 'var(--hg-taster)',
          color: 'var(--hg-on-block)',
          border: '1px solid rgba(0,0,0,0.18)',
        }}
      >
        Stealable
      </button>
    </div>
  );
}

const RULES: { n: number; head: string; body: string }[] = [
  {
    n: 1,
    head: 'Only bands steal from bands.',
    body: 'The stealer and both partners must all be wearing one.',
  },
  {
    n: 2,
    head: "If you're stolen, stay and steal back in.",
    body: 'It is not a one-off theft.',
  },
  { n: 3, head: 'Steal gently.', body: 'Never mid-air.' },
  { n: 4, head: 'Take the band off to stop.', body: '' },
];

export function StealingWarrants({ onClose }: { onClose: () => void }) {
  // Lock the page behind the overlay while it's open, same as the pep talk.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stealing warrants"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6"
      style={{ background: 'var(--hg-ground)', color: 'var(--hg-ink)' }}
    >
      {/* Tapping the card itself shouldn't dismiss it — you're reading. Only
          the ground around it, Escape, or the corner × close it. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md"
      >
        <div className="flex items-start justify-between gap-4">
          <span
            className="hg-display self-start rounded-full px-3.5 py-1 text-[11px] tracking-[0.14em]"
            style={{ background: 'var(--hg-taster)', color: 'var(--hg-on-block)' }}
          >
            Stealable
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hg-display shrink-0 text-2xl leading-none"
            style={{ color: 'var(--hg-soft)' }}
          >
            ×
          </button>
        </div>

        <h2
          className="hg-display mt-5"
          style={{ fontSize: 'clamp(2rem, 10vw, 3.2rem)' }}
        >
          Stealing Warrants
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--hg-soft)' }}>
          A consent system for stealing dances.
        </p>

        {/* Band on / band off — the whole thing in two lines, in teal. */}
        <div
          className="mt-5 flex flex-col gap-2 p-4 text-sm"
          style={{
            border: '1px solid var(--hg-taster)',
            borderRadius: 'var(--hg-radius)',
          }}
        >
          <p>
            <span className="hg-display" style={{ color: 'var(--hg-taster)' }}>
              Band on
            </span>{' '}
            = you&apos;re happy being stolen from a dance.
          </p>
          <p>
            <span className="hg-display" style={{ color: 'var(--hg-soft)' }}>
              Band off
            </span>{' '}
            = you do not consent to stealing.
          </p>
        </div>

        <ol className="mt-5 flex flex-col gap-4">
          {RULES.map((r) => (
            <li key={r.n} className="flex gap-3">
              <span
                className="hg-display hg-time text-2xl leading-none"
                style={{ color: 'var(--hg-taster)' }}
              >
                {r.n}
              </span>
              <div>
                <p className="hg-display text-base leading-tight">{r.head}</p>
                {r.body && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--hg-soft)' }}>
                    {r.body}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm font-bold">
          What band? It&apos;s a little blue wristband that says{' '}
          <span style={{ color: 'var(--hg-taster)' }}>STEALABLE</span>. Limited
          edition, please share.
        </p>

        <p className="mt-4 text-xs" style={{ color: 'var(--hg-soft)' }}>
          Bands live at the info point. Tap away to put this back.
        </p>
      </div>
    </div>
  );
}

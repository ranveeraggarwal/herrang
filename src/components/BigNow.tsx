'use client';

// Across-the-room mode: blow a running Now card up to fill the screen, kind
// color and all, so you can hold the phone up to a friend instead of handing
// it over. No separate "still running?" flag — recomputed every render off
// the same clock the rest of the app ticks on, so it closes itself the
// moment the event actually ends.

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DailyEvent, HerrangVenue } from '@/lib/herrang/types';
import { endsChip, toPosterMinutes, type ClockState } from '@/lib/herrang/time';
import { eventLocation } from '@/lib/herrang/schedule';
import { kindColor, kindLabel } from './bits';

// The poster-ideal title size. Right for "LINDY HOP"; the fit effect below
// walks it down when a title needs more room.
const TITLE_MAX = 'clamp(2.5rem, 13vw, 7rem)';
const TITLE_MIN_PX = 28;

export function BigNow({
  event: e,
  venues,
  clock,
  onClose,
}: {
  event: DailyEvent;
  venues: HerrangVenue[];
  clock: ClockState;
  onClose: () => void;
}) {
  const nowPM = clock.posterMinutes;
  const endPM = e.end ? toPosterMinutes(e.end) : undefined;
  const over = endPM !== undefined && nowPM >= endPM;

  const titleRef = useRef<HTMLHeadingElement>(null);

  // 13vw is glorious for "LINDY HOP" but the posters also produce titles like
  // "TANGO CLASS LEVELS (INTRODUCTION & BEGINNERS)", and Archivo Black shows
  // no mercy: one word wider than the phone and the centered layout crops it
  // off both edges. Start at the poster-ideal size, then shrink until the
  // widest word fits inside the padding. Runs pre-paint, so no flash.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const fit = () => {
      el.style.overflowWrap = 'normal';
      el.style.fontSize = TITLE_MAX;
      let size = parseFloat(window.getComputedStyle(el).fontSize);
      if (el.scrollWidth > el.clientWidth) {
        // Text scales linearly, so one proportional guess lands close…
        size = Math.max(TITLE_MIN_PX, (size * el.clientWidth) / el.scrollWidth);
        el.style.fontSize = `${size}px`;
      }
      // …and a couple of 1px nudges catch rounding.
      while (size > TITLE_MIN_PX && el.scrollWidth > el.clientWidth) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      // Only if a word *still* can't fit at the floor size do we let the
      // browser break it — better than cropping. Never enable it otherwise:
      // text-wrap:balance narrows the wrap measure and will happily split
      // words mid-run if break-word gives it permission.
      el.style.overflowWrap = el.scrollWidth > el.clientWidth ? 'break-word' : 'normal';
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [e.title]);

  // Body scroll stays locked for as long as the takeover is mounted.
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

  // The event ended while someone was still holding the phone up across the
  // room — close on our own instead of freezing on a stale "ends in -3 min".
  useEffect(() => {
    if (over) onClose();
  }, [over, onClose]);

  if (over) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={e.title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{
        background: kindColor(e.kind),
        color: e.kind === 'special' ? 'var(--hg-on-special)' : 'var(--hg-on-block)',
      }}
    >
      <span className="hg-display text-lg tracking-wider">{kindLabel(e.kind)}</span>
      <h1
        ref={titleRef}
        className="hg-display max-w-full"
        style={{ fontSize: TITLE_MAX, textWrap: 'balance' }}
      >
        {e.title}
      </h1>
      <p className="hg-display text-2xl">{eventLocation(venues, e)}</p>
      <p className="hg-time text-xl font-bold">{endsChip(nowPM, endPM, e.openEnd)}</p>
    </div>
  );
}

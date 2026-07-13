'use client';

// Across-the-room mode: blow a running Now card up to fill the screen, kind
// color and all, so you can hold the phone up to a friend instead of handing
// it over. No separate "still running?" flag — recomputed every render off
// the same clock the rest of the app ticks on, so it closes itself the
// moment the event actually ends.

import { useEffect } from 'react';
import type { DailyEvent, HerrangVenue } from '@/lib/herrang/types';
import { endsChip, toPosterMinutes, type ClockState } from '@/lib/herrang/time';
import { eventLocation } from '@/lib/herrang/schedule';
import { kindColor, kindLabel } from './bits';

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
        className="hg-display"
        style={{ fontSize: 'clamp(2.5rem, 13vw, 7rem)', textWrap: 'balance' }}
      >
        {e.title}
      </h1>
      <p className="hg-display text-2xl">{eventLocation(venues, e)}</p>
      <p className="hg-time text-xl font-bold">{endsChip(nowPM, endPM, e.openEnd)}</p>
    </div>
  );
}

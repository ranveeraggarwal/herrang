// The three clocks of a Herräng day, as pure functions. No I/O, no React —
// safe for client components and fully unit-testable.
//
// The camp day does not end at midnight; it ends when the DJs stop. So the
// page reasons on a "poster timeline": a poster date runs 08:00 → 07:59 the
// next morning, and times printed after midnight (e.g. "02:00" on Saturday's
// poster) are stored as printed but happen on the next calendar day. We map
// every wall-clock time into minutes-since-08:00-of-the-poster-date, which
// makes cross-midnight comparisons ordinary integer comparisons.
//
// Europe/Stockholm is assumed equal to device time — no timezone math, per
// the app's engineering constraints.

import { addDays } from '@/lib/dates';

export type Mode = 'day' | 'night' | 'weird';

/** Minutes since local midnight for an "HH:MM" string. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const DAY_START = toMinutes('08:00'); // classes begin
const DAY_END = toMinutes('19:10'); // last class ends → party mode
const NIGHT_END = toMinutes('04:00'); // party over → the weird hours

/**
 * Poster-timeline minutes for an "HH:MM" printed on a poster: times before
 * 08:00 belong to the poster's night and land past midnight (+24h).
 */
export function toPosterMinutes(time: string): number {
  const m = toMinutes(time);
  return m < DAY_START ? m + 24 * 60 : m;
}

export interface ClockState {
  /** Device-local calendar date, YYYY-MM-DD. */
  dateISO: string;
  /** Minutes since local midnight. */
  minutes: number;
  /** The poster date now in force: before 08:00 it is still "yesterday". */
  posterDate: string;
  /** Now, on the poster timeline of `posterDate`. */
  posterMinutes: number;
  mode: Mode;
}

export function modeFor(minutes: number): Mode {
  if (minutes >= DAY_START && minutes < DAY_END) return 'day';
  if (minutes >= DAY_END || minutes < NIGHT_END) return 'night';
  return 'weird';
}

export function clockStateFor(now: Date): ClockState {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const beforeDayStart = minutes < DAY_START;
  return {
    dateISO,
    minutes,
    posterDate: beforeDayStart ? addDays(dateISO, -1) : dateISO,
    posterMinutes: beforeDayStart ? minutes + 24 * 60 : minutes,
    mode: modeFor(minutes),
  };
}

/** True when the site should render on the dark ground (auto rule: 20:00 → 08:00). */
export function isNightGround(minutes: number): boolean {
  return minutes >= toMinutes('20:00') || minutes < DAY_START;
}

/** "HH:MM" for a poster-timeline minute value (wraps past midnight). */
export function fromPosterMinutes(pm: number): string {
  const m = pm % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/**
 * The relative-time chip: "Now" while running, "in 40 min" / "in 2 h"
 * approaching, "ended 01:45" after.
 */
export function relativeChip(
  nowPM: number,
  startPM: number,
  endPM?: number
): string {
  if (nowPM >= startPM && (endPM === undefined || nowPM < endPM)) return 'Now';
  if (nowPM < startPM) {
    const d = startPM - nowPM;
    if (d < 60) return `in ${d} min`;
    const h = Math.floor(d / 60);
    const m = d % 60;
    return m === 0 ? `in ${h} h` : `in ${h} h ${m} min`;
  }
  return endPM === undefined ? 'ended' : `ended ${fromPosterMinutes(endPM)}`;
}

/**
 * True once something is behind us on the poster timeline: past its end, or
 * — for things with only a single reference time, like a pinned special that
 * just says "book now" for an 11:20 class — past that one time. Used to dim
 * finished items instead of leaving them looking perpetually current.
 */
export function isPast(nowPM: number, startPM?: number, endPM?: number): boolean {
  if (endPM !== undefined) return nowPM >= endPM;
  if (startPM !== undefined) return nowPM >= startPM;
  return false;
}

/** "ends in 25 min" / "ends 01:45" for a running event. */
export function endsChip(nowPM: number, endPM?: number, openEnd?: boolean): string {
  if (endPM === undefined) return openEnd ? 'until ?' : '';
  const d = endPM - nowPM;
  if (d <= 60) return `ends in ${d} min`;
  return `ends ${fromPosterMinutes(endPM)}`;
}

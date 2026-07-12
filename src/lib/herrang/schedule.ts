// Pure selectors over the week schedule + daily programs. All "when is it"
// reasoning delegates to time.ts's poster timeline; this file only picks and
// sorts. No I/O, no React.

import { addDays } from '@/lib/dates';
import type {
  DailyEvent,
  DailyProgram,
  DailySpecial,
  HerrangVenue,
  Track,
  WeekClass,
  WeekSchedule,
  WeekSpecial,
} from './types';
import { toMinutes, toPosterMinutes } from './time';

/** "Roseland Ballroom · Camping Area" — the Venue · Area formula. */
export function venueLabel(venues: HerrangVenue[], id: string): string {
  const v = venues.find((venue) => venue.id === id);
  return v ? `${v.name} · ${v.area}` : id;
}

export function venueName(venues: HerrangVenue[], id: string): string {
  return venues.find((v) => v.id === id)?.name ?? id;
}

/** Short location for a stream event: venue names, or the ex-special's
 * `detail` when there's no registry venue (Klubben, One O'Clock Jump Wine
 * Bar aren't in venues.json). */
export function eventLocation(venues: HerrangVenue[], e: DailyEvent): string {
  if (e.venues.length === 0) return e.detail ?? '';
  return e.venues.map((v) => venueName(venues, v)).join(' + ');
}

export function dailyFor(
  dailies: DailyProgram[],
  posterDate: string
): DailyProgram | undefined {
  return dailies.find((d) => d.date === posterDate);
}

/** A start-time bucket in the Tonight stream. */
export interface StreamGroup {
  start: string;
  startPM: number;
  events: DailyEvent[];
}

/** A timed special, reshaped to slot into the stream next to regular events.
 * Untimed specials (no `start` — e.g. "Bedlam Jam, after live music") can't
 * go on a timeline and are left for the pinned box instead. */
function timedSpecialsAsEvents(specials: DailySpecial[]): DailyEvent[] {
  return specials
    .filter((s): s is DailySpecial & { start: string } => !!s.start)
    .map((s) => ({
      title: s.title,
      venues: s.venue ? [s.venue] : [],
      start: s.start,
      end: s.end,
      kind: s.kind ?? 'special',
      detail: s.detail,
    }));
}

/** Chronological stream from 20:00-ish onward, simultaneous starts grouped.
 * Timed specials are merged in at their actual slot. */
export function tonightStream(daily: DailyProgram): StreamGroup[] {
  const all = [...daily.events, ...timedSpecialsAsEvents(daily.specials)];
  const byStart = new Map<string, DailyEvent[]>();
  for (const e of all) {
    const list = byStart.get(e.start) ?? [];
    list.push(e);
    byStart.set(e.start, list);
  }
  return [...byStart.entries()]
    .map(([start, events]) => ({ start, startPM: toPosterMinutes(start), events }))
    .sort((a, b) => a.startPM - b.startPM);
}

// --- track selection -------------------------------------------------------

/** How a split level is resolved: a group number, or both while undecided. */
export type GroupChoice = 1 | 2 | 'unsure';

export interface TrackSelection {
  /** Selected level names (a level = one picker row). */
  levels: string[];
  /** For split levels only: which group, or 'unsure' (shows both). */
  groups: Record<string, GroupChoice>;
}

/** A picker row: one level, with its 1–2 concrete tracks. */
export interface LevelOption {
  level: string;
  tracks: Track[];
  split: boolean;
}

export function levelOptions(week: WeekSchedule): LevelOption[] {
  const byLevel = new Map<string, Track[]>();
  for (const t of week.tracks) {
    const list = byLevel.get(t.level) ?? [];
    list.push(t);
    byLevel.set(t.level, list);
  }
  return [...byLevel.entries()].map(([level, tracks]) => ({
    level,
    tracks,
    split: tracks.length > 1,
  }));
}

/** Resolve a selection to concrete track ids ('unsure' → both groups). */
export function selectedTrackIds(
  week: WeekSchedule,
  selection: TrackSelection
): string[] {
  const ids: string[] = [];
  for (const level of selection.levels) {
    const tracks = week.tracks.filter((t) => t.level === level);
    if (tracks.length <= 1) {
      ids.push(...tracks.map((t) => t.id));
      continue;
    }
    const choice = selection.groups[level] ?? 'unsure';
    ids.push(
      ...tracks
        .filter((t) => choice === 'unsure' || t.group === choice)
        .map((t) => t.id)
    );
  }
  return ids;
}

// --- classes ---------------------------------------------------------------

export function classesOn(
  week: WeekSchedule,
  trackIds: string[],
  date: string
): WeekClass[] {
  return week.classes
    .filter((c) => c.date === date && trackIds.includes(c.track))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** The Now-card pair for day mode: the running class and/or the next one. */
export function nowAndNextClass(
  classes: WeekClass[],
  minutes: number
): { current?: WeekClass; next?: WeekClass } {
  let current: WeekClass | undefined;
  let next: WeekClass | undefined;
  for (const c of classes) {
    if (toMinutes(c.start) <= minutes && minutes < toMinutes(c.end)) current = c;
    else if (toMinutes(c.start) > minutes && !next) next = c;
  }
  return { current, next };
}

/** First class for the given tracks on or after `date` (the 5am card). */
export function firstClassOnOrAfter(
  week: WeekSchedule,
  trackIds: string[],
  date: string
): WeekClass | undefined {
  for (let d = date; d <= week.end; d = addDays(d, 1)) {
    const classes = classesOn(week, trackIds, d);
    if (classes.length > 0) return classes[0];
  }
  return undefined;
}

/** Dates inside the week window with at least one class scheduled. */
export function classDates(week: WeekSchedule): string[] {
  return [...new Set(week.classes.map((c) => c.date))].sort();
}

/** Class-free day (Wednesday): inside the window, classes exist for the week,
 * none on this date. Meaningless while the master schedule is empty. */
export function isClassFreeDay(week: WeekSchedule, date: string): boolean {
  if (week.classes.length === 0) return false;
  if (date < week.start || date > week.end) return false;
  return !week.classes.some((c) => c.date === date);
}

/** True once the week's last class has ended — "Week 2 is a wrap 🎉". */
export function isWeekWrapped(
  week: WeekSchedule,
  date: string,
  minutes: number
): boolean {
  if (week.classes.length === 0) return false;
  const last = week.classes.reduce((a, b) =>
    a.date > b.date || (a.date === b.date && a.end >= b.end) ? a : b
  );
  return date > last.date || (date === last.date && minutes >= toMinutes(last.end));
}

/** Whole-camp specials (e.g. the Wednesday special) for a given date. */
export function weekSpecialsOn(week: WeekSchedule, date: string): WeekSpecial[] {
  return week.specials.filter((s) => s.date === date);
}

// Per-track iCalendar feed. One feed per track; subscribing gives native
// calendar notifications with zero connectivity at the camp.

import { VTIMEZONE, escapeText, foldLine, formatLocal, formatUtc } from '@/lib/ical';
import type { HerrangVenue, Track, WeekSchedule } from './types';

const TZID = 'Europe/Stockholm';
const PRODID = '-//Herräng Companion//Week Schedule//EN';

function location(venues: HerrangVenue[], id: string): string {
  const v = venues.find((venue) => venue.id === id);
  return v ? `${v.name}, ${v.area}, Herräng` : id;
}

export function buildTrackCalendar(
  week: WeekSchedule,
  track: Track,
  venues: HerrangVenue[],
  opts: { now?: Date } = {}
): string {
  const dtstamp = formatUtc(opts.now ?? new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`Herräng Companion — ${track.name}`)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
  ];

  const push = (
    uid: string,
    date: string,
    start: string,
    end: string,
    summary: string,
    loc: string,
    description?: string
  ) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}@herrang.stockholmswing.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${TZID}:${formatLocal(date, start)}`,
      `DTEND;TZID=${TZID}:${formatLocal(date, end)}`,
      `SUMMARY:${escapeText(summary)}`,
      `LOCATION:${escapeText(loc)}`
    );
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
  };

  for (const c of week.classes.filter((cls) => cls.track === track.id)) {
    const labels = (c.labels ?? []).join(', ');
    push(
      `herrang-${track.id}-${c.date}-${c.start.replace(':', '')}`,
      c.date,
      c.start,
      c.end,
      [c.title ?? track.name, labels && `[${labels}]`].filter(Boolean).join(' '),
      location(venues, c.venue),
      c.teachers
    );
  }

  // Whole-camp specials (the Wednesday special) go in every track's feed.
  for (const s of week.specials) {
    if (!s.date || !s.start) continue;
    push(
      `herrang-special-${s.date}-${s.start.replace(':', '')}`,
      s.date,
      s.start,
      s.end ?? s.start,
      s.title,
      (s.venues ?? []).map((v) => location(venues, v)).join(' / ') || 'Herräng',
      s.detail
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

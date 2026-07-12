// iCalendar (RFC 5545) primitives for the per-track ICS subscription feed.
// Pure, no I/O — the route handler does the data loading.
//
// Times are Europe/Stockholm wall-clock strings, emitted as local times
// tagged `TZID=Europe/Stockholm` with a VTIMEZONE carrying the CET/CEST DST
// rules, so a 20:00 class shows as 20:00 whether it falls in summer or
// winter — no hardcoded offsets.

const TZID = 'Europe/Stockholm';

// Europe/Stockholm: CET (+01:00) / CEST (+02:00), EU DST rule — clocks go
// forward the last Sunday of March and back the last Sunday of October.
// Static; the RRULEs encode the rule for all years.
export const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Format a YYYY-MM-DD + HH:MM wall time as a floating local stamp. */
export function formatLocal(dateISO: string, time: string): string {
  return `${dateISO.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

/** Format an absolute Date as an iCal UTC timestamp. */
export function formatUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape a value for an iCal TEXT field (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Fold a content line to <=75 octets per RFC 5545 §3.1, continuation lines
 * prefixed with a single space.
 */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

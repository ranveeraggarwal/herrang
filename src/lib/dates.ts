// Minimal calendar-arithmetic helpers, extracted for a standalone repo.
//
// DST safety: date stepping is calendar arithmetic at UTC midnight
// (setUTCDate), never epoch/local-time math, so it can never drift onto the
// wrong weekday across a DST switch.

const WEEKDAYS_SHORT_UTC = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT_UTC = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function parseUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = parseUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Formats a YYYY-MM-DD string into a compact "Wed 26 Aug" label. Built from
 * fixed arrays rather than `toLocaleDateString`/`Intl`: ICU's combined
 * `{ weekday, day, month }` output isn't guaranteed byte-identical between
 * Node (SSR/build) and a browser (hydration) — enough to trip a React
 * hydration mismatch even though nothing is actually wrong.
 */
export function formatCompactWeekdayDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${WEEKDAYS_SHORT_UTC[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS_SHORT_UTC[date.getUTCMonth()]}`;
}

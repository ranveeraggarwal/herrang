// `npm run build` — compiles data/** into a single schedule.json, inlines it
// into the app shell, and stamps the service worker with a content-derived
// cache version. Output: dist/ (every byte static and cacheable).
//
// Fails hard on validation errors: invalid data can never ship.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadData, herrangMinutes, KINDS, slugify } from './lib/data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const { venuesDoc, weeks, days, errors, warnings } = loadData();
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nBuild aborted: ${errors.length} validation error(s).`);
  process.exit(1);
}

// --- normalize into the shape the app consumes ---

const normVenueList = (v) => (Array.isArray(v) ? v : [v]);
const normKind = (k) => (k && KINDS.includes(k) ? k : 'other');

// Weekly grid times are printed with dots ("10.00-11.10"); normalize to
// HH:MM start/end here so the client never parses two formats.
const splitGridTime = (time) => {
  const [start, end] = time.replaceAll('.', ':').split('-');
  return { start, end };
};

const normItem = (item, defaultKind) => ({
  title: item.title,
  slug: slugify(item.title),
  venues: item.venues,
  ...(item.start ? { start: item.start, end: item.end } : {}),
  ...(item.start_text ? { start_text: item.start_text } : {}),
  ...(item.after ? { after: item.after } : {}),
  ...(item.teacher ? { teacher: item.teacher } : {}),
  ...(item.note ? { note: item.note } : {}),
  kind: normKind(item.kind ?? defaultKind),
});

const byStart = (a, b) => {
  const am = a.start ? herrangMinutes(a.start) : Infinity;
  const bm = b.start ? herrangMinutes(b.start) : Infinity;
  return am - bm;
};

const schedule = {
  built_at: new Date().toISOString(),
  venues: Object.fromEntries(
    venuesDoc.venues.map((v) => [v.id, { id: v.id, name: v.name, area: v.area }])
  ),
  areas: venuesDoc.areas,
  weeks: weeks.map((w) => ({
    week: w.week,
    start: w.start,
    end: w.end,
    tracks: w.tracks,
    slots: w.slots
      .map((s) => ({
        day: s.day,
        ...splitGridTime(s.time),
        track: s.track,
        venues: normVenueList(s.venue),
        ...(s.note ? { note: s.note } : {}),
      }))
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : byStart(a, b))),
  })),
  days: Object.fromEntries(
    days.map((d) => [
      d.date,
      {
        date: d.date,
        ...(d.library_theme ? { library_theme: d.library_theme } : {}),
        events: (d.events ?? []).map((e) => normItem(e)).sort(byStart),
        specials: (d.specials ?? []).map((e) => normItem(e, 'other')).sort(byStart),
        tasters: (d.tasters ?? []).map((e) => normItem(e, 'class')).sort(byStart),
        talks: (d.talks ?? []).map((e) => normItem(e, 'talk')).sort(byStart),
        notes: d.notes ?? [],
      },
    ])
  ),
};

// --- emit dist/ ---

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(PUBLIC, DIST, { recursive: true });

const scheduleJson = JSON.stringify(schedule);
fs.writeFileSync(path.join(DIST, 'schedule.json'), scheduleJson);

// Inline the schedule into the shell: zero runtime data fetches, airplane
// mode is a fully supported state.
const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('<!-- @SCHEDULE -->')) {
  console.error('✗ public/index.html is missing the <!-- @SCHEDULE --> marker');
  process.exit(1);
}
html = html.replace(
  '<!-- @SCHEDULE -->',
  `<script id="schedule-data" type="application/json">${scheduleJson.replaceAll('</', '<\\/')}</script>`
);
fs.writeFileSync(indexPath, html);

// Stamp the SW cache name with a hash of everything it precaches, so a new
// deploy is detected as an update and unchanged deploys are no-ops.
const hash = crypto
  .createHash('sha256')
  .update(html)
  .update(fs.readFileSync(path.join(DIST, 'app.js')))
  .update(fs.readFileSync(path.join(DIST, 'styles.css')))
  .digest('hex')
  .slice(0, 12);
const swPath = path.join(DIST, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replaceAll('__BUILD_HASH__', hash));

console.log(
  `✓ Built dist/ (${weeks.length} week(s), ${days.length} day sheet(s), build ${hash}, ${schedule.built_at})`
);

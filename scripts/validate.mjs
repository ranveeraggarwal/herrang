// Validator for data/2026/**. Bare Node, no deps, no TS imports, so it runs
// with no build step — the safety net for agent-ingested data. Wired into
// `npm run validate` (and `npm run build` runs it first).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.join(process.cwd(), 'data', '2026');

const KINDS = new Set(['dj', 'show', 'taster', 'social', 'jam', 'special']);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function loadJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(path.relative(process.cwd(), file), `invalid JSON — ${e.message}`);
    return null;
  }
}

// --- venues.json: the registry every other file references ---
const venuesFile = path.join(ROOT, 'venues.json');
const venuesDoc = existsSync(venuesFile) ? loadJson(venuesFile) : null;
const venueIds = new Set();
if (!venuesDoc) {
  err('venues.json', 'missing or unreadable');
} else {
  for (const v of venuesDoc.venues ?? []) {
    if (!v.id) err('venues.json', `venue missing id: ${JSON.stringify(v)}`);
    else if (venueIds.has(v.id)) err('venues.json', `duplicate venue id "${v.id}"`);
    else venueIds.add(v.id);
    if (!v.name) err('venues.json', `venue "${v.id}" missing name`);
    if (!v.area) err('venues.json', `venue "${v.id}" missing area`);
  }
}

const checkVenueRef = (file, id, ctx) => {
  if (!venueIds.has(id)) err(file, `${ctx}: unknown venue id "${id}"`);
};
const checkTime = (file, t, ctx) => {
  if (!TIME_RE.test(t)) err(file, `${ctx}: bad time "${t}" (want HH:MM)`);
};

// --- week2.json: master class schedule ---
const weekFile = path.join(ROOT, 'week2.json');
if (existsSync(weekFile)) {
  const week = loadJson(weekFile);
  if (week) {
    const f = 'week2.json';
    if (!DATE_RE.test(week.start ?? '')) err(f, `bad week start "${week.start}"`);
    if (!DATE_RE.test(week.end ?? '')) err(f, `bad week end "${week.end}"`);
    const trackIds = new Set();
    for (const t of week.tracks ?? []) {
      if (!t.id) err(f, `track missing id: ${JSON.stringify(t)}`);
      else if (trackIds.has(t.id)) err(f, `duplicate track id "${t.id}"`);
      else trackIds.add(t.id);
      if (!t.name) err(f, `track "${t.id}" missing name`);
      if (!t.level) err(f, `track "${t.id}" missing level`);
      if (t.group != null && t.group !== 1 && t.group !== 2)
        err(f, `track "${t.id}": group must be 1 or 2`);
    }
    (week.classes ?? []).forEach((c, i) => {
      const ctx = `classes[${i}] (${c.track ?? '?'} ${c.date ?? '?'} ${c.start ?? '?'})`;
      if (!trackIds.has(c.track)) err(f, `${ctx}: unknown track "${c.track}"`);
      if (!DATE_RE.test(c.date ?? '')) err(f, `${ctx}: bad date "${c.date}"`);
      else if (c.date < week.start || c.date > week.end)
        err(f, `${ctx}: date outside week window ${week.start}–${week.end}`);
      checkTime(f, c.start ?? '', ctx);
      checkTime(f, c.end ?? '', ctx);
      checkVenueRef(f, c.venue, ctx);
    });
    (week.specials ?? []).forEach((s, i) => {
      const ctx = `specials[${i}] ("${s.title ?? '?'}")`;
      if (!s.title) err(f, `${ctx}: missing title`);
      if (s.date && !DATE_RE.test(s.date)) err(f, `${ctx}: bad date "${s.date}"`);
      if (s.start) checkTime(f, s.start, ctx);
      for (const v of s.venues ?? []) checkVenueRef(f, v, ctx);
    });
  }
} else {
  err('week2.json', 'missing');
}

// --- daily/*.json: one per poster day ---
const dailyDir = path.join(ROOT, 'daily');
const dailyFiles = existsSync(dailyDir)
  ? readdirSync(dailyDir).filter((n) => n.endsWith('.json'))
  : [];
for (const name of dailyFiles) {
  const f = `daily/${name}`;
  const doc = loadJson(path.join(dailyDir, name));
  if (!doc) continue;
  if (doc.date !== name.replace(/\.json$/, ''))
    err(f, `date "${doc.date}" does not match filename`);
  if (!doc.weekday) err(f, 'missing weekday');
  if (!doc.title) err(f, 'missing title');
  (doc.events ?? []).forEach((e, i) => {
    const ctx = `events[${i}] ("${e.title ?? '?'}")`;
    if (!e.title) err(f, `${ctx}: missing title`);
    if (!KINDS.has(e.kind)) err(f, `${ctx}: bad kind "${e.kind}"`);
    if (!Array.isArray(e.venues) || e.venues.length === 0)
      err(f, `${ctx}: venues must be a non-empty array`);
    else for (const v of e.venues) checkVenueRef(f, v, ctx);
    checkTime(f, e.start ?? '', ctx);
    // openEnd events may omit end; everything else needs one.
    if (e.end != null) checkTime(f, e.end, ctx);
    else if (!e.openEnd) err(f, `${ctx}: missing end (or set openEnd)`);
  });
  (doc.specials ?? []).forEach((s, i) => {
    const ctx = `specials[${i}] ("${s.title ?? '?'}")`;
    if (!s.title) err(f, `${ctx}: missing title`);
    if (s.kind && !KINDS.has(s.kind)) err(f, `${ctx}: bad kind "${s.kind}"`);
    if (s.venue) checkVenueRef(f, s.venue, ctx);
    if (s.start) checkTime(f, s.start, ctx);
    if (s.end) checkTime(f, s.end, ctx);
  });
}

if (errors.length > 0) {
  console.error(`herrang data: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `herrang data OK — ${venueIds.size} venues, ${dailyFiles.length} daily file(s)`
);

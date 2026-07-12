// Loads and validates everything under data/ against schemas/ plus the
// cross-file rules the schemas can't express (known venue ids, track refs,
// date ranges, overnight time ordering). Used by both `npm run validate`
// and `npm run build`, so nothing invalid can ever reach schedule.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = path.join(ROOT, 'data');
const SCHEMAS = path.join(ROOT, 'schemas');

export const KINDS = ['dj', 'live', 'show', 'jam', 'talk', 'class', 'meetup', 'other'];

export function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readYaml(file) {
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

function makeAjv() {
  // strictRequired trips on the events oneOf (start | start_text) — the
  // branches intentionally reference properties defined on the parent.
  const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  for (const name of ['venues', 'classes', 'day']) {
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(SCHEMAS, `${name}.schema.json`), 'utf8')));
  }
  return ajv;
}

// Minutes since the 06:00 Herräng-day boundary: times before 06:00 belong to
// the following calendar morning, so "01:00" sorts after "23:30".
export function herrangMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const mins = h * 60 + m;
  return mins < 6 * 60 ? mins + 24 * 60 : mins;
}

function checkTimedOrder(item, where, errors) {
  if (item.start && item.end && herrangMinutes(item.end) <= herrangMinutes(item.start)) {
    errors.push(`${where}: end ${item.end} is not after start ${item.start} (06:00-boundary rules)`);
  }
}

export function loadData() {
  const errors = [];
  const warnings = [];
  const ajv = makeAjv();

  const schemaCheck = (schemaId, doc, where) => {
    const validate = ajv.getSchema(schemaId);
    if (!validate(doc)) {
      for (const e of validate.errors) {
        errors.push(`${where}: ${e.instancePath || '/'} ${e.message}`);
      }
      return false;
    }
    return true;
  };

  // --- venues ---
  const venuesFile = path.join(DATA, 'venues.yaml');
  const venuesDoc = readYaml(venuesFile);
  const venueIds = new Set();
  const areaIds = new Set();
  if (schemaCheck('venues.schema.json', venuesDoc, 'data/venues.yaml')) {
    for (const v of venuesDoc.venues) {
      if (venueIds.has(v.id)) errors.push(`data/venues.yaml: duplicate venue id "${v.id}"`);
      venueIds.add(v.id);
    }
    for (const a of Object.keys(venuesDoc.areas)) areaIds.add(a);
    for (const v of venuesDoc.venues) {
      if (!areaIds.has(v.area)) errors.push(`data/venues.yaml: venue "${v.id}" has unknown area "${v.area}"`);
    }
  }

  const checkVenues = (list, where) => {
    for (const id of list ?? []) {
      if (!venueIds.has(id)) errors.push(`${where}: unknown venue id "${id}" (add it to data/venues.yaml)`);
    }
  };

  // --- weekly class grids ---
  const weeks = [];
  const classDir = path.join(DATA, 'classes');
  const classFiles = fs.existsSync(classDir)
    ? fs.readdirSync(classDir).filter((f) => f.endsWith('.yaml')).sort()
    : [];
  for (const f of classFiles) {
    const where = `data/classes/${f}`;
    const doc = readYaml(path.join(classDir, f));
    if (!schemaCheck('classes.schema.json', doc, where)) continue;

    const m = /^week(\d+)\.yaml$/.exec(f);
    if (!m) errors.push(`${where}: filename must be weekN.yaml`);
    else if (Number(m[1]) !== doc.week) errors.push(`${where}: filename week ${m[1]} != week field ${doc.week}`);

    if (doc.end <= doc.start) errors.push(`${where}: end ${doc.end} is not after start ${doc.start}`);

    const trackIds = new Set(doc.tracks.map((t) => t.id));
    if (trackIds.has('all')) errors.push(`${where}: "all" is reserved and cannot be a track id`);
    for (const [i, slot] of doc.slots.entries()) {
      const w = `${where}: slots[${i}]`;
      if (slot.track !== 'all' && !trackIds.has(slot.track)) {
        errors.push(`${w}: unknown track "${slot.track}"`);
      }
      if (slot.day < doc.start || slot.day > doc.end) {
        errors.push(`${w}: day ${slot.day} outside week range ${doc.start}..${doc.end}`);
      }
      checkVenues(Array.isArray(slot.venue) ? slot.venue : [slot.venue], w);
      const [s, e] = slot.time.replaceAll('.', ':').split('-');
      if (herrangMinutes(e) <= herrangMinutes(s)) {
        errors.push(`${w}: time "${slot.time}" does not end after it starts`);
      }
    }
    weeks.push(doc);
  }
  weeks.sort((a, b) => a.week - b.week);
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].week === weeks[i - 1].week) errors.push(`data/classes: duplicate week ${weeks[i].week}`);
  }

  // Camp date range for day-file sanity checks (only when weeks exist).
  const campStart = weeks.length ? weeks.map((w) => w.start).sort()[0] : null;
  const campEnd = weeks.length ? weeks.map((w) => w.end).sort().at(-1) : null;

  // --- daily sheets ---
  const days = [];
  const dayDir = path.join(DATA, 'days');
  const dayFiles = fs.existsSync(dayDir)
    ? fs.readdirSync(dayDir).filter((f) => f.endsWith('.yaml')).sort()
    : [];
  for (const f of dayFiles) {
    const where = `data/days/${f}`;
    const doc = readYaml(path.join(dayDir, f));
    if (!schemaCheck('day.schema.json', doc, where)) continue;

    if (f !== `${doc.date}.yaml`) errors.push(`${where}: filename must match date field (${doc.date}.yaml)`);
    if (campStart && (doc.date < campStart || doc.date > campEnd)) {
      warnings.push(`${where}: date ${doc.date} outside known camp range ${campStart}..${campEnd}`);
    }

    const eventSlugs = (doc.events ?? []).map((e) => slugify(e.title));
    for (const [section, items] of Object.entries({
      events: doc.events ?? [],
      specials: doc.specials ?? [],
      tasters: doc.tasters ?? [],
      talks: doc.talks ?? [],
    })) {
      for (const [i, item] of items.entries()) {
        const w = `${where}: ${section}[${i}] "${item.title}"`;
        checkVenues(item.venues, w);
        checkTimedOrder(item, w, errors);
        if (item.kind && !KINDS.includes(item.kind)) {
          // Unknown kinds render as "other" — never fail the build over them.
          warnings.push(`${w}: unknown kind "${item.kind}" (will render as "other")`);
        }
        if (item.after) {
          const ref = item.after;
          const hit = eventSlugs.some((s) => s === ref || s.startsWith(ref) || ref.startsWith(s));
          if (!hit) warnings.push(`${w}: after: "${ref}" matches no event title on this sheet`);
        }
      }
    }
    days.push(doc);
  }

  return { venuesDoc, weeks, days, errors, warnings };
}

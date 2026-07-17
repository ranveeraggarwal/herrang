// Server-only loader for data/2026/**. Read with fs at build time — the app
// is fully static and the entire payload ships with the page.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import type {
  DailyProgram,
  HerrangData,
  VenueRegistry,
  WeekSchedule,
} from './types';

const ROOT = path.join(process.cwd(), 'data', '2026');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function loadHerrangData(): HerrangData {
  const venues = readJson<VenueRegistry>(path.join(ROOT, 'venues.json')).venues;
  // One file per camp week (week2.json, week3.json, …), ordered by start
  // date. Which one is "current" is a client-side question — see weekFor.
  const weeks = readdirSync(ROOT)
    .filter((name) => /^week\d+\.json$/.test(name))
    .map((name) => readJson<WeekSchedule>(path.join(ROOT, name)))
    .sort((a, b) => a.start.localeCompare(b.start));

  const dailyDir = path.join(ROOT, 'daily');
  const dailies: DailyProgram[] = existsSync(dailyDir)
    ? readdirSync(dailyDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => readJson<DailyProgram>(path.join(dailyDir, name)))
    : [];

  return { venues, weeks, dailies };
}

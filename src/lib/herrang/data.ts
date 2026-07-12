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
  const week = readJson<WeekSchedule>(path.join(ROOT, 'week2.json'));

  const dailyDir = path.join(ROOT, 'daily');
  const dailies: DailyProgram[] = existsSync(dailyDir)
    ? readdirSync(dailyDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => readJson<DailyProgram>(path.join(dailyDir, name)))
    : [];

  return { venues, week, dailies };
}

'use client';

// Week view: the user's tracks only, grouped by day, compact rows.
// Wednesday's row shows the whole-camp special instead of classes.

import type { HerrangData } from '@/lib/herrang/types';
import { addDays } from '@/lib/dates';
import {
  classesOn,
  freeDayLine,
  isClassFreeDay,
  venueLabel,
  weekSpecialsOn,
} from '@/lib/herrang/schedule';
import { formatCompactWeekdayDate } from '@/lib/dates';
import { BigSay, Card, Chip } from './bits';

export function WeekView({
  data,
  trackIds,
  onPickTracks,
}: {
  data: HerrangData;
  trackIds: string[];
  onPickTracks: () => void;
}) {
  const { week, venues } = data;

  if (week.classes.length === 0) {
    return (
      <BigSay
        title="The class schedule isn't loaded yet."
        sub="The week 2 master schedule lands here soon."
      />
    );
  }

  if (trackIds.length === 0) {
    return (
      <BigSay
        title="Pick your track."
        sub={
          <button className="font-bold underline" onClick={onPickTracks}>
            Choose from the week 2 tracks →
          </button>
        }
      />
    );
  }

  const dates: string[] = [];
  for (let d = week.start; d <= week.end; d = addDays(d, 1)) dates.push(d);

  return (
    <div className="flex flex-col gap-3">
      {dates.map((date) => {
        const classes = classesOn(week, trackIds, date);
        const specials = weekSpecialsOn(week, date);
        const free = isClassFreeDay(week, date);
        if (classes.length === 0 && specials.length === 0 && !free) return null;

        return (
          <Card key={date}>
            <h3 className="hg-display mb-3 text-sm">
              {formatCompactWeekdayDate(date)}
            </h3>
            <ul className="flex flex-col gap-2">
              {specials.map((s) => (
                <li
                  key={s.title}
                  className="-mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-2 py-1.5"
                  style={{
                    background: 'var(--hg-special)',
                    color: 'var(--hg-on-special)',
                  }}
                >
                  {s.start && (
                    <span className="hg-time text-sm font-bold">{s.start}</span>
                  )}
                  <span className="text-sm font-bold">{s.title}</span>
                  {s.detail && <span className="text-xs">{s.detail}</span>}
                </li>
              ))}
              {free && classes.length === 0 && (
                <li className="text-sm" style={{ color: 'var(--hg-soft)' }}>
                  {freeDayLine(week, date)}
                </li>
              )}
              {classes.map((c) => {
                const track = week.tracks.find((t) => t.id === c.track);
                return (
                  <li
                    key={`${c.track}-${c.start}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                  >
                    <span className="hg-time text-sm font-bold">
                      {c.start}–{c.end}
                    </span>
                    <span className="text-sm font-semibold">
                      {venueLabel(venues, c.venue)}
                    </span>
                    {trackIds.length > 1 && (
                      <span className="text-xs" style={{ color: 'var(--hg-soft)' }}>
                        {track?.name}
                      </span>
                    )}
                    {(c.labels ?? []).map((l) => (
                      <Chip key={l}>{l}</Chip>
                    ))}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

'use client';

// Week view: the user's tracks only, grouped by day, compact rows. Lives
// nested inside a single collapsed card on the Classes view (TodayView), so
// it renders flat sections with hairline dividers rather than its own boxed
// cards — a card inside a card inside a card was the previous look.
// Wednesday's row shows the whole-camp special instead of classes.
// Days already behind us drop into a collapsed archive — nobody's
// scrolling back to check what track they picked on Tuesday.

import type { ReactNode } from 'react';
import type { HerrangData, WeekSchedule } from '@/lib/herrang/types';
import { addDays } from '@/lib/dates';
import {
  classesOn,
  freeDayLine,
  isClassFreeDay,
  venueName,
  weekSpecialsOn,
} from '@/lib/herrang/schedule';
import { toPosterMinutes } from '@/lib/herrang/time';
import { formatCompactWeekdayDate } from '@/lib/dates';
import { Chip } from './bits';

function Divider() {
  return <hr style={{ borderColor: 'var(--hg-line)' }} />;
}

export function WeekView({
  data,
  week,
  trackIds,
  today,
  now,
  onPickTracks,
}: {
  data: HerrangData;
  /** The week in force for `today` (see weekFor). */
  week: WeekSchedule;
  trackIds: string[];
  /** Poster date "now" is in force — days before it are already behind us. */
  today: string;
  /** Poster-timeline minutes — used only to grey out today's finished items. */
  now: number;
  onPickTracks: () => void;
}) {
  const { venues } = data;

  if (week.classes.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--hg-soft)' }}>
        The week {week.week} master schedule lands here soon.
      </p>
    );
  }

  if (trackIds.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--hg-soft)' }}>
        <button className="font-bold underline" onClick={onPickTracks}>
          Choose from the week {week.week} tracks →
        </button>
      </p>
    );
  }

  const dates: string[] = [];
  for (let d = week.start; d <= week.end; d = addDays(d, 1)) dates.push(d);

  const daySection = (date: string) => {
    const classes = classesOn(week, trackIds, date);
    const specials = weekSpecialsOn(week, date);
    const free = isClassFreeDay(week, date);
    if (classes.length === 0 && specials.length === 0 && !free) return null;

    // Only today's section can have finished items sitting next to upcoming
    // ones — earlier days are already behind the "today" split, later days
    // haven't started.
    const isToday = date === today;

    return (
      <div key={date}>
        <h3 className="hg-display mb-3 text-xs" style={{ color: 'var(--hg-soft)' }}>
          {formatCompactWeekdayDate(date)}
        </h3>
        <ul className="flex flex-col gap-2">
          {specials.map((s) => {
            const donePast = isToday && s.start && now >= toPosterMinutes(s.start);
            return (
              <li
                key={s.title}
                className="-mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-2 py-1.5"
                style={{
                  background: 'var(--hg-special)',
                  color: 'var(--hg-on-special)',
                  opacity: donePast ? 0.45 : undefined,
                }}
              >
                {s.start && (
                  <span className="hg-time text-sm font-bold">{s.start}</span>
                )}
                <span className="text-sm font-bold">{s.title}</span>
                {s.detail && <span className="text-xs">{s.detail}</span>}
              </li>
            );
          })}
          {free && classes.length === 0 && (
            <li className="text-sm" style={{ color: 'var(--hg-soft)' }}>
              {freeDayLine(week, date)}
            </li>
          )}
          {classes.map((c) => {
            const track = week.tracks.find((t) => t.id === c.track);
            const done = isToday && now >= toPosterMinutes(c.end);
            return (
              <li
                key={`${c.track}-${c.start}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                style={done ? { opacity: 0.45 } : undefined}
              >
                <span className="hg-time text-sm font-bold">
                  {c.start}–{c.end}
                </span>
                <span className="text-sm font-semibold">
                  {venueName(venues, c.venue)}
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
      </div>
    );
  };

  // Flat sections with a hairline divider between each day, instead of a
  // card per day — this whole view already sits inside one card.
  const withDividers = (nodes: ReactNode[]) =>
    nodes.flatMap((node, i) => (i === 0 ? [node] : [<Divider key={`d-${i}`} />, node]));

  const upcoming = dates.filter((d) => d >= today);
  const past = dates.filter((d) => d < today);
  const upcomingSections = upcoming.map(daySection).filter(Boolean) as ReactNode[];
  const pastSections = past.map(daySection).filter(Boolean) as ReactNode[];

  return (
    <div className="flex flex-col gap-4">
      {withDividers(upcomingSections)}

      {pastSections.length > 0 && (
        <>
          <Divider />
          <details className="group">
            <summary
              className="hg-display flex cursor-pointer list-none items-center gap-1.5 text-xs"
              style={{ color: 'var(--hg-soft)' }}
            >
              <span className="inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              Already happened. Relax. ({pastSections.length})
            </summary>
            <div className="mt-4 flex flex-col gap-4 opacity-60">
              {withDividers(pastSections)}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

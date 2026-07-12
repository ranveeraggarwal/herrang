'use client';

// Day mode: your track's current/next class, huge. Plus the special cases the
// camp calendar throws at us — the class-free Wednesday, the post-Friday wrap,
// and the 04:00–08:00 weird hours.

import { useState, type SyntheticEvent } from 'react';
import type { HerrangData, HerrangVenue, WeekClass } from '@/lib/herrang/types';
import {
  endsChip,
  relativeChip,
  toMinutes,
  type ClockState,
} from '@/lib/herrang/time';
import {
  campDayNumber,
  classesOn,
  firstClassOnOrAfter,
  freeDayLine,
  isClassFreeDay,
  isWeekWrapped,
  nowAndNextClass,
  venueLabel,
  venueName,
  weekSpecialsOn,
} from '@/lib/herrang/schedule';
import { formatCompactWeekdayDate } from '@/lib/dates';
import { BigSay, Card, Chip } from './bits';

// One line per day of camp — sleep debt escalates, the joke doesn't repeat
// until the pool runs out. Index by day-of-camp so it's stable all night,
// not a coin flip on every 30s clock tick.
const WEIRD_HOURS_LINES = [
  "Go to bed. Or don't.",
  'Still got legs. Go to bed.',
  "You're not as young as Tuesday you.",
  "Whatever this is, it's not a nap.",
  'Your body is filing a complaint.',
  "The sun's basically up. Might as well stay up.",
  'Go to bed. Home is soon enough.',
];

export function TodayView(props: {
  data: HerrangData;
  clock: ClockState;
  trackIds: string[];
  onPickTracks: () => void;
  onGoTonight: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TodayViewBody {...props} />
      <WhereAreThings venues={props.data.venues} />
    </div>
  );
}

const WHERE_OPEN_KEY = 'herrang.whereOpen.v1';

/** Open by default; the user's collapse choice persists across visits.
 * Safe to read localStorage in the initializer — TodayView only ever mounts
 * client-side, after HerrangApp's clock gate has already passed. */
function WhereAreThings({ venues }: { venues: HerrangVenue[] }) {
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(WHERE_OPEN_KEY);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  const handleToggle = (e: SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setOpen(isOpen);
    try {
      localStorage.setItem(WHERE_OPEN_KEY, String(isOpen));
    } catch {
      /* private mode etc. — collapse state just won't persist */
    }
  };

  return (
    <Card>
      <details className="group" open={open} onToggle={handleToggle}>
        <summary
          className="hg-display flex cursor-pointer list-none items-center gap-1.5 text-xs"
          style={{ color: 'var(--hg-soft)' }}
        >
          <span className="inline-block transition-transform group-open:rotate-90">
            ▸
          </span>
          Where are things?
        </summary>
        <ul className="mt-3 flex flex-col gap-1.5">
          {venues.map((v) => (
            <li key={v.id} className="text-sm font-semibold">
              {venueLabel(venues, v.id)}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

function TodayViewBody({
  data,
  clock,
  trackIds,
  onPickTracks,
  onGoTonight,
}: {
  data: HerrangData;
  clock: ClockState;
  trackIds: string[];
  onPickTracks: () => void;
  onGoTonight: () => void;
}) {
  const { week, venues } = data;

  // 04:00–08:00 — a single card.
  if (clock.mode === 'weird') {
    const first = firstClassOnOrAfter(week, trackIds, clock.dateISO);
    const dayIndex = (campDayNumber(week, clock.posterDate) - 1) % WEIRD_HOURS_LINES.length;
    return (
      <BigSay
        title={WEIRD_HOURS_LINES[dayIndex]}
        sub={
          first ? (
            <span>
              Your next class:{' '}
              <strong className="hg-time" style={{ color: 'var(--hg-ink)' }}>
                {formatCompactWeekdayDate(first.date)} {first.start}
              </strong>{' '}
              — {venueName(venues, first.venue)}
            </span>
          ) : trackIds.length === 0 && week.tracks.length > 0 ? (
            <button className="font-bold underline" onClick={onPickTracks}>
              Pick your track to see what&apos;s next →
            </button>
          ) : (
            'Nothing on your schedule until further notice.'
          )
        }
      />
    );
  }

  // Class-free days: Wednesday has the whole-camp special at 14:00; arrival
  // Saturday has nothing on the class schedule (the evening program lives
  // in the daily file, not here).
  if (isClassFreeDay(week, clock.posterDate)) {
    const specials = weekSpecialsOn(week, clock.posterDate);
    if (specials.length === 0) {
      return (
        <BigSay
          title="No classes today."
          sub={freeDayLine(week, clock.posterDate)}
        />
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {specials.map((s) => (
          <section
            key={s.title}
            className="p-5"
            style={{
              background: 'var(--hg-special)',
              color: 'var(--hg-on-special)',
              borderRadius: 'var(--hg-radius)',
            }}
          >
            <div className="hg-time text-sm font-bold">{s.start ?? ''}</div>
            <h2 className="hg-display mt-1 text-[clamp(1.5rem,7vw,2.4rem)]">
              {s.title}
            </h2>
            <p className="mt-2 text-sm">
              {(s.venues ?? []).map((v) => venueName(venues, v)).join(' + ')}
              {s.detail ? ` — ${s.detail}` : ''}
            </p>
          </section>
        ))}
        <BigSay title={freeDayLine(week, clock.posterDate)} />
      </div>
    );
  }

  if (isWeekWrapped(week, clock.posterDate, clock.minutes)) {
    return (
      <BigSay
        title={`Week ${week.week} is a wrap 🎉`}
        sub={
          <button className="font-bold underline" onClick={onGoTonight}>
            The night program is still live →
          </button>
        }
      />
    );
  }

  if (week.classes.length === 0) {
    return (
      <BigSay
        title="The class schedule isn't loaded yet."
        sub="The 210-entry week 2 master schedule lands here soon. Tonight's program already works."
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

  const classes = classesOn(week, trackIds, clock.posterDate);
  const { current, next } = nowAndNextClass(classes, clock.minutes);

  return (
    <div className="flex flex-col gap-3">
      {current || next ? (
        <NowClassCard data={data} clock={clock} current={current} next={next} />
      ) : clock.mode === 'night' ? (
        <BigSay
          title="Classes are done."
          sub={
            <button className="font-bold underline" onClick={onGoTonight}>
              Tonight is live →
            </button>
          }
        />
      ) : classes.length === 0 ? (
        <BigSay title="No classes for your track today." />
      ) : (
        <BigSay title="Nothing on right now. Go swim." />
      )}

      {classes.length > 0 && (
        <Card>
          <h3
            className="hg-display mb-3 text-xs"
            style={{ color: 'var(--hg-soft)' }}
          >
            Today · your track{trackIds.length > 1 ? 's' : ''}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {classes.map((c) => {
              const past = clock.minutes >= toMinutes(c.end);
              const track = week.tracks.find((t) => t.id === c.track);
              return (
                <li
                  key={`${c.track}-${c.start}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                  style={past ? { opacity: 0.45 } : undefined}
                >
                  <span className="hg-time text-sm font-bold">
                    {c.start}–{c.end}
                  </span>
                  <span className="text-sm font-semibold">
                    {venueName(data.venues, c.venue)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--hg-soft)' }}>
                    {c.title ?? track?.name}
                  </span>
                  {(c.labels ?? []).map((l) => (
                    <Chip key={l}>{l}</Chip>
                  ))}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** The signature component, day flavor: one card, full width, display type. */
function NowClassCard({
  data,
  clock,
  current,
  next,
}: {
  data: HerrangData;
  clock: ClockState;
  current?: WeekClass;
  next?: WeekClass;
}) {
  const c = current ?? next!;
  const track = data.week.tracks.find((t) => t.id === c.track);
  const chip = current
    ? endsChip(clock.minutes, toMinutes(current.end))
    : relativeChip(clock.minutes, toMinutes(next!.start));

  return (
    <section
      className="p-5"
      style={{
        background: 'var(--hg-card)',
        border: '1px solid var(--hg-ink)',
        borderRadius: 'var(--hg-radius)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="hg-display hg-time text-sm">
          {current ? 'Now' : `Next · ${c.start}`}
        </span>
        <Chip filled>{chip}</Chip>
      </div>
      <h2 className="hg-display mt-2 text-[clamp(2rem,10vw,3.4rem)]">
        {venueName(data.venues, c.venue)}
      </h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--hg-soft)' }}>
        {venueLabel(data.venues, c.venue).split(' · ')[1]} — {c.title ?? track?.name}
      </p>
      {(c.labels ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(c.labels ?? []).map((l) => (
            <Chip key={l}>{l}</Chip>
          ))}
        </div>
      )}
    </section>
  );
}

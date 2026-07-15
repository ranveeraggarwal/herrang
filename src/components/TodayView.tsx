'use client';

// Day mode: your track's current/next class, huge. Plus the special cases the
// camp calendar throws at us — the class-free Wednesday, the post-Friday wrap,
// and the 04:00–08:00 weird hours.

import { useState, type SyntheticEvent } from 'react';
import type { HerrangData, HerrangVenue, WeekClass } from '@/lib/herrang/types';
import {
  endsChip,
  relativeChip,
  toPosterMinutes,
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
import { WeekView } from './WeekView';

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

// Tapping the weird-hours card opens a negotiation you cannot win. It
// escalates through resignation and ends with your next class, enormous —
// the threat is the schedule itself. Tapping the threat starts over.
const BEDTIME_NEGOTIATION = [
  'Still up?',
  'Seriously?',
  'Okay. You leave us no choice.',
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
      <ThisWeekCard
        data={props.data}
        trackIds={props.trackIds}
        today={props.clock.posterDate}
        now={props.clock.posterMinutes}
        onPickTracks={props.onPickTracks}
      />
    </div>
  );
}

const WHERE_OPEN_KEY = 'herrang.whereOpen.v1';
const WEEK_OPEN_KEY = 'herrang.weekOpen.v1';

/** Collapsed by default — the whole week's schedule, tucked below the venue
 * list. Nobody needs to see next Thursday every time they check what class
 * is next. */
function ThisWeekCard({
  data,
  trackIds,
  today,
  now,
  onPickTracks,
}: {
  data: HerrangData;
  trackIds: string[];
  today: string;
  now: number;
  onPickTracks: () => void;
}) {
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(WEEK_OPEN_KEY);
      return raw === null ? false : raw === 'true';
    } catch {
      return false;
    }
  });

  if (data.week.classes.length === 0) return null;

  const handleToggle = (e: SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setOpen(isOpen);
    try {
      localStorage.setItem(WEEK_OPEN_KEY, String(isOpen));
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
          The whole week
        </summary>
        <div className="mt-3">
          <WeekView
            data={data}
            trackIds={trackIds}
            today={today}
            now={now}
            onPickTracks={onPickTracks}
          />
        </div>
      </details>
    </Card>
  );
}

/** Collapsed by default; the user's choice persists across visits. Safe to
 * read localStorage in the initializer — TodayView only ever mounts
 * client-side, after HerrangApp's clock gate has already passed. */
function WhereAreThings({ venues }: { venues: HerrangVenue[] }) {
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(WHERE_OPEN_KEY);
      return raw === null ? false : raw === 'true';
    } catch {
      return false;
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

  // 04:00–08:00 — a single card (which will argue back if pressed).
  if (clock.mode === 'weird') {
    return (
      <BedtimeNegotiation
        data={data}
        clock={clock}
        trackIds={trackIds}
        onPickTracks={onPickTracks}
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

  if (isWeekWrapped(week, clock.posterDate, clock.posterMinutes)) {
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
  const { current, next } = nowAndNextClass(classes, clock.posterMinutes);

  // Past midnight, still "night" mode: `classes` above is the just-finished
  // poster day (yesterday, by the calendar) — every one of them dimmed as
  // past. Showing that under a "Today" heading is misinformation once the
  // calendar has actually turned over. The reference list below follows the
  // real calendar day instead, which is what "today" means to a 3am reader.
  const pastMidnight = clock.mode === 'night' && clock.dateISO !== clock.posterDate;
  const listClasses = pastMidnight
    ? classesOn(week, trackIds, clock.dateISO)
    : classes;

  return (
    <div className="flex flex-col gap-3">
      {current || next ? (
        <NowClassCard data={data} clock={clock} current={current} next={next} />
      ) : clock.mode === 'night' ? (
        <BigSay
          title="Classes are done."
          sub={
            <span className="flex flex-col items-start gap-1.5">
              <button className="font-bold underline" onClick={onGoTonight}>
                Program is live →
              </button>
              {/* Past midnight, still "night" mode: the poster date is
                  still yesterday's, but a 3am reader deciding whether to go
                  to bed wants tomorrow's first class, not just "go check
                  tonight." */}
              {clock.dateISO !== clock.posterDate && (
                <NextClassLine
                  data={data}
                  trackIds={trackIds}
                  fromDate={clock.dateISO}
                  onPickTracks={onPickTracks}
                />
              )}
            </span>
          }
        />
      ) : classes.length === 0 ? (
        <BigSay title="No classes for your track today." />
      ) : (
        <GoSwimCard />
      )}

      {listClasses.length > 0 && (
        <Card>
          <h3 className="hg-display mb-3 text-xs">
            <span style={{ color: 'var(--hg-soft)' }}>Today · </span>
            {trackIds
              .map((id) => week.tracks.find((t) => t.id === id)?.name)
              .filter(Boolean)
              .join(' + ')}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {listClasses.map((c) => {
              // The post-midnight list is tomorrow's (by poster-day terms)
              // full schedule, none of it started yet — poster-minutes from
              // the *current* poster day can't be compared against it.
              const past =
                !pastMidnight && clock.posterMinutes >= toPosterMinutes(c.end);
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
                  {/* The track name's already in the card header above — only
                      repeat it per-row when there's more than one track to
                      tell apart. A custom class title is worth showing either
                      way. */}
                  {(c.title || trackIds.length > 1) && (
                    <span className="text-xs" style={{ color: 'var(--hg-soft)' }}>
                      {c.title ?? track?.name}
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
      )}
    </div>
  );
}

/** The weird-hours card. Reads like the plain BigSay it replaced — the
 * negotiation only reveals itself if you argue with it. */
function BedtimeNegotiation({
  data,
  clock,
  trackIds,
  onPickTracks,
}: {
  data: HerrangData;
  clock: ClockState;
  trackIds: string[];
  onPickTracks: () => void;
}) {
  const [stage, setStage] = useState(0);
  const dayIndex =
    (campDayNumber(data.week, clock.posterDate) - 1) % WEIRD_HOURS_LINES.length;
  const first = firstClassOnOrAfter(data.week, trackIds, clock.dateISO);
  const titleButton = (label: string, onClick: () => void) => (
    <h2 className="hg-display text-[clamp(1.6rem,7.5vw,2.6rem)]">
      {/* Same trick as the header title: a button dressed as plain text.
          The explicit inherits matter — the UA stylesheet strips
          text-transform (and friends) off buttons. */}
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        style={{
          font: 'inherit',
          color: 'inherit',
          textTransform: 'inherit',
          letterSpacing: 'inherit',
          lineHeight: 'inherit',
        }}
      >
        {label}
      </button>
    </h2>
  );

  // Past the last word: the schedule delivers the closing argument.
  if (stage > BEDTIME_NEGOTIATION.length) {
    if (!first) {
      return (
        <Card>
          {titleButton('Nothing scheduled tomorrow. You win. Go to bed anyway.', () =>
            setStage(0)
          )}
        </Card>
      );
    }
    return (
      <Card>
        <button
          type="button"
          onClick={() => setStage(0)}
          className="block w-full text-left"
          style={{ font: 'inherit', color: 'inherit' }}
        >
          <span
            className="hg-display block text-xs"
            style={{ color: 'var(--hg-soft)' }}
          >
            Your first class
          </span>
          <span className="hg-display hg-time block text-[clamp(4.5rem,28vw,8rem)]">
            {first.start}
          </span>
          <span className="mt-1 block text-sm" style={{ color: 'var(--hg-soft)' }}>
            It knows you&apos;re awake.
          </span>
        </button>
      </Card>
    );
  }

  return (
    <Card>
      {titleButton(
        stage === 0 ? WEIRD_HOURS_LINES[dayIndex] : BEDTIME_NEGOTIATION[stage - 1],
        () => setStage((s) => s + 1)
      )}
      {stage === 0 && (
        <div className="mt-3 text-sm" style={{ color: 'var(--hg-soft)' }}>
          <NextClassLine
            data={data}
            trackIds={trackIds}
            fromDate={clock.dateISO}
            onPickTracks={onPickTracks}
          />
        </div>
      )}
    </Card>
  );
}

/** "Go swim" is secretly a lake report. Tap to check, tap to put away. */
function GoSwimCard() {
  const [lake, setLake] = useState(false);
  return (
    <Card>
      <h2 className="hg-display text-[clamp(1.6rem,7.5vw,2.6rem)]">
        {/* Dressed as plain text; the inherits undo the UA button styles. */}
        <button
          type="button"
          onClick={() => setLake((v) => !v)}
          className="block w-full text-left"
          style={{
            font: 'inherit',
            color: 'inherit',
            textTransform: 'inherit',
            letterSpacing: 'inherit',
            lineHeight: 'inherit',
          }}
        >
          Nothing on right now. Go swim.
        </button>
      </h2>
      {lake && (
        <p className="mt-3 text-sm" style={{ color: 'var(--hg-soft)' }}>
          🌊 Lake status: still a lake. Temperature: character-building.
        </p>
      )}
    </Card>
  );
}

/** "Your next class: Thu 09:30 — Roseland Ballroom" — or a fallback if
 * there's nothing left to look forward to (unpicked track / camp's over).
 * Shared by the weird-hours card and the post-midnight tail of night mode —
 * both are "should I go to bed" moments. */
function NextClassLine({
  data,
  trackIds,
  fromDate,
  onPickTracks,
}: {
  data: HerrangData;
  trackIds: string[];
  fromDate: string;
  onPickTracks: () => void;
}) {
  const first = firstClassOnOrAfter(data.week, trackIds, fromDate);
  if (first) {
    return (
      <span>
        Your next class:{' '}
        <strong className="hg-time" style={{ color: 'var(--hg-ink)' }}>
          {formatCompactWeekdayDate(first.date)} {first.start}
        </strong>{' '}
        — {venueName(data.venues, first.venue)}
      </span>
    );
  }
  if (trackIds.length === 0 && data.week.tracks.length > 0) {
    return (
      <button className="font-bold underline" onClick={onPickTracks}>
        Pick your track to see what&apos;s next →
      </button>
    );
  }
  return <span>Nothing on your schedule until further notice.</span>;
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
    ? endsChip(clock.posterMinutes, toPosterMinutes(current.end))
    : relativeChip(clock.posterMinutes, toPosterMinutes(next!.start));
  // Same elapsed-time scrim as Tonight's cards. Classes have no poster kind
  // color to tint with, so this uses --hg-ink itself at low opacity — it
  // darkens the card in day mode and lightens it in night mode, since ink
  // flips between the two, staying subtle either way.
  const elapsedPct = current
    ? Math.round(
        ((clock.posterMinutes - toPosterMinutes(current.start)) /
          (toPosterMinutes(current.end) - toPosterMinutes(current.start))) *
          100
      )
    : 0;

  return (
    <section
      className="relative overflow-hidden p-5"
      style={{
        background: 'var(--hg-card)',
        border: '1px solid var(--hg-ink)',
        borderRadius: 'var(--hg-radius)',
      }}
    >
      {current && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ width: `${elapsedPct}%`, background: 'var(--hg-ink)', opacity: 0.08 }}
        />
      )}
      <div className="relative z-10">
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
      </div>
    </section>
  );
}

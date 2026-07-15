'use client';

// The client shell: owns the clock, the track selection, the ground
// (day/night), and which view is showing. The device clock picks the default
// view; the tabs always let the user override.

import { useEffect, useMemo, useState } from 'react';
import type { HerrangData } from '@/lib/herrang/types';
import {
  clockStateFor,
  isNightGround,
  toPosterMinutes,
  type ClockState,
} from '@/lib/herrang/time';
import {
  campDayCount,
  campDayNumber,
  classesOn,
  dailyFor,
  isClassFreeDay,
  nowAndNextClass,
  runningEvents,
  selectedTrackIds,
  type TrackSelection,
} from '@/lib/herrang/schedule';
import { formatCompactWeekdayDate } from '@/lib/dates';
import { TodayView } from './TodayView';
import { TonightView } from './TonightView';
import { SettingsSheet, type ThemePref } from './SettingsSheet';
import { InstallToast } from './InstallToast';
import { PepTalk } from './PepTalk';
import { ShimSham, useShimShamLongPress } from './shenanigans';
import { LiveDot } from './bits';

type View = 'today' | 'wednesday' | 'tonight';

const VIEW_LABELS: Record<View, string> = {
  today: 'classes',
  wednesday: 'wednesday',
  tonight: 'program',
};

const TRACKS_KEY = 'herrang.tracks.v1';
const THEME_KEY = 'herrang.theme.v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode etc. — selection just won't persist */
  }
}

const EMPTY_SELECTION: TrackSelection = { levels: [], groups: {} };

export function HerrangApp({ data }: { data: HerrangData }) {
  // Everything time- and storage-dependent renders only after mount, so the
  // statically generated HTML never disagrees with the client.
  const [clock, setClock] = useState<ClockState | null>(null);
  const [selection, setSelection] = useState<TrackSelection>(EMPTY_SELECTION);
  const [themePref, setThemePref] = useState<ThemePref>('auto');
  const [manualView, setManualView] = useState<View | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pepTalkOpen, setPepTalkOpen] = useState(false);

  // Shenanigans (see shenanigans.tsx): the Shim Sham long-press only arms
  // during party hours.
  const { shimShamOpen, closeShimSham } = useShimShamLongPress(
    clock?.mode === 'night'
  );

  useEffect(() => {
    const tick = () => setClock(clockStateFor(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setSelection(readJson<TrackSelection>(TRACKS_KEY, EMPTY_SELECTION));
    setThemePref(readJson<ThemePref>(THEME_KEY, 'auto'));
    // First visit: nothing stored yet → offer the track picker (only once the
    // master schedule actually has tracks to pick).
    try {
      if (localStorage.getItem(TRACKS_KEY) === null && data.week.tracks.length > 0) {
        setSettingsOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, [data.week.tracks.length]);

  // The ground follows the clock (night 20:00–08:00) unless overridden.
  useEffect(() => {
    if (!clock) return;
    const night =
      themePref === 'night' ||
      (themePref === 'auto' && isNightGround(clock.minutes));
    document.documentElement.setAttribute('data-hg', night ? 'night' : 'day');
  }, [clock, themePref]);

  // Offline after one load — camp Wi-Fi is a rumor.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
  }, []);

  const trackIds = useMemo(
    () => selectedTrackIds(data.week, selection),
    [data.week, selection]
  );

  // Once the last of today's classes for the picked tracks has ended, jump
  // to Tonight even if the clock hasn't crossed the 19:10 day/night line yet
  // — a day with an early last class shouldn't leave you staring at "nothing
  // on right now" until the fixed cutoff.
  const classesDoneForToday = useMemo(() => {
    if (!clock || clock.mode !== 'day' || trackIds.length === 0) return false;
    const todaysClasses = classesOn(data.week, trackIds, clock.posterDate);
    if (todaysClasses.length === 0) return false;
    const lastEnd = Math.max(...todaysClasses.map((c) => toPosterMinutes(c.end)));
    return clock.posterMinutes >= lastEnd;
  }, [clock, data.week, trackIds]);

  // Wednesday only earns its own tab once its poster has actually been
  // ingested — driven by the daily file's own `weekday`, not day-of-week
  // arithmetic, so it can never disagree with what the poster itself says.
  const isWednesdayToday = useMemo(() => {
    if (!clock) return false;
    return dailyFor(data.dailies, clock.posterDate)?.weekday === 'Wednesday';
  }, [clock, data.dailies]);

  // No tracks picked means no classes to show on Today — the program is the
  // more useful default (also covers first-visit, before the track picker
  // has been dismissed). Same on any other class-free day (e.g. arrival
  // Saturday). Wednesday itself gets its own tab as the daytime default
  // instead, until night hours hand the default back to the program.
  const autoView: View =
    isWednesdayToday && clock?.mode === 'day'
      ? 'wednesday'
      : trackIds.length === 0 ||
          clock?.mode === 'night' ||
          classesDoneForToday ||
          (clock ? isClassFreeDay(data.week, clock.posterDate) : false)
        ? 'tonight'
        : 'today';

  // manualView wins, except when it points at the Wednesday tab on a day
  // that isn't Wednesday (or no longer is) — then fall back to autoView
  // instead of rendering a tab that shouldn't exist.
  const view: View =
    manualView && (manualView !== 'wednesday' || isWednesdayToday)
      ? manualView
      : autoView;

  // The nav's live dots: your track's current class, and anything currently
  // running on the daily program (DJ set, taster, daytime special, ...).
  const classesLive = useMemo(() => {
    if (!clock || clock.mode !== 'day' || trackIds.length === 0) return false;
    const classes = classesOn(data.week, trackIds, clock.posterDate);
    return nowAndNextClass(classes, clock.posterMinutes).current !== undefined;
  }, [clock, data.week, trackIds]);

  const programLive = useMemo(() => {
    if (!clock) return false;
    const daily = dailyFor(data.dailies, clock.posterDate);
    if (!daily) return false;
    return runningEvents(daily, clock.posterMinutes).length > 0;
  }, [clock, data.dailies]);

  const saveSelection = (s: TrackSelection) => {
    setSelection(s);
    writeJson(TRACKS_KEY, s);
  };
  const saveTheme = (t: ThemePref) => {
    setThemePref(t);
    writeJson(THEME_KEY, t);
  };

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-grow flex-col px-4">
        <header className="flex items-start justify-between gap-3 pt-5 pb-4">
          <div>
            <h1 className="hg-display text-xl leading-none">
              {/* Secret trigger: looks exactly like the plain title, no hint
                  it does anything. See PepTalk.tsx. */}
              <button
                type="button"
                onClick={() => setPepTalkOpen(true)}
                aria-label="Herräng Companion"
                style={{
                  font: 'inherit',
                  color: 'inherit',
                  textTransform: 'inherit',
                  letterSpacing: 'inherit',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                  display: 'block',
                  width: '100%',
                }}
              >
                Herräng Companion
              </button>
            </h1>
            <p
              className="hg-time mt-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--hg-soft)' }}
            >
              {/* The real calendar date, not the poster date — during the
                  04:00–08:00 weird hours the poster date is still "yesterday"
                  (it groups the tail of last night's program), but the header
                  is read as "what day is it" and must not look stuck. */}
              {clock ? formatCompactWeekdayDate(clock.dateISO) : ' '}
            </p>
            {clock && data.week.classes.length > 0 && (
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--hg-soft)' }}>
                Day {campDayNumber(data.week, clock.posterDate)} of{' '}
                {campDayCount(data.week)} · ~
                {Math.max(0, campDayNumber(data.week, clock.posterDate) - 1) * 4}h
                slept, allegedly
              </p>
            )}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
            style={{ border: '1px solid var(--hg-ink)' }}
          >
            Tracks&thinsp;·&thinsp;⚙
          </button>
        </header>

        <nav
          aria-label="View"
          className={`mb-5 grid gap-2 ${isWednesdayToday ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          {(isWednesdayToday
            ? (['today', 'wednesday', 'tonight'] as const)
            : (['today', 'tonight'] as const)
          ).map((v) => {
            // Wednesday and Program point at the same daily file on
            // Wednesday, so they share its live dot.
            const live =
              (v === 'today' && classesLive) ||
              ((v === 'tonight' || v === 'wednesday') && programLive);
            return (
              <button
                key={v}
                onClick={() => setManualView(v)}
                aria-current={view === v ? 'page' : undefined}
                className="hg-display inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-sm"
                style={
                  view === v
                    ? { background: 'var(--hg-ink)', color: 'var(--hg-ground)' }
                    : { border: '1px solid var(--hg-line)', color: 'var(--hg-ink)' }
                }
              >
                {VIEW_LABELS[v]}
                {live && <LiveDot />}
              </button>
            );
          })}
        </nav>

        <main className="flex-grow">
          {clock === null ? null : view === 'today' ? (
            <TodayView
              data={data}
              clock={clock}
              trackIds={trackIds}
              onPickTracks={() => setSettingsOpen(true)}
              onGoTonight={() => setManualView('tonight')}
            />
          ) : (
            // Wednesday and Program are the same underlying daily file on
            // Wednesday — only the tab and its default timing differ.
            <TonightView data={data} clock={clock} />
          )}
        </main>
      </div>

      <footer
        className="mx-auto mt-10 w-full max-w-3xl px-4 pt-4 pb-8 text-center text-xs"
        style={{ color: 'var(--hg-soft)', borderTop: '1px solid var(--hg-line)' }}
      >
        <p>Unofficially made for a village up north.</p>
        <p className="mt-1">
          Something off?{' '}
          <a
            href="https://github.com/ranveeraggarwal/herrang"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Github
          </a>
          {' · '}
          <a href="mailto:herrang@walagran.com" className="underline">
            Email
          </a>
        </p>
      </footer>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        week={data.week}
        selection={selection}
        onSelection={saveSelection}
        themePref={themePref}
        onTheme={saveTheme}
        trackIds={trackIds}
      />

      <InstallToast />

      {pepTalkOpen && clock && (
        <PepTalk mode={clock.mode} onClose={() => setPepTalkOpen(false)} />
      )}
      {shimShamOpen && <ShimSham onClose={closeShimSham} />}
    </div>
  );
}

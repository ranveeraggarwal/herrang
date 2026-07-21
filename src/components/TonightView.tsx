'use client';

// Night mode: tonight's program as a single chronological stream. The
// poster's venue-columns × hour-rows grid dies on a phone — here every
// block carries its own venue instead. Timed specials are merged into the
// stream at their actual slot; only specials with no start time (can't be
// placed on a timeline) stay pinned as red cards. TBA items render as
// mystery cards. Currently-running cards carry their own progress scrim
// instead of a separate now-line — see EventBlock. The stream reads
// next-first: upcoming blocks on top, already-running groups under a
// "Still going" label below them, and finished events sink into a collapsed
// "Already happened" archive at the bottom (splitStream), still dimmed,
// still there for the "wait, when was the show?" conversations.

import { useState } from 'react';
import type { DailyEvent, HerrangData } from '@/lib/herrang/types';
import {
  endsChip,
  toPosterMinutes,
  type ClockState,
} from '@/lib/herrang/time';
import { sunTimesFor } from '@/lib/herrang/sun';
import {
  dailyFor,
  eventLocation,
  runningEvents,
  splitStream,
  tonightStream,
  venueLabel,
  venueName,
  type StreamGroup,
} from '@/lib/herrang/schedule';
import { blockStyle, kindColor, kindLabel, BigSay, Chip } from './bits';
import { BigNow } from './BigNow';
import { StealableBand, StealingWarrants } from './StealingWarrants';

// Tapping the sun line cycles through the mosquito forecast, then puts it
// away again. No hint it does anything — same rule as the title's pep talk.
const MOSQUITO_FORECAST = [
  '🦟 Mosquito forecast: yes.',
  '🦟 Updated forecast: still yes.',
  '🦟 They can smell your repellent. They consider it a marinade.',
];

/** The one quiet line about how little dark there is to work with tonight. */
function SunLine({ posterDate }: { posterDate: string }) {
  const { sunset, sunrise } = sunTimesFor(posterDate);
  // -1 = no forecast showing; each tap advances, the last wraps back to -1.
  const [forecast, setForecast] = useState(-1);
  return (
    <button
      type="button"
      onClick={() =>
        setForecast((f) => ((f + 2) % (MOSQUITO_FORECAST.length + 1)) - 1)
      }
      className="block text-left text-xs"
      style={{ color: 'var(--hg-soft)' }}
    >
      ☀️ Sunset <span className="hg-time">{sunset}</span>ish · sunrise{' '}
      <span className="hg-time">{sunrise}</span>ish — the sun is also doing
      weird hours.
      {forecast >= 0 && (
        <span className="mt-1 block">{MOSQUITO_FORECAST[forecast]}</span>
      )}
    </button>
  );
}

export function TonightView({
  data,
  clock,
  posterDate,
  live = true,
}: {
  data: HerrangData;
  clock: ClockState;
  /** Which poster to render. Defaults to the one in force now; the "next
   *  day" tab passes tomorrow's poster date. */
  posterDate?: string;
  /** False for a read-only preview of a future day: no running/next cards,
   *  no progress scrims, no "ends in" math — nothing is running yet. Gated
   *  structurally rather than by faking the clock, which would produce wrong
   *  "ends in" numbers if the pattern were reused. */
  live?: boolean;
}) {
  // Across-the-room mode: which running event (if any) is currently blown
  // up full-screen. Lives here, not in BigNow, so closing it is just
  // setting it back to null.
  const [bigNow, setBigNow] = useState<DailyEvent | null>(null);
  // The stealing warrants, opened by the little teal band below. See
  // StealingWarrants.tsx — it's a secret, so no hint it opens anything.
  const [warrantsOpen, setWarrantsOpen] = useState(false);

  const date = posterDate ?? clock.posterDate;
  const daily = dailyFor(data.dailies, date);

  if (!daily) {
    return (
      <div className="flex flex-col gap-3">
        <BigSay
          title="Tonight's program isn't up yet."
          sub={
            <>
              Check the notice board (or{' '}
              {/* Yes, the nag button is real. It sends an actual email. */}
              <a
                className="font-bold underline"
                href="mailto:herrang@walagran.com?subject=Nag%3A%20tonight%27s%20poster%3F&body=The%20notice%20board%20has%20it.%20The%20app%20doesn%27t.%20You%20know%20what%20to%20do."
              >
                nag Ranveer
              </a>
              ).
            </>
          }
        />
        <SunLine posterDate={date} />
        <StealableBand onOpen={() => setWarrantsOpen(true)} />
        {warrantsOpen && (
          <StealingWarrants onClose={() => setWarrantsOpen(false)} />
        )}
      </div>
    );
  }

  const stream = tonightStream(daily);
  // Live for the whole poster window (08:00 today through 07:59 tomorrow),
  // not just party hours: when `live`, `daily` is the currently active poster
  // (`dailyFor` resolves via `clock.posterDate`), and daytime specials like
  // Yoga can genuinely be running well before the night program starts.
  const nowPM = clock.posterMinutes;

  const running = live ? runningEvents(daily, nowPM) : [];

  // Finished events sink to the bottom so the top of the stream is always
  // "what's next", not a scroll past everything you already missed. Preview
  // days archive nothing — nothing has happened yet.
  const { current, over } = live
    ? splitStream(stream, nowPM)
    : { current: stream, over: [] };

  // Within the live stream, what's next reads first: already-running groups
  // sink below the upcoming ones (the Now cards above announce them anyway),
  // so the first block on the poster is the next thing to happen — which is
  // also why there's no separate "Next · …" line anymore. Group starts are
  // uniform per group, so this split never tears a group apart.
  const upcoming = live ? current.filter((g) => g.startPM > nowPM) : current;
  const stillGoing = live ? current.filter((g) => g.startPM <= nowPM) : [];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="hg-display text-2xl">{daily.title}</h2>

      {/* Untimed specials only — anything with a start time now lives in
          the stream below, at its actual slot. These have nowhere to go
          on a timeline (e.g. "Bedlam Jam, after live music"), so they
          stay pinned. */}
      {daily.specials
        .filter((s) => !s.start)
        .map((s) => (
          <section
            key={s.title}
            className="p-4"
            style={{
              background: 'var(--hg-special)',
              color: 'var(--hg-on-special)',
              borderRadius: 'var(--hg-radius)',
            }}
          >
            <h3 className="hg-display text-xl">{s.title}</h3>
            <p className="mt-1 text-sm">
              {s.venue ? venueLabel(data.venues, s.venue) : (s.location ?? '')}
              {(s.venue || s.location) && s.detail ? ' — ' : ''}
              {s.detail ?? ''}
            </p>
          </section>
        ))}

      {/* The Now cards, night flavor: one card per running event, then next.
          Same elapsed-time scrim as the stream cards, but tinted with the
          event's kind color instead of a dark overlay — these sit on the
          neutral --hg-card background, not a vivid block, so a black scrim
          would vanish against it in night mode. */}
      {live && running.length > 0 && (
        <div className="flex flex-col gap-3">
          {running.map((e) => {
            const startPM = toPosterMinutes(e.start);
            const endPM = e.end ? toPosterMinutes(e.end) : undefined;
            const elapsedPct =
              endPM !== undefined
                ? Math.round(((nowPM - startPM) / (endPM - startPM)) * 100)
                : 0;
            return (
              <button
                key={`${e.title}-${e.start}`}
                type="button"
                onClick={() => setBigNow(e)}
                className="relative overflow-hidden p-5 text-left"
                style={{
                  background: 'var(--hg-card)',
                  border: '1px solid var(--hg-ink)',
                  borderRadius: 'var(--hg-radius)',
                }}
              >
                {endPM !== undefined && (
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${elapsedPct}%`, background: kindColor(e.kind), opacity: 0.15 }}
                  />
                )}
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="hg-display text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: kindColor(e.kind) }}
                    >
                      {kindLabel(e.kind)}
                    </span>
                    <Chip filled>
                      {endsChip(nowPM, endPM, e.openEnd)}
                    </Chip>
                  </div>
                  <h3 className="hg-display mt-2 text-xl">{e.title}</h3>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--hg-soft)' }}>
                    {eventLocation(data.venues, e)}
                  </p>
                  <p className="hg-display mt-2 text-[10px] tracking-wider" style={{ color: 'var(--hg-soft)' }}>
                    tap to go big
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {/* The stream, next-first. No separate now-line — the currently
          running card(s) carry their own progress scrim instead (see
          EventBlock) and sit under "Still going" below. The headings only
          exist live: a preview day is all one plain program, nothing on it
          is "next" yet. */}
      {upcoming.length > 0 && (
        <>
          {live && (
            <p className="hg-display text-xs" style={{ color: 'var(--hg-soft)' }}>
              What&apos;s next
            </p>
          )}
          <ol className="flex flex-col gap-3">
            {upcoming.map((group) => (
              <li key={group.start}>
                <StreamBlock group={group} data={data} live={live} nowPM={nowPM} />
              </li>
            ))}
          </ol>
        </>
      )}

      {stillGoing.length > 0 && (
        <>
          <p className="hg-display text-xs" style={{ color: 'var(--hg-soft)' }}>
            Still going
          </p>
          <ol className="flex flex-col gap-3">
            {stillGoing.map((group) => (
              <li key={group.start}>
                <StreamBlock group={group} data={data} live={live} nowPM={nowPM} />
              </li>
            ))}
          </ol>
        </>
      )}

      {live && current.length === 0 && over.length > 0 && (
        <BigSay title="That's the whole poster, danced." />
      )}

      {/* The archive: everything already over, in order, folded away at the
          bottom. Same cards, still dimmed — history, not a second program. */}
      {over.length > 0 && (
        <details className="group">
          <summary
            className="hg-display flex cursor-pointer list-none items-center gap-1.5 text-xs"
            style={{ color: 'var(--hg-soft)' }}
          >
            <span className="inline-block transition-transform group-open:rotate-90">
              ▸
            </span>
            Already happened
          </summary>
          <ol className="mt-3 flex flex-col gap-3">
            {over.map((group) => (
              <li key={group.start}>
                <StreamBlock group={group} data={data} live={live} nowPM={nowPM} />
              </li>
            ))}
          </ol>
        </details>
      )}

      {daily.note && (
        <p className="text-xs" style={{ color: 'var(--hg-soft)' }}>
          {daily.note}
        </p>
      )}

      <SunLine posterDate={date} />
      <StealableBand onOpen={() => setWarrantsOpen(true)} />

      {bigNow && (
        <BigNow
          event={bigNow}
          venues={data.venues}
          clock={clock}
          onClose={() => setBigNow(null)}
        />
      )}
      {warrantsOpen && (
        <StealingWarrants onClose={() => setWarrantsOpen(false)} />
      )}
    </div>
  );
}

function StreamBlock({
  group,
  data,
  live,
  nowPM,
}: {
  group: StreamGroup;
  data: HerrangData;
  live: boolean;
  nowPM: number;
}) {
  return (
    <div className="flex gap-3">
      <span className="hg-display hg-time w-14 shrink-0 pt-1 text-lg">
        {group.start}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {group.events.map((e) => (
          <EventBlock key={`${e.title}-${e.venues.join()}`} event={e} data={data} live={live} nowPM={nowPM} />
        ))}
      </div>
    </div>
  );
}

function EventBlock({
  event: e,
  data,
  live,
  nowPM,
}: {
  event: DailyEvent;
  data: HerrangData;
  live: boolean;
  nowPM: number;
}) {
  const startPM = toPosterMinutes(e.start);
  const endPM = e.end ? toPosterMinutes(e.end) : undefined;
  const over = live && endPM !== undefined && nowPM >= endPM;
  // Currently running, with a known end: shade the elapsed portion from the
  // left so what's still bright is what's still left — a stand-in for the
  // now-line, right on the card it applies to instead of floating between
  // rows. Skipped for TBA/mystery cards (no fill to shade over).
  const runningNow = live && !e.tba && endPM !== undefined && nowPM >= startPM && nowPM < endPM;
  const elapsedPct = runningNow
    ? Math.round(((nowPM - startPM) / (endPM! - startPM)) * 100)
    : 0;
  const hasVenue = e.venues.length > 0;
  // Some ex-specials (Queer Meet Up, Balboa Square Competition) have no
  // registry venue — their location lives in `location` (or, for older
  // data that predates that field, `detail`) instead.
  const venuesLabel = hasVenue
    ? e.venues.length === 1
      ? venueLabel(data.venues, e.venues[0])
      : e.venues.map((v) => venueName(data.venues, v)).join(' + ')
    : (e.location ?? e.detail ?? '');
  // `detail` is a genuine standalone description — as opposed to already
  // doing double duty as the venue-less location above — whenever there's
  // a registry venue, or a separate `location` covered that instead.
  const detailIsDescription = Boolean(e.detail) && (hasVenue || Boolean(e.location));
  const showDetailRow = e.theme || e.tba || detailIsDescription;

  return (
    <div
      className="relative overflow-hidden p-4"
      style={{ ...blockStyle(e.kind, e.tba), ...(over ? { opacity: 0.4 } : null) }}
    >
      {runningNow && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ width: `${elapsedPct}%`, background: 'rgba(0,0,0,0.28)' }}
        />
      )}
      <div className="relative z-10">
        <span
          className="hg-display block text-[11px] font-bold uppercase tracking-wider"
          style={{ opacity: 0.65 }}
        >
          {kindLabel(e.kind)}
        </span>
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="hg-display min-w-0 text-lg">{e.title}</h4>
          <span className="hg-time shrink-0 text-sm font-bold">
            {e.start}–{e.end ?? '?'}
          </span>
        </div>
        <p className="mt-0.5 text-sm font-semibold">{venuesLabel}</p>
        {showDetailRow && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {e.theme && <Chip>{e.theme}</Chip>}
            {e.tba && <Chip>TBA</Chip>}
            {(e.tba || detailIsDescription) && (
              <span className="italic">
                {e.detail ?? 'announced at the Variety Revue'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

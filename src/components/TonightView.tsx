'use client';

// Night mode: tonight's program as a single chronological stream. The
// poster's venue-columns × hour-rows grid dies on a phone — here every
// block carries its own venue instead. Timed specials are merged into the
// stream at their actual slot; only specials with no start time (can't be
// placed on a timeline) stay pinned as red cards. TBA items render as
// mystery cards. Currently-running cards carry their own progress scrim
// instead of a separate now-line — see EventBlock.

import { useState } from 'react';
import type { DailyEvent, HerrangData } from '@/lib/herrang/types';
import {
  endsChip,
  relativeChip,
  toPosterMinutes,
  type ClockState,
} from '@/lib/herrang/time';
import { sunTimesFor } from '@/lib/herrang/sun';
import {
  dailyFor,
  eventLocation,
  tonightStream,
  venueLabel,
  venueName,
  type StreamGroup,
} from '@/lib/herrang/schedule';
import { blockStyle, kindColor, kindLabel, BigSay, Chip } from './bits';
import { BigNow } from './BigNow';

/** The one quiet line about how little dark there is to work with tonight. */
function SunLine({ posterDate }: { posterDate: string }) {
  const { sunset, sunrise } = sunTimesFor(posterDate);
  return (
    <p className="text-xs" style={{ color: 'var(--hg-soft)' }}>
      ☀️ Sunset <span className="hg-time">{sunset}</span>ish · sunrise{' '}
      <span className="hg-time">{sunrise}</span>ish — the sun is also doing
      weird hours.
    </p>
  );
}

export function TonightView({
  data,
  clock,
}: {
  data: HerrangData;
  clock: ClockState;
}) {
  // Across-the-room mode: which running event (if any) is currently blown
  // up full-screen. Lives here, not in BigNow, so closing it is just
  // setting it back to null.
  const [bigNow, setBigNow] = useState<DailyEvent | null>(null);

  const daily = dailyFor(data.dailies, clock.posterDate);

  if (!daily) {
    return (
      <div className="flex flex-col gap-3">
        <BigSay
          title="Tonight's program isn't up yet."
          sub="Check the notice board (or nag Ranveer)."
        />
        <SunLine posterDate={clock.posterDate} />
      </div>
    );
  }

  const stream = tonightStream(daily);
  // "Live" for the whole poster window, not just the party hours: the poster's
  // night genuinely runs through 07:59 the next morning, so the 04:00–08:00
  // tail still needs the running/past treatment — otherwise a 3am check-in
  // freezes with nothing ever marked as over or in progress. Stays false
  // outside that window (checking Tonight ahead of time during the day),
  // since nothing has started yet.
  const live = clock.mode === 'night' || clock.mode === 'weird';
  const nowPM = clock.posterMinutes;

  const running = live
    ? stream
        .flatMap((g) => g.events)
        .filter((e) => {
          const start = toPosterMinutes(e.start);
          const end = e.end ? toPosterMinutes(e.end) : undefined;
          return nowPM >= start && (end === undefined ? e.openEnd : nowPM < end);
        })
    : [];
  const nextGroup = live ? stream.find((g) => g.startPM > nowPM) : undefined;

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
              {s.venue ? `${venueLabel(data.venues, s.venue)}` : ''}
              {s.venue && s.detail ? ' — ' : ''}
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
      {live && nextGroup && (
        <p className="text-sm font-semibold" style={{ color: 'var(--hg-soft)' }}>
          <span className="hg-display text-xs">Next&nbsp;·&nbsp;</span>
          {nextGroup.events
            .map((e) => {
              const loc = eventLocation(data.venues, e);
              return loc ? `${e.title} (${loc})` : e.title;
            })
            .join(' + ')}{' '}
          — {relativeChip(nowPM, nextGroup.startPM)}
        </p>
      )}

      {/* The stream. No separate now-line — the currently running card(s)
          carry their own progress scrim instead (see EventBlock). */}
      <ol className="flex flex-col gap-3">
        {stream.map((group) => (
          <li key={group.start}>
            <StreamBlock group={group} data={data} live={live} nowPM={nowPM} />
          </li>
        ))}
      </ol>

      {daily.note && (
        <p className="text-xs" style={{ color: 'var(--hg-soft)' }}>
          {daily.note}
        </p>
      )}

      <SunLine posterDate={clock.posterDate} />

      {bigNow && (
        <BigNow
          event={bigNow}
          venues={data.venues}
          clock={clock}
          onClose={() => setBigNow(null)}
        />
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
  // registry venue — their location lives in `detail` instead.
  const venuesLabel = hasVenue
    ? e.venues.length === 1
      ? venueLabel(data.venues, e.venues[0])
      : e.venues.map((v) => venueName(data.venues, v)).join(' + ')
    : (e.detail ?? '');
  const showDetailRow = e.theme || e.tba || (e.detail && hasVenue);

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
            {(e.tba || (e.detail && hasVenue)) && (
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

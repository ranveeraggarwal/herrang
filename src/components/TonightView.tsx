'use client';

// Night mode: tonight's program as a single chronological stream with a
// moving now-line. The poster's venue-columns × hour-rows grid dies on a
// phone — here every block carries its own venue instead. Timed specials
// are merged into the stream at their actual slot; only specials with no
// start time (can't be placed on a timeline) stay pinned as red cards.
// TBA items render as mystery cards.

import type { DailyEvent, HerrangData } from '@/lib/herrang/types';
import {
  endsChip,
  fromPosterMinutes,
  relativeChip,
  toPosterMinutes,
  type ClockState,
} from '@/lib/herrang/time';
import {
  dailyFor,
  eventLocation,
  tonightStream,
  venueLabel,
  venueName,
  type StreamGroup,
} from '@/lib/herrang/schedule';
import { blockStyle, kindColor, kindLabel, BigSay, Chip } from './bits';

export function TonightView({
  data,
  clock,
}: {
  data: HerrangData;
  clock: ClockState;
}) {
  const daily = dailyFor(data.dailies, clock.posterDate);

  if (!daily) {
    return (
      <BigSay
        title="Tonight's program isn't up yet."
        sub="Check the notice board (or nag Ranveer)."
      />
    );
  }

  const stream = tonightStream(daily);
  // "Live" for the whole poster window, not just the party hours: the poster's
  // night genuinely runs through 07:59 the next morning, so the 04:00–08:00
  // tail still needs now-line/past-dimming — otherwise a 3am check-in freezes
  // with nothing ever marked as over. Stays false outside that window
  // (checking Tonight ahead of time during the day), since nothing has
  // started yet.
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

      {/* The Now cards, night flavor: one card per running event, then next. */}
      {live && running.length > 0 && (
        <div className="flex flex-col gap-3">
          {running.map((e) => (
            <section
              key={`${e.title}-${e.start}`}
              className="p-5"
              style={{
                background: 'var(--hg-card)',
                border: '1px solid var(--hg-ink)',
                borderRadius: 'var(--hg-radius)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="hg-display text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: kindColor(e.kind) }}
                >
                  {kindLabel(e.kind)}
                </span>
                <Chip filled>
                  {endsChip(nowPM, e.end ? toPosterMinutes(e.end) : undefined, e.openEnd)}
                </Chip>
              </div>
              <h3 className="hg-display mt-2 text-xl">{e.title}</h3>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--hg-soft)' }}>
                {eventLocation(data.venues, e)}
              </p>
            </section>
          ))}
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

      {/* The stream. */}
      <ol className="flex flex-col gap-3">
        {stream.map((group, i) => {
          const prevPM = i === 0 ? -Infinity : stream[i - 1].startPM;
          const showNowLine = live && nowPM >= prevPM && nowPM < group.startPM;
          return (
            <li key={group.start} className="flex flex-col gap-3">
              {showNowLine && <NowLine nowPM={nowPM} />}
              <StreamBlock group={group} data={data} live={live} nowPM={nowPM} />
            </li>
          );
        })}
        {live && stream.length > 0 && nowPM >= stream[stream.length - 1].startPM && (
          <li>
            <NowLine nowPM={nowPM} />
          </li>
        )}
      </ol>

      {daily.note && (
        <p className="text-xs" style={{ color: 'var(--hg-soft)' }}>
          {daily.note}
        </p>
      )}
    </div>
  );
}

function NowLine({ nowPM }: { nowPM: number }) {
  return (
    <div className="flex items-center gap-2" aria-label="current time">
      <span
        className="hg-display hg-time text-xs"
        style={{ color: 'var(--hg-special)' }}
      >
        Now {fromPosterMinutes(nowPM)}
      </span>
      <div className="h-0.5 flex-1" style={{ background: 'var(--hg-special)' }} />
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
  const endPM = e.end ? toPosterMinutes(e.end) : undefined;
  const over = live && endPM !== undefined && nowPM >= endPM;
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
      className="p-4"
      style={{ ...blockStyle(e.kind, e.tba), ...(over ? { opacity: 0.4 } : null) }}
    >
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
  );
}

# Time, in full

`src/lib/herrang/time.ts` is the source of truth — this file is the
assumptions behind it written out, so they're findable instead of
re-derived (or re-broken) every time someone touches a date. If you're
about to edit anything involving a clock, a class time, or a date string,
read this first.

## The core assumption: the camp day doesn't end at midnight

It ends when the DJs stop, somewhere around 04:00. Everything below exists
to make that true in code without turning every comparison into a
timezone-aware mess.

## The three clocks

- **Day** 08:00–19:10 — classes.
- **Night** 19:10–04:00 — the party. Covers both "just after the last
  class" (19:10–23:59) and the post-midnight tail (00:00–03:59).
- **Weird hours** 04:00–08:00 — one "go to bed" card. Nothing is
  scheduled; this is the dead zone between the party ending and the next
  day's classes.

`modeFor(minutes)` computes this from **raw wall-clock minutes** and the
boundaries are half-open with no gaps: `[480,1150)` day, `[1150,1440) ∪
[0,240)` night, `[240,480)` weird.

## Poster dates

A poster (the physical thing pinned up at camp, one per day) covers
**08:00 → 07:59 the next morning**. A time printed on a poster after
midnight — e.g. "02:00" on Saturday's poster, meaning the party runs into
Sunday morning — is **stored exactly as printed** ("02:00") but that
instant is really on the *next calendar day*.

- `clock.posterDate`: which poster is in force right now. Before 08:00,
  you're still on yesterday's poster.
- `clock.dateISO`: the real calendar date. Used anywhere the UI needs to
  answer "what day is it" without looking stuck during the 04:00–08:00
  tail (the header, mainly).

Never invent `25:00`/`26:00`-style notation or ISO datetimes in data
files. Times are always plain `HH:MM` as printed on the poster.

## Week transitions flip at midnight — deliberately NOT the poster date

Multiple camp weeks can be committed at once (`week2.json`, `week3.json`,
…) and `weekFor(weeks, dateISO)` picks the one in force: the first week
whose `end` is on or after the **calendar date**. This is one of the few
legitimate `dateISO` uses, and the exception to the "everything compares
on the poster timeline" rule — feeding `posterDate` here would delay the
flip to 08:00 on arrival Saturday for no benefit. The split works because
the two week-keyed systems don't overlap at the boundary:

- The outgoing week's Friday-night party lives in the **Tonight** view,
  which is keyed by `posterDate` — that stays on Friday until 08:00, so
  the party is untouched by the week flip.
- The **classes** machinery (Today view, track picker, day counter, wrap
  card) flips to the incoming week at midnight — and the outgoing week
  has had no classes since Friday 19:10, so nothing real is lost.

Before camp this yields the first week; after the last class it stays on
the final week so the wrap state has something to point at. On transition
days both crowds are physically at camp, but only one week's classes are
running — that's the week the app shows, and the wrap card points forward
to the next one. (The track-picker auto-prompt for a week with no stored
selection additionally waits for day mode, so the week flip doesn't pop a
picker over the party at midnight.)

## Two flavors of minutes — this is the whole game

- **`toMinutes(hhmm)`** — minutes since local midnight. Resets to 0 at
  midnight, same as a naive `getHours()*60+getMinutes()`.
- **`toPosterMinutes(hhmm)`** — minutes since 08:00 of the poster date.
  Times before 08:00 get +1440 added, so they land *after* the day's
  daytime hours instead of wrapping back to near-zero. This makes
  cross-midnight ordering an ordinary `<`/`>=` comparison.
- **`clock.minutes`** — raw wall-clock (mirrors `toMinutes`).
- **`clock.posterMinutes`** — continuous across midnight (mirrors
  `toPosterMinutes`).

**Rule: any comparison against a class, special, or event time uses the
poster-timeline pair (`toPosterMinutes` / `clock.posterMinutes`), never
the raw pair.** The raw pair exists for exactly two legitimate uses,
both of which want the *actual* clock, not the poster-shifted one:

- `isNightGround(clock.minutes)` — the day/night ground color follows
  the real clock (20:00–08:00), independent of which poster is showing.
- `clock.dateISO` — the header's "what day is it" line, and
  `weekFor(weeks, dateISO)`: the camp week flips at midnight, not at
  08:00 (see "Week transitions" below).

Everything else — `nowAndNextClass`, `isWeekWrapped`, `isPast`,
`relativeChip`, `endsChip`, the finished-item dimming in `TodayView` and
`WeekView`, the running/elapsed math in `TonightView` — takes poster
minutes. Passing the wrong flavor is a real bug, not a style nit: raw
minutes reset to a small number right after midnight, so a class that
ended 8 hours ago reads as numerically "in the future." This has already
happened twice (see git history around "day-end-assumptions-timing") —
once in `TodayView`/`WeekView`, once in `schedule.ts`.

There's no type-level guard against this today (the two flavors are both
plain `number`). That's a known soft spot, not a design endorsement — see
the code review from the timing fix for the branded-type option, deferred
as a separate decision.

## The data invariant everything quietly leans on

Class (`WeekClass`) and week-special (`WeekSpecial`) times are always in
the 08:00–19:10 daytime window — nothing in the master schedule crosses
midnight. `toMinutes(x) === toPosterMinutes(x)` for all of them today,
which is *why* code that (mistakenly) used raw minutes against class
times still mostly worked. Only `DailyEvent` (the nightly program — DJs,
shows, socials) genuinely has after-midnight entries, and only that path
was originally written with `toPosterMinutes` from the start.

If an after-midnight whole-camp special is ever ingested into
`week.specials`, this invariant breaks — but the comparisons have since
been switched to `toPosterMinutes` throughout, so it'll be handled
correctly rather than silently misdimmed.

## Timezone: assumed, not computed

Europe/Stockholm is assumed equal to device time. There is no runtime
timezone math anywhere in the page — `new Date()`, `getHours()`,
`getMinutes()` are read as-is. This is a deliberate simplification, not
an oversight: the app is only ever used at camp, on a device already set
to local time.

**The one exception is the ICS subscription feed** (`src/lib/herrang/ical.ts`,
`src/lib/ical.ts`): it emits real `DTSTART;TZID=Europe/Stockholm` values
with a proper `VTIMEZONE` block (CET/CEST `RRULE`s), because a calendar
subscriber might be reading it from anywhere, at any time of year. It
only ever iterates `week.classes` and `week.specials` — both daytime — so
it never has to reason about the poster-date midnight shift. If a night
program event were ever exported, it would need `posterDate + 1` handling
that doesn't exist yet.

## DST doesn't come up, on purpose

Camp runs in July; Sweden's DST switches happen in late March and late
October, so no transition ever occurs mid-camp. Two things keep this from
ever mattering even off-season:

- Date-string stepping (`src/lib/dates.ts`: `addDays`, `diffDays`,
  `formatCompactWeekdayDate`) is done via `setUTCDate`/`getUTC*` on a
  midnight-UTC-anchored `Date`, never epoch or local-time arithmetic — so
  a day is always a day, regardless of what a real DST transition would
  do to elapsed milliseconds.
- The ICS feed's `VTIMEZONE` carries real CET/CEST rules, so a
  subscriber's calendar app renders correct local times year-round even
  though the app itself never thinks about DST.

## Quick reference: which value do I want?

| I need... | Use |
|---|---|
| Compare "now" against a class/special/event time | `clock.posterMinutes` vs `toPosterMinutes(x)` |
| The poster currently in force (for `classesOn`, `dailyFor`, etc.) | `clock.posterDate` |
| The camp week currently in force | `clock.dateISO` via `weekFor` |
| "What calendar day is it" for display | `clock.dateISO` |
| Day/night ground theme | `clock.minutes` via `isNightGround` |
| Step or diff `YYYY-MM-DD` strings | `addDays`/`diffDays` from `src/lib/dates.ts` |

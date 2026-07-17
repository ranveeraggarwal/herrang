# Herräng Companion

Mobile-first, offline-capable companion for Herräng Dance Camp 2026, live at
`herrang.stockholmswing.com`. Next.js (App Router), fully static: the week
schedule and every committed daily program ship in the initial payload, no
backend, no runtime data fetches.

**Read `AGENTS.md` too** — this file covers commands, data, and time-boundary
logic; `AGENTS.md` covers voice and design, and has a cautionary tale about
what happens when an agent "cleans up" the personality by accident. Both
matter equally here.

## The design language

The camp's daily poster *is* the design system: flat saturated color blocks,
chunky uppercase display type, white ground by day / near-black by night.
Color = meaning (green = DJ/live, orange = show, red = specials, teal =
taster, pink = social/jam) — see `src/app/globals.css`. No gradients, no
shadows deeper than 1px, no ornament.

## The three clocks

Read `src/lib/herrang/time.ts` before touching any date/time logic — it's
short and the comments explain the reasoning, but the short version:

For the full list of assumptions this rests on (which "minutes" to
compare against what, the poster-date invariant, timezone/DST handling),
see `TIME.md`. Most time bugs in this app have come from mixing raw
wall-clock minutes with poster-timeline minutes — read it before touching
anything that compares a clock to a class/event time.

- **Day** 08:00–19:10 (classes), **Night** 19:10–04:00 (the party), **Weird
  hours** 04:00–08:00 (a single "go to bed" card).
- A **poster date** runs 08:00 → 07:59 the next morning. Times printed after
  midnight on a poster (e.g. "02:00" on Saturday's poster) are stored exactly
  as printed but land on the *next* calendar day in real time — `time.ts`
  does that shift via `toPosterMinutes`. Never invent `25:00`/`26:00`-style
  notation or ISO datetimes in data files.

## Ingestion ritual (the main job)

When asked to **"ingest today's sheet"** (or a weekly schedule): follow
`data/2026/INGEST.md` — it has the exact prompt, the JSON schemas, and the
transcription rules (faithful transcription, no invented times, `tba`/
`openEnd` flags, specials go in `specials` not `events`). Always run
`npm run validate` and only commit if it passes; fix the data, not the
validator.

## Commands

- `npm run dev` — local dev server
- `npm run validate` — checks all of `data/2026/**` (venue refs, HH:MM
  format, dates, kinds)
- `npm run build` — validate, then `next build`
- `npm run icons` — regenerate PNG icons (only if the mark changes)

## Layout

- `data/2026/venues.json` — canonical venue registry (ids, aliases, areas)
- `data/2026/week<N>.json` — one master class schedule per camp week (all
  tracks). The app picks the week in force by calendar date (`weekFor` in
  `src/lib/herrang/schedule.ts`): the class week flips to the incoming
  week at midnight into arrival Saturday, while the outgoing week's
  Friday-night party keeps rendering from its poster (Tonight is
  poster-date-keyed) — see `TIME.md`. Track ids stay stable across weeks
  (`lh-beg-int` is `lh-beg-int` every week) so ICS subscriptions roll over
  on their own; track picks are stored per week, since groups get
  re-auditioned.
- `data/2026/daily/YYYY-MM-DD.json` — one file per poster/evening program
- `data/2026/INGEST.md` — the ingestion contract (schemas + prompt)
- `src/lib/herrang/` — types, the three-clock time logic, pure selectors,
  ICS feed builder — no I/O, no React, fully testable
- `src/components/` — `HerrangApp` (the client shell: clock, track
  selection, day/night ground) plus `TodayView` / `TonightView` / `WeekView`
  / `SettingsSheet` / `bits.tsx` (shared poster-language primitives)
- `src/app/page.tsx` — static home page, loads data at build time
- `src/app/ics/[track]/route.ts` — per-track calendar subscription feed
- `scripts/validate.mjs` — the data safety net (bare Node, no deps, no
  build step required — can run standalone)

## Guardrails

- `npm run validate` is the safety net for agent-ingested data. A
  hallucinated venue id or malformed time must fail, never ship. `npm run
  build` runs it automatically.
- No runtime data fetches — everything is baked into the static build.
- Unknown event `kind` values should fail validation, not silently render as
  something else — don't extend the enum casually (`dj | show | taster |
  social | jam | special`).
- The app is unofficial: it credits Herräng Dance Camp as the source and
  never claims to be authoritative. Keep the footer disclaimer intact.
- Don't invent schedule data. If a daily poster hasn't been ingested yet,
  `TonightView` already renders an honest "not up yet" state — don't
  fabricate a plausible-looking placeholder day file to fill the gap.

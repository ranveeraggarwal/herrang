# Herräng Companion

Mobile-first, offline-capable companion for Herräng Dance Camp 2026, live at
`herrang.stockholmswing.com`. Static site: repo-as-database, no backend, all
schedule data compiled into the app at build time.

## The one convention that matters

**A Herräng day runs 06:00 → 05:59.** The daily sheet for Sunday 12/7 covers
18:00 Sunday through ~05:00 Monday. Times are stored as `HH:MM` strings exactly
as printed on the sheets; within a day file, any time `< 06:00` means the
following calendar morning. Never invent `25:00` notation or ISO datetimes in
data files.

## Ingestion ritual (the main job)

When asked to **"ingest today's sheet"** (or a weekly schedule):

1. Read the PDF or photo in `inbox/`.
2. Daily activities sheet → `data/days/<date>.yaml` where `<date>` is the
   Herräng day the sheet is for (the *evening's* calendar date). Follow the
   structure of an existing day file. Sections: `events` (the main evening
   grid), `specials` ("Today's Specials" box), `tasters`, `talks`, `notes`
   (free text for handwritten additions).
3. Weekly class schedule → `data/classes/weekN.yaml`. One `slots` entry per
   filled grid cell; empty cells are simply absent. Use `track: all` for
   camp-wide slots; grid times keep their printed dot format (`"10.00-11.10"`).
4. Map venue names via `data/venues.yaml` `aliases` (e.g. "Ballroom" on the
   evening sheet = `fh`). If the sheet names a venue that isn't in the
   registry, **add it to `data/venues.yaml`** with a sensible id and area —
   Herräng invents venues constantly.
5. Fuzzy times ("After live music") → `start_text`, never a fake timestamp.
   Optionally add `after: <slug-of-event-it-follows>` for timeline ordering.
6. Transcribe faithfully. Don't guess at unreadable text — put uncertainties
   in `notes` instead.
7. Run `npm run validate`. **Commit only if it passes.** Fix data, not the
   validator.
8. Commit with a message like `data: ingest 2026-07-12 daily sheet`, delete
   the processed file from `inbox/`, and push — Vercel deploys on push.

## Commands

- `npm run validate` — schema + cross-file checks on all of `data/`
- `npm run build` — validate, then compile `data/**` → `dist/`
- `npm run serve` — serve `dist/` locally on :4173
- `npm run icons` — regenerate PNG icons (only if the mark changes)

## Layout

- `data/venues.yaml` — canonical venue registry (ids, aliases, areas)
- `data/classes/weekN.yaml` — weekly class grids
- `data/days/YYYY-MM-DD.yaml` — daily activity sheets
- `schemas/` — JSON Schemas enforced by validate/build/CI
- `public/` — hand-written app shell (HTML/CSS/JS, service worker)
- `scripts/` — build, validate, serve, icon generation (no bundler)

## Guardrails

- The validator is the safety net for agent-generated data; it also runs in
  CI. A hallucinated venue id or malformed time must fail, never ship.
- No runtime data fetches — everything is baked into the build.
- Unknown `kind` values render as `other` and only warn; don't extend the
  enum casually.
- The app is unofficial: it credits Herräng Dance Camp as the source and
  never claims to be authoritative. Keep it that way.

# Herräng Companion

Unofficial, mobile-first, offline-capable companion app for
[Herräng Dance Camp](https://www.herrang.com) 2026. Answers one question
instantly: **"What's happening next, and where should I be tonight?"**

Live at [herrang.stockholmswing.com](https://herrang.stockholmswing.com).

- **Static and fast** — Next.js App Router, fully static output. No backend,
  no accounts, no runtime data fetches; the week schedule and every daily
  program ship in the page payload.
- **Offline-first PWA** — a service worker precaches the shell after the
  first load. Herräng WiFi is what it is.
- **The poster as design system** — flat saturated color blocks, chunky
  uppercase display type, day/night grounds that follow the clock (or a
  manual override). See `CLAUDE.md` for the palette and the "three clocks"
  time model.
- **Data via Claude Code** — the official daily posters and weekly class
  schedule are parsed into JSON under `data/2026/`, validated, and
  committed. See `data/2026/INGEST.md` for the ingestion ritual.
- **Calendar subscriptions** — every track gets a `webcal://` ICS feed
  (`/ics/<trackId>`) for native calendar notifications with zero
  connectivity at the camp.

## Develop

```sh
npm install
npm run validate   # check all data files
npm run dev        # http://localhost:3000
npm run build      # validate, then next build
```

Deploys automatically on push to `main` (Vercel — Next.js is auto-detected,
no custom build config needed), with a preview deployment on every PR once
the repo is connected in the Vercel dashboard.

**CI setup (one-time):** the session token can't push workflow files, so the
GitHub Actions data-validation workflow lives at `ci/validate.yml`. Move it
into place to enable it:

```sh
mkdir -p .github/workflows && git mv ci/validate.yml .github/workflows/validate.yml
```

All programme data belongs to Herräng Dance Camp; the printed posters are
authoritative. This app is an unofficial companion.

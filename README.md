# Herräng Companion

Unofficial, mobile-first, offline-capable companion app for
[Herräng Dance Camp](https://www.herrang.com) 2026. Answers one question
instantly: **"What's happening next, and where should I be tonight?"**

Live at [herrang.stockholmswing.com](https://herrang.stockholmswing.com).

- **Static and fast** — repo-as-database, built at deploy time, hosted on
  Vercel. No backend, no accounts, no runtime data fetches.
- **Offline-first PWA** — fully functional with zero connectivity after a
  single load. Herräng WiFi is what it is.
- **Honest about staleness** — if today's sheet isn't loaded yet, it says so
  instead of showing yesterday's programme.
- **Data via Claude Code** — the official PDFs are parsed into YAML under
  `data/`, validated against JSON Schemas, and committed. See `CLAUDE.md`
  for the ingestion ritual and the 06:00 Herräng-day convention.

## Develop

```sh
npm install
npm run validate   # check all data files
npm run build      # compile data/** → dist/
npm run serve      # http://localhost:4173
```

Deploys automatically on push to `main` (Vercel).

All programme data belongs to Herräng Dance Camp; the printed sheets are
authoritative. This app is an unofficial companion.

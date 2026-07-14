# Daily poster ingestion — the morning ritual

Open Claude Code (phone is fine) → attach today's poster PDF or a photo of the
notice board → paste the prompt below → review the diff → merge. The site is
live in about a minute.

## The prompt

> Convert the attached "A day in Herräng" daily program into
> `data/2026/daily/<date>.json` following the schema in this folder (see
> 2026-07-11.json for a worked example). Rules: transcribe faithfully — every
> block, DJ name, theme star, special, and taster; the poster's grid is drawn
> "ish", not to pixel-perfect scale, so don't over-read it — snap the known
> fixed slots below to their standard times, and round everything else to the
> nearest 15 minutes, favoring clean :00/:30 marks when a box sits between two
> readings; map venue column names via venues.json aliases; mark "TBA"/
> "announced at…" items with `tba: true`; "04–?" style endings get
> `openEnd: true`; put the red specials box into `specials`, not `events`;
> times after midnight stay as printed on the poster; if a special's own text
> states a time (e.g. "classes start 11:20"), also put that time in the
> special's `start` field — don't leave it only in `detail`, or the site
> can't tell the special is over; for a special/event with no registry
> venue, put the meeting point in `location` and the actual description in
> `detail` — never combine both into `detail` alone, since a venue-less
> card's `detail` renders as its location line and a whole paragraph there
> reads as a mislocated card, not a description. Run `npm run validate`, then stop — no
> other file changes.

## Known fixed slots

A few nightly fixtures run the same times every night regardless of where
their box appears to land on the grid — snap to these rather than trusting
the drawn box edges:

- **Variety Revue** — 21:00–22:00 (spans Ballroom, Dansbanan, Library)
- **Library Talk** — 22:00–23:00 (Library)
- **Taster Classes** — 22:00–23:00 (wherever they're hosted that night)

Everything else on the grid (DJ sets, Ramble/guest slots, jams) moves around
these anchors night to night — read those from the box position as usual,
just don't expect them to land on the hour.

## Schemas

### `2026/daily/<date>.json` — one per poster day

```jsonc
{
  "date": "2026-07-11",          // must match the filename
  "weekday": "Saturday",
  "title": "Saturday's Activities",
  "source": "A day in Herräng daily poster",
  "note": "optional free text",
  "events": [                     // the evening grid, chronological-ish
    {
      "title": "DJ Simon",
      "venues": ["fh"],          // registry ids from ../2026/venues.json
      "start": "22:15",           // HH:MM as printed on the poster
      "end": "00:00",             // after-midnight times stay as printed
      "kind": "dj",              // dj | show | taster | social | jam | special
      "theme": "Vinyl set",      // optional — the poster's theme star
      "detail": "optional",
      "tba": true,                // optional — "announced at the Variety Revue"
      "openEnd": true             // optional — "04–?" style endings
    }
  ],
  "specials": [                   // the red specials box, NOT part of events
    {"title": "Bedlam Jam", "venue": "bar-bedlam", "start": "00:00", "end": "03:30", "kind": "jam"},
    // A special with a stated time but no clear end (e.g. a daytime class
    // reminder posted on the evening board) still gets a `start` — the site
    // uses it to grey the card out once that time has passed.
    {"title": "…", "start": "11:20", "detail": "Classes start 11:20 — book now.", "kind": "special"},
    // No registry venue for this one (e.g. "Klubben", "Bike Shop")? Put the
    // meeting point in `location` (rendered plain, like a venue name) and
    // keep `detail` for the actual description (rendered italic). Don't
    // cram both into `detail` — a venue-less card whose `detail` holds a
    // whole paragraph renders that paragraph as the *location line*, not
    // italicized, which reads as inconsistent next to cards that do have a
    // registry venue.
    {"title": "…", "location": "Klubben", "start": "18:00", "end": "19:10", "detail": "Full description here.", "kind": "special"}
  ]
}
```

Cross-midnight rule: anything before 08:00 belongs to the poster's date's
night (02:00 on the 11th's poster = 02:00 on the 12th in real time). Store as
printed; the site's now-logic handles the shift.

### `2026/week2.json` — the week's master class schedule

```jsonc
{
  "week": 2,
  "year": 2026,
  "start": "2026-07-11",         // week window, inclusive
  "end": "2026-07-17",
  "tracks": [
    // Split levels (Interm, Int-Adv) appear as two tracks sharing a `level`,
    // distinguished by `group`. Un-split tracks omit `group`.
    {"id": "interm-g1", "name": "Intermediate — Group 1", "level": "Intermediate", "group": 1}
  ],
  "classes": [
    {
      "track": "interm-g1",      // track id from tracks[]
      "date": "2026-07-13",
      "start": "09:00",
      "end": "10:10",
      "venue": "rb",             // registry id
      "title": "optional class title/teachers",
      "labels": ["Audition"]      // optional: Audition, Culture Class, …
    }
  ],
  "specials": [                   // whole-camp items on class days (e.g. Wednesday)
    {"title": "…", "date": "2026-07-15", "start": "14:00", "venues": ["fh", "db"], "detail": "…", "kind": "special"}
  ]
}
```

### `2026/venues.json` — the registry

Ids are the canonical reference everywhere else. `aliases` absorb the
poster's column-name spellings (Ballroom→fh, Dansbanan→db). `area` feeds the
"Venue · Area" formula on the site.

## Validation

`npm run validate` (`scripts/validate.mjs`) checks every file above: venue
references resolve, times are HH:MM, kinds are legal, filenames match dates.
Run it before committing a new daily file — `npm run build` runs it
automatically and fails the build on any error.

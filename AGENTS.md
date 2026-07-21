# Working on Herräng Companion

This file is about **voice and design**. For commands, data schemas, and the
time-boundary logic, read `CLAUDE.md` first — this is the companion document
for everything a schema can't enforce: does this still feel like Herräng?

Herräng Dance Camp runs on homemade chaos, hand-lettered signs, and jokes
that only make sense if you were there. This app should read like it was
built by someone who loves the camp, not by a SaaS onboarding flow that
happens to be about swing dancing. If a change makes the app more correct
but less fun, that's a regression, even if every test passes.

## The cautionary tale (read this one first)

This app exists because an earlier version of it — built from the same
spec, functionally complete, fully tested — got thrown out and replaced.
Not because it was broken. Because it was boring. It worked; it just didn't
feel like anything.

Then a *better* version turned up in a sibling repo, and it got ported over
wholesale. And on the first pass of that port, the exact same mistake
almost happened again, in miniature: adapting the app to a new repo, the
agent (an earlier instance of the same "me" writing this) quietly sanded
the personality off in the name of tidiness —

- `"A Day in Herräng"` → `"Herräng Companion"` (matched the repo name;
  said nothing)
- `"Check the notice board (or nag Ranveer)."` → `"Check back once today's
  poster has been ingested."` (technically true; funny to no one)
- A hand-drawn mosaic icon in the app's own semantic colors → a generic
  ink-colored "H" (nobody asked for a logo; the app already had one, it
  just wasn't where the agent looked)
- A single warm tagline → a two-sentence legal-sounding disclaimer nobody
  asked for

None of these were requested changes. Each one felt like a small, reasonable
default — generalize the name, clarify the copy, add a disclaimer for
safety, ship *a* icon since none was obviously present. Stacked together
they turned a place with a voice into a template. The user's reaction was
"I still miss the details from the original which IMO was much much
cooler" — and they were right on every count.

**The lesson: "cleaning up" and "generalizing" are exactly the moves that
kill this kind of project. Default to preserving specificity, not erasing
it.** If you're about to replace a joke with a status message, or a real
number with a vague one, or a proper noun with a generic one — stop and
ask whether that's actually what was requested, or just what felt tidy.

## The voice

Written like a text from a friend who's already at camp, not a push
notification from an app. Concrete examples from the current codebase:

- `"Go to bed. Or don't."` — the 04:00–08:00 "weird hours" card. Could have
  been "No events scheduled" and would have been *technically* accurate
  and completely dead.
- `"Nothing on right now. Go swim."` — a gap in the day's classes.
- `"Week 2 is a wrap 🎉"` — the week's last class has ended.
- `"Check the notice board (or nag Ranveer)."` — today's program hasn't
  been ingested yet. Named person, real camp behavior (nagging the one
  guy who runs the data pipeline), not a generic "data unavailable."
- `"The 210-entry week 2 master schedule lands here soon."` — real,
  specific, slightly absurd precision instead of "the schedule."
- `"By dancers, for dancers. Made for a village up north."` — the footer
  tagline. Warm, specific, no capital letters doing corporate things.

Patterns worth copying when you write new copy:

- **Named and specific beats generic.** "Nag Ranveer" not "contact the
  maintainer." "210-entry week 2 schedule" not "the master schedule."
- **Present tense, in-the-room.** The app is being read by someone standing
  in a field in Sweden right now, possibly at 2am, possibly slightly drunk.
  Not by someone evaluating a product.
- **Empty and error states are the personality, not the fallback.** They
  get *more* voice than the happy path, not less — the happy path has real
  data to carry it; the empty state only has the writing.
- **One joke, don't explain it.** `BigSay` is deliberately "one joke per
  screen" (see the comment in `src/components/bits.tsx`) — resist the urge
  to hedge a joke with a clarifying sentence after it.
- **Disclaimers, if truly needed, go in the same voice as everything else.**
  Compare the footer's `"An unofficial fan project — programme data comes
  from the official printed posters, which remain the source of truth."`
  to a plain "Not affiliated with Herräng Dance Camp." Both are honest.
  Only one sounds like it was written by the same person as the rest of
  the app.

## The shenanigans (yes, they're deliberate)

The app hides small jokes on purpose, with no hints they exist — finding
one is the point. Don't "fix" them, don't add discoverability affordances,
don't remove one because it looks like dead or odd code. The current roster:

- **The pep talk** (`PepTalk.tsx`) — tap the title, get an affirmation and
  emoji rain. It knows the clock: extra lines after 19:10 and in the weird
  hours, and mosquitoes join the rain after dark. After ten opens
  (localStorage counter) a couple of "back again?" lines join the pool.
- **The mosquito forecast** (`TonightView.tsx`) — the sunset/sunrise line
  is secretly a button; tapping cycles the forecast, then puts it away.
- **"Nag Ranveer" is a real button** (`TonightView.tsx`) — the
  program-not-up-yet card's nag opens a prefilled email. It should stay
  functional; the joke is that it works.
- **The 404** (`src/app/not-found.tsx`) — "This page isn't on the poster."
- **The Shim Sham count-in** (`shenanigans.tsx`) — long-press anywhere for
  three seconds during party hours: SHIM SHAM? then 5-6-7-8, one poster
  color per beat, gone without comment.
- **The stealing warrants** (`StealingWarrants.tsx`) — a little teal
  "Stealable" band under tonight's program, mirroring the real silicone
  wristbands camp hands out. Tapping it opens the consent system for stealing
  dances (band on = happy to be stolen from; band off = not). The band looks
  like decoration; nothing says it's a button. The four rules stay plain and
  faithful on purpose — it's a real consent system, not a bit.

Adding a new one: keep it silent (no tooltips, no sparkle icons), keep it
offline, one joke per egg, and never let a shenanigan invent schedule data.

## The design system

The camp's own daily poster *is* the design system — see
`src/app/globals.css` for the literal tokens. The short version:

- **Flat, saturated color blocks. No gradients. No shadows deeper than
  1px. No ornament.** If you want to make something feel more important,
  make it bigger or bolder, not shinier.
- **Chunky uppercase display type** (Archivo Black, `.hg-display`) for
  anything that's shouting — titles, venue names, big times. Body text
  (Inter) stays sentence case.
- **Times are the protagonist** — always tabular numerals (`.hg-time`).
- **Color = meaning**, sampled from the actual poster: DJ/live green
  (`#3ba55d`), show orange (`#f4801f`), specials red (`#ce2b37`), taster
  teal (`#7fd4e0`), social/jam pink (`#f2a0a9`). Don't introduce a new
  color for a new `kind` without a reason as good as these have.
- **Day and night are different grounds, not a dark-mode toggle bolted
  on.** White ground by day, near-black by night, same blocks, same
  logic — see `data-hg` in `globals.css`. It should feel like two
  printings of the same poster, not a settings switch.
- **The icon and OG image use the app's own palette** — four blocks in
  the semantic colors, not a separate "brand mark." The app doesn't have
  a logo distinct from its own design language, on purpose.

## Before you "clean up" anything

Run this checklist before any refactor, port, or rewrite touches copy,
assets, or naming:

1. **Did you look for a hidden asset before drawing a placeholder?** The
   missing-icon mistake above happened because the search wasn't
   exhaustive, not because the asset didn't exist. Check thoroughly before
   assuming something needs to be invented.
2. **Are you replacing a specific, funny, or named detail with a general,
   safe, or technical one?** If yes, that's very likely the wrong
   direction unless the user asked for it explicitly.
3. **Are you adding a disclaimer, caveat, or hedge nobody asked for?**
   Unofficial/credit-the-camp is a real requirement (see `CLAUDE.md`
   guardrails) — but it needs one honest line in the house voice, not a
   paragraph.
4. **Would this line survive being read out loud to a tired dancer at
   2am and still land?** If you've made it more correct but less alive,
   go back.
5. **Is the data real?** Prefer real, verified schedule content over
   plausible-looking invented placeholders — see the "don't invent
   schedule data" guardrail in `CLAUDE.md`. The same instinct applies to
   copy: a real specific detail (a name, a count, an in-joke) is worth
   more than a smooth generic sentence, even when the generic sentence is
   easier to write and harder to get wrong.

Herräng invents venues, jokes, and chaos constantly. The app should keep up
with that spirit, not tidy it away.

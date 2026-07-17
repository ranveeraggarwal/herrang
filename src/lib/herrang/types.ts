// Types for the Herräng Companion. Mirrors the JSON schemas documented in
// data/2026/INGEST.md — that file is the contract; keep the two in sync.

export type EventKind = 'dj' | 'show' | 'taster' | 'social' | 'jam' | 'special';

export interface HerrangVenue {
  id: string;
  name: string;
  aliases?: string[];
  area: string;
  usage?: string[];
}

export interface VenueRegistry {
  venues: HerrangVenue[];
}

/** One block on the evening poster grid. Times are as printed — anything
 * before 08:00 belongs to the poster date's *night*, i.e. the next calendar
 * day in real time. `time.ts` owns that shift. */
export interface DailyEvent {
  title: string;
  venues: string[];
  start: string;
  end?: string;
  kind: EventKind;
  theme?: string;
  /** Free-text meeting point, for the rare event with no registry venue
   * (e.g. an ex-special folded into the stream). Always rendered plain,
   * same slot a venue name would take — never italicized. */
  location?: string;
  detail?: string;
  tba?: boolean;
  openEnd?: boolean;
}

/** The poster's red specials box — pinned above the stream, never inline. */
export interface DailySpecial {
  title: string;
  /** Free-text meeting point when there's no registry `venue` (e.g.
   * "Klubben", "Bike Shop"). Rendered plain, like a venue name — keep it
   * short. Put the actual description in `detail`. */
  location?: string;
  detail?: string;
  venue?: string;
  start?: string;
  end?: string;
  kind?: EventKind;
}

export interface DailyProgram {
  date: string;
  weekday: string;
  title: string;
  source?: string;
  note?: string;
  events: DailyEvent[];
  specials: DailySpecial[];
}

/** A bookable class track. Split levels (Interm, Int-Adv) are two tracks
 * sharing a `level`, distinguished by `group`. */
export interface Track {
  id: string;
  name: string;
  level: string;
  group?: 1 | 2;
}

export interface WeekClass {
  track: string;
  date: string;
  start: string;
  end: string;
  venue: string;
  title?: string;
  teachers?: string;
  labels?: string[];
}

export interface WeekSpecial {
  title: string;
  detail?: string;
  date?: string;
  start?: string;
  end?: string;
  venues?: string[];
  kind?: EventKind;
}

export interface WeekSchedule {
  week: number;
  year: number;
  start: string;
  end: string;
  note?: string;
  tracks: Track[];
  classes: WeekClass[];
  specials: WeekSpecial[];
}

/** Everything the page ships to the client — a few kB of JSON, all static.
 * `weeks` holds every committed master schedule, ordered by start date;
 * `weekFor` in schedule.ts picks the one in force for a poster date. */
export interface HerrangData {
  venues: HerrangVenue[];
  weeks: WeekSchedule[];
  dailies: DailyProgram[];
}

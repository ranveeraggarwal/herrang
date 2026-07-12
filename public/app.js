/* Herräng Companion — single-view app.
   All schedule data is inlined into the shell at build time; everything here
   is client-side rendering against the device clock (works offline).

   The one convention that matters: a Herräng day runs 06:00 → 05:59.
   At 01:30 on Monday morning the current Herräng day is still Sunday. */

(() => {
  'use strict';

  const SCHEDULE = JSON.parse(document.getElementById('schedule-data').textContent);

  const KIND_ICONS = {
    dj: '🎧', live: '🎷', show: '🎭', jam: '🔥',
    talk: '🗣️', class: '🎓', meetup: '👋', other: '✨',
  };

  const DAY_BOUNDARY = 6 * 60;       // 06:00
  const NIGHT_START = 18 * 60;       // 18:00 — the app's two moods switch here

  // ---------- time helpers ----------

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // "HH:MM" → minutes since the 06:00 boundary (times < 06:00 are the
  // following calendar morning, so 01:00 sorts after 23:30).
  function hMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const mins = h * 60 + m;
    return mins < DAY_BOUNDARY ? mins + 24 * 60 : mins;
  }

  function nowHMinutes(now) {
    const mins = now.getHours() * 60 + now.getMinutes();
    return mins < DAY_BOUNDARY ? mins + 24 * 60 : mins;
  }

  // The current Herräng day: shift the clock back 6h, take the date.
  function herrangDay(now) {
    return ymd(new Date(now.getTime() - DAY_BOUNDARY * 60 * 1000));
  }

  const isNight = (now) => {
    const h = now.getHours();
    return h >= 18 || h < 6;
  };

  function fmtCountdown(mins) {
    if (mins < 1) return 'now';
    if (mins < 60) return `in ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `in ${h} h ${m} min` : `in ${h} h`;
  }

  function fmtDayTitle(dayStr, weekNo) {
    const [y, m, d] = dayStr.split('-').map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    return weekNo ? `${label} · Week ${weekNo}` : label;
  }

  // ---------- state ----------

  const TRACK_KEY = 'hc-track-v1';
  const state = {
    track: localStorage.getItem(TRACK_KEY),   // null = never chosen
    weekOverride: null,                       // week number, or null = auto
  };
  const selectedTrack = () => state.track || 'all';

  // ---------- schedule accessors ----------

  function weekFor(dayStr) {
    if (state.weekOverride != null) {
      return SCHEDULE.weeks.find((w) => w.week === state.weekOverride) ?? null;
    }
    return (
      SCHEDULE.weeks.find((w) => dayStr >= w.start && dayStr <= w.end) ??
      SCHEDULE.weeks[0] ??
      null
    );
  }

  function slotsForDay(week, dayStr, trackId) {
    if (!week) return [];
    return week.slots.filter(
      (s) => s.day === dayStr && (trackId === 'all' || s.track === trackId || s.track === 'all')
    );
  }

  const trackName = (week, id) => {
    if (id === 'all') return 'All tracks';
    return week?.tracks.find((t) => t.id === id)?.name ?? id;
  };

  // ---------- rendering primitives ----------

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Deterministic per-venue color so badges stay consistent everywhere.
  function venueColor(id) {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${(h * 137.508) % 360} 65% 72%)`;
  }

  function venueBadge(id) {
    const v = SCHEDULE.venues[id];
    const b = el('span', 'badge', v ? v.name : id);
    b.style.background = venueColor(id);
    return b;
  }

  function badges(venueIds) {
    const wrap = el('span', 'badges');
    for (const id of venueIds) wrap.appendChild(venueBadge(id));
    return wrap;
  }

  function venuePlace(venueIds) {
    // "Palladium Ballroom (Camping area, ~8–10 min from Folketshus)"
    const names = venueIds.map((id) => SCHEDULE.venues[id]?.name ?? id);
    const areas = [...new Set(venueIds.map((id) => SCHEDULE.venues[id]?.area).filter(Boolean))];
    let suffix = '';
    if (areas.length === 1) {
      const a = SCHEDULE.areas[areas[0]];
      if (a) suffix = a.walk_note ? ` (${a.name}, ${a.walk_note})` : ` (${a.name})`;
    }
    return names.join(' + ') + suffix;
  }

  const kindIcon = (kind) => KIND_ICONS[kind] ?? KIND_ICONS.other;

  function itemRow(item, { time, timeFuzzy, sub, cls } = {}) {
    const row = el('div', `row${cls ? ' ' + cls : ''}`);
    const t = el('div', `row-time${timeFuzzy ? ' fuzzy' : ''}`, time ?? '');
    const body = el('div', 'row-body');
    const title = el('div', 'row-title');
    title.append(el('span', 'kind-icon', kindIcon(item.kind)), ` ${item.title} `, badges(item.venues));
    body.appendChild(title);
    if (sub) body.appendChild(el('div', 'row-sub', sub));
    row.append(t, body);
    return row;
  }

  function section(titleText, subtitle) {
    const s = el('section');
    s.appendChild(el('h2', 'section-title', titleText));
    if (subtitle) s.appendChild(el('div', 'row-sub', subtitle));
    return s;
  }

  // ---------- hero: day mode ----------

  function dayHero(now, week, dayStr, dayData) {
    const track = selectedTrack();
    const nowM = nowHMinutes(now);

    // Candidates: today's classes for the track, plus today's timed specials
    // (an 18:00 stretching session can be "next" too).
    const candidates = [
      ...slotsForDay(week, dayStr, track).map((s) => ({
        title: s.track === 'all' ? (s.note || 'All tracks') : trackName(week, s.track),
        sub: s.note && s.track !== 'all' ? s.note : null,
        venues: s.venues, start: s.start, end: s.end, kind: 'class',
      })),
      ...(dayData?.specials ?? [])
        .filter((sp) => sp.start)
        .map((sp) => ({ title: sp.title, sub: sp.note, venues: sp.venues, start: sp.start, end: sp.end, kind: sp.kind })),
    ].sort((a, b) => hMinutes(a.start) - hMinutes(b.start));

    const card = el('div', 'hero-card');
    const current = candidates.find((c) => hMinutes(c.start) <= nowM && nowM < hMinutes(c.end));
    const next = candidates.find((c) => hMinutes(c.start) > nowM);
    const pick = current ?? next;

    if (!pick) {
      card.appendChild(el('div', 'hero-empty',
        track === 'all'
          ? 'Nothing scheduled right now. Evening programme starts around 18:00.'
          : `No more ${trackName(week, track)} classes today. Evening programme starts around 18:00.`));
      return card;
    }

    card.appendChild(el('div', 'hero-status',
      pick === current
        ? `Now · until ${current.end}`
        : `Next · ${fmtCountdown(hMinutes(pick.start) - nowM)}`));
    card.appendChild(el('div', 'hero-title', `${kindIcon(pick.kind)} ${pick.title}`));
    card.appendChild(el('div', 'hero-meta', `${pick.start}–${pick.end} · ${venuePlace(pick.venues)}`));
    if (pick.sub) card.appendChild(el('div', 'hero-note', pick.sub));
    return card;
  }

  // ---------- hero: night mode ("Now playing") ----------

  function nightHero(now, dayData) {
    const card = el('div', 'hero-card');
    if (!dayData) {
      card.appendChild(el('div', 'hero-empty', 'No evening programme loaded for tonight.'));
      return card;
    }

    const nowM = nowHMinutes(now);
    const rows = [];

    for (const ev of dayData.events) {
      if (!ev.start) continue;
      if (hMinutes(ev.start) <= nowM && nowM < hMinutes(ev.end)) {
        for (const vid of ev.venues) {
          let what = `${kindIcon(ev.kind)} ${ev.title}`;
          if (vid === 'lb' && dayData.library_theme) what += ` · ${dayData.library_theme} night`;
          rows.push({ venue: vid, what, until: `until ${ev.end}` });
        }
      }
    }
    // Fuzzy-time events ("After live music") are shown once anything is live —
    // they have no clock time, so we never pretend they've started or ended.
    for (const ev of dayData.events) {
      if (ev.start) continue;
      rows.push({ venue: ev.venues[0], what: `${kindIcon(ev.kind)} ${ev.title}`, until: ev.start_text ?? '' });
    }

    if (rows.some((r) => r.until.startsWith('until'))) {
      for (const r of rows) {
        const row = el('div', 'now-row');
        row.append(venueBadge(r.venue), el('div', 'now-what', r.what), el('div', 'now-until', r.until));
        card.appendChild(row);
      }
      return card;
    }

    // Nothing live yet (or anymore): show what's next tonight.
    const next = dayData.events.find((ev) => ev.start && hMinutes(ev.start) > nowM);
    if (next) {
      card.appendChild(el('div', 'hero-status', `Next · ${fmtCountdown(hMinutes(next.start) - nowM)}`));
      card.appendChild(el('div', 'hero-title', `${kindIcon(next.kind)} ${next.title}`));
      card.appendChild(el('div', 'hero-meta', `${next.start}–${next.end} · ${venuePlace(next.venues)}`));
      if (next.note) card.appendChild(el('div', 'hero-note', next.note));
    } else {
      card.appendChild(el('div', 'hero-empty', 'That’s it for tonight. Sleep well — classes resume at 10:00.'));
    }
    return card;
  }

  // ---------- tonight timeline ----------

  function orderedTonight(dayData) {
    const timed = dayData.events.filter((e) => e.start);
    const fuzzy = dayData.events.filter((e) => !e.start);
    const out = [...timed].sort((a, b) => hMinutes(a.start) - hMinutes(b.start));
    for (const f of fuzzy) {
      const ref = f.after;
      const idx = ref
        ? out.findIndex((e) => e.slug === ref || e.slug.startsWith(ref) || ref.startsWith(e.slug))
        : -1;
      if (idx >= 0) out.splice(idx + 1, 0, f);
      else out.push(f);
    }
    return out;
  }

  function tonightSection(now, dayData) {
    const s = section('Tonight', dayData.library_theme ? `Library theme: ${dayData.library_theme}` : null);
    const rows = el('div', 'rows');
    const nowM = nowHMinutes(now);

    for (const ev of orderedTonight(dayData)) {
      const past = ev.end && hMinutes(ev.end) <= nowM;
      const current = ev.start && hMinutes(ev.start) <= nowM && nowM < hMinutes(ev.end);
      rows.appendChild(itemRow(ev, {
        time: ev.start ? `${ev.start}–${ev.end}` : (ev.start_text ?? ''),
        timeFuzzy: !ev.start,
        sub: ev.note,
        cls: current ? 'current' : past ? 'past' : null,
      }));
    }
    if (!dayData.events.length) rows.appendChild(el('div', 'hero-empty', 'No evening events on tonight’s sheet.'));
    s.appendChild(rows);

    for (const note of dayData.notes ?? []) s.appendChild(el('div', 'row-sub', `✎ ${note}`));
    return s;
  }

  // ---------- classes today ----------

  function classesSection(now, week, dayStr) {
    const track = selectedTrack();
    const s = section(track === 'all' ? 'Classes today' : `Classes today · ${trackName(week, track)}`);
    const rows = el('div', 'rows');
    const nowM = nowHMinutes(now);
    const slots = slotsForDay(week, dayStr, track);

    for (const slot of slots) {
      const title = slot.track === 'all' ? (slot.note || 'All tracks') : trackName(week, slot.track);
      const sub = [
        track === 'all' && slot.track !== 'all' && slot.note ? slot.note : null,
        track !== 'all' && slot.note && slot.track !== 'all' ? slot.note : null,
      ].filter(Boolean).join(' · ') || null;
      const past = hMinutes(slot.end) <= nowM;
      const current = hMinutes(slot.start) <= nowM && nowM < hMinutes(slot.end);
      rows.appendChild(itemRow(
        { title, venues: slot.venues, kind: 'class' },
        { time: `${slot.start}–${slot.end}`, sub, cls: current ? 'current' : past ? 'past' : null }
      ));
    }
    if (!slots.length) {
      rows.appendChild(el('div', 'hero-empty',
        week ? 'No classes on the grid for this day.' : 'No class schedule loaded for this week.'));
    }
    s.appendChild(rows);
    return s;
  }

  // ---------- specials / tasters / talks strip ----------

  function stripSection(title, items, opts = {}) {
    if (!items?.length) return null;
    const s = section(title);
    const rows = el('div', 'rows');
    for (const it of items) {
      rows.appendChild(itemRow(it, {
        time: it.start ? (it.end ? `${it.start}–${it.end}` : it.start) : (opts.noTimeText ?? ''),
        timeFuzzy: !it.start,
        sub: [it.teacher ? `with ${it.teacher}` : null, it.note].filter(Boolean).join(' · ') || null,
      }));
    }
    s.appendChild(rows);
    return s;
  }

  // ---------- venue legend ----------

  function legendSection() {
    const s = section('Venues');
    for (const [areaId, area] of Object.entries(SCHEDULE.areas)) {
      const venues = Object.values(SCHEDULE.venues).filter((v) => v.area === areaId);
      if (!venues.length) continue;
      const box = el('div', 'legend-area');
      box.appendChild(el('h3', null, area.name));
      if (area.walk_note) box.appendChild(el('p', 'walk', area.walk_note));
      const list = el('div', 'legend-venues');
      for (const v of venues) list.appendChild(venueBadge(v.id));
      box.appendChild(list);
      s.appendChild(box);
    }
    return s;
  }

  // ---------- header: title, week switcher, track chip ----------

  function renderHeader(now, week, dayStr) {
    document.getElementById('day-title').textContent = fmtDayTitle(dayStr, week?.week);
    document.getElementById('track-chip').textContent = trackName(week, selectedTrack());

    const sw = document.getElementById('week-switcher');
    sw.innerHTML = '';
    if (SCHEDULE.weeks.length > 1) {
      sw.hidden = false;
      for (const w of SCHEDULE.weeks) {
        const inRange = dayStr >= w.start && dayStr <= w.end;
        const btn = el('button', null, `Week ${w.week}`);
        if (week && w.week === week.week) btn.classList.add('active');
        if (!inRange) btn.classList.add('outside');
        btn.addEventListener('click', () => {
          state.weekOverride = w.week;
          render();
        });
        sw.appendChild(btn);
      }
    } else {
      sw.hidden = true;
    }
  }

  // ---------- track picker bottom sheet ----------

  function openTrackSheet(week) {
    const sheet = document.getElementById('track-sheet');
    const backdrop = document.getElementById('sheet-backdrop');
    const list = document.getElementById('track-list');
    list.innerHTML = '';

    const options = [{ id: 'all', name: 'All tracks' }, ...(week?.tracks ?? [])];
    for (const opt of options) {
      const btn = el('button', selectedTrack() === opt.id ? 'selected' : null, opt.name);
      btn.addEventListener('click', () => {
        state.track = opt.id;
        localStorage.setItem(TRACK_KEY, opt.id);
        closeTrackSheet();
        render();
      });
      list.appendChild(btn);
    }
    sheet.hidden = false;
    backdrop.hidden = false;
  }

  function closeTrackSheet() {
    document.getElementById('track-sheet').hidden = true;
    document.getElementById('sheet-backdrop').hidden = true;
  }

  // ---------- main render ----------

  function render() {
    const now = new Date();
    const dayStr = herrangDay(now);
    const week = weekFor(dayStr);

    // Stored track might not exist in this week's grid — fall back to all.
    if (state.track && state.track !== 'all' && week && !week.tracks.some((t) => t.id === state.track)) {
      state.track = 'all';
    }

    const dayData = SCHEDULE.days[dayStr] ?? null;
    const night = isNight(now);

    renderHeader(now, week, dayStr);

    // Honest about staleness: if today's sheet is missing and it's past noon,
    // say so — never present yesterday's programme as current.
    document.getElementById('stale-banner').hidden = !(dayData === null && nowHMinutes(now) >= 12 * 60);

    const main = document.getElementById('main');
    main.innerHTML = '';

    const hero = el('section');
    hero.appendChild(night ? nightHero(now, dayData) : dayHero(now, week, dayStr, dayData));

    const parts = [hero];
    const tonight = dayData ? tonightSection(now, dayData) : null;
    const classes = classesSection(now, week, dayStr);
    if (night) parts.push(tonight, classes);
    else parts.push(classes, tonight);

    if (dayData) {
      parts.push(
        stripSection('Today’s specials', dayData.specials),
        stripSection('Taster classes', dayData.tasters, { noTimeText: 'see sheet' }),
        stripSection('Talks', dayData.talks)
      );
    }
    parts.push(legendSection());

    for (const p of parts) if (p) main.appendChild(p);

    const built = new Date(SCHEDULE.built_at);
    document.getElementById('built-at').textContent =
      `Schedule as of ${built.toLocaleDateString('en-GB', { weekday: 'short' })} ` +
      `${pad(built.getHours())}:${pad(built.getMinutes())}`;
  }

  // ---------- wiring ----------

  document.getElementById('track-chip').addEventListener('click', () => {
    openTrackSheet(weekFor(herrangDay(new Date())));
  });
  document.getElementById('sheet-backdrop').addEventListener('click', closeTrackSheet);

  render();
  setInterval(render, 30 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  // First launch: the track sheet *is* the onboarding.
  if (state.track === null) {
    openTrackSheet(weekFor(herrangDay(new Date())));
  }

  // ---------- service worker + update toast ----------

  if ('serviceWorker' in navigator) {
    const toast = document.getElementById('update-toast');
    let userAskedForUpdate = false;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const promptIfWaiting = () => {
        if (reg.waiting) {
          toast.hidden = false;
          toast.onclick = () => {
            userAskedForUpdate = true;
            reg.waiting.postMessage('SKIP_WAITING');
          };
        }
      };
      promptIfWaiting();
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed') promptIfWaiting();
        });
      });
    });
    // Never auto-reload mid-use: only reload when the user tapped the toast.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (userAskedForUpdate) location.reload();
    });
  }
})();

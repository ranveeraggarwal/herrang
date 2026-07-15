'use client';

// The secret pep talk. Herräng is overwhelming; this is the app quietly
// reminding you it's on your side.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Mode } from '@/lib/herrang/time';

const PEP_TALK_LINES = [
  'You look beautiful today.',
  'Isn\'t this a great time to be alive?',
  'You crossed the world to dance in a field. That was the right call.',
  'Nobody remembers the step you missed. They remember you smiled.',
  'Drink some water. You\'re doing great.',
  'That dance you keep replaying? They\'re replaying it too.',
  'You belong here. Even the mosquitoes agree.',
  'Take the nap. The party will find you either way.',
  'The lake doesn\'t care how your last dance went. Go jump in it.',
  'Someone here thinks you\'re the good dancer.',
  'Your feet hurt because you danced until four. Fair trade.',
  'Herräng is a lot. You\'re doing fine.',
];

// After dark the pep talk knows where you are. These join the pool for
// their hours, they don't replace it — a friend has range.
const PEP_NIGHT_LINES = [
  'Ask them to dance. The worst they can say is "next song".',
  'The floor is better with you on it.',
  'One more song. You already knew it was one more song.',
  'Nobody out there is grading you. They\'re all just hoping you say yes.',
];

const PEP_WEIRD_LINES = [
  'Still up? Magnificent. Unwise, but magnificent.',
  'You watched the sun rise in Herräng. Some people pay retreats for this.',
  'Whoever you danced that last one with — tell them tomorrow.',
  'Breakfast is now closer than bed. Godspeed.',
];

// Unlocks after ten pep talks. The app notices, warmly.
const PEP_REGULAR_LINES = [
  'Back again? Refills are free.',
  'You keep tapping. We keep meaning it.',
];

// The hundredth pep talk. Once, then never again.
const PEP_CENTURY_LINE = "That's a hundred. Frankie would've loved you.";

const PEP_OPENS_KEY = 'herrang.peptalks.v1';

const RAIN_EMOJI = ['✨', '💛', '🌞', '💃', '🕺', '🎷', '❤️', '🌈'];
// After dark the locals join the rain.
const NIGHT_RAIN_EMOJI = ['🦟', '🦟', '🌙'];
const RAIN_COUNT = 24;

export function PepTalk({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  // Lifetime open count, bumped once per open. Lazy initializer so the
  // count is in hand before the first line is picked; the write failing
  // (private mode etc.) just means the regulars' lines never unlock.
  const [opens] = useState(() => {
    try {
      const n = Number(localStorage.getItem(PEP_OPENS_KEY) ?? '0') + 1;
      localStorage.setItem(PEP_OPENS_KEY, String(n));
      return n;
    } catch {
      return 0;
    }
  });

  // Open #100 gets the Frankie line and a biblical downpour.
  const century = opens === 100;

  // Fresh pick on every open, not date-seeded — this isn't the poster,
  // it's a friend saying whatever comes to mind.
  const line = useMemo(() => {
    if (century) return PEP_CENTURY_LINE;
    const pool = [
      ...PEP_TALK_LINES,
      ...(mode === 'night' ? PEP_NIGHT_LINES : []),
      ...(mode === 'weird' ? PEP_WEIRD_LINES : []),
      ...(opens >= 10 ? PEP_REGULAR_LINES : []),
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [mode, opens, century]);

  // Randomized once per mount so the rain doesn't reshuffle on every render.
  const rain = useMemo(() => {
    const emoji = mode === 'day' ? RAIN_EMOJI : [...RAIN_EMOJI, ...NIGHT_RAIN_EMOJI];
    return Array.from({ length: century ? RAIN_COUNT * 10 : RAIN_COUNT }, (_, i) => ({
      key: i,
      emoji: emoji[Math.floor(Math.random() * emoji.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 1.5,
      // Negative delay so the loop starts mid-fall instead of everything
      // dropping from the top together on open.
      delay: -(Math.random() * 6),
      dur: 3 + Math.random() * 3,
    }));
  }, [mode, century]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Herräng Companion"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-8 text-center"
      style={{ background: 'var(--hg-ground)', color: 'var(--hg-ink)' }}
    >
      <div className="hg-peptalk-rain" aria-hidden="true">
        {rain.map((r) => (
          <span
            key={r.key}
            className="hg-peptalk-emoji"
            style={
              {
                '--hg-emoji-x': `${r.x}%`,
                '--hg-emoji-y': `${r.y}%`,
                '--hg-emoji-size': `${r.size}rem`,
                '--hg-emoji-delay': `${r.delay}s`,
                '--hg-emoji-dur': `${r.dur}s`,
              } as CSSProperties
            }
          >
            {r.emoji}
          </span>
        ))}
      </div>
      <p
        className="hg-display relative"
        style={{ fontSize: 'clamp(1.8rem, 8vw, 4rem)', textWrap: 'balance' }}
      >
        {line}
      </p>
    </div>
  );
}

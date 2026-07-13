'use client';

// The secret pep talk. Herräng is overwhelming; this is the app quietly
// reminding you it's on your side.

import { useEffect, useMemo, type CSSProperties } from 'react';

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

const RAIN_EMOJI = ['✨', '💛', '🌞', '💃', '🕺', '🎷', '❤️', '🌈'];
const RAIN_COUNT = 24;

export function PepTalk({ onClose }: { onClose: () => void }) {
  // Fresh pick on every open, not date-seeded — this isn't the poster,
  // it's a friend saying whatever comes to mind.
  const line = useMemo(
    () => PEP_TALK_LINES[Math.floor(Math.random() * PEP_TALK_LINES.length)],
    []
  );

  // Randomized once per mount so the rain doesn't reshuffle on every render.
  const rain = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, (_, i) => ({
        key: i,
        emoji: RAIN_EMOJI[Math.floor(Math.random() * RAIN_EMOJI.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.5 + Math.random() * 1.5,
        // Negative delay so the loop starts mid-fall instead of everything
        // dropping from the top together on open.
        delay: -(Math.random() * 6),
        dur: 3 + Math.random() * 3,
      })),
    []
  );

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

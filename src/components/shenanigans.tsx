'use client';

// The shenanigans that live outside any one view: gesture-triggered,
// connectivity-triggered, all silent until found. See the roster in
// AGENTS.md — every one of these is deliberate. One joke per egg.

import { useCallback, useEffect, useState } from 'react';

/* ------------------------------ Shim Sham ------------------------------ */

// Long-press anywhere for three seconds during party hours and the app
// panics with you: SHIM SHAM? then counts you in on the 5-6-7-8, one poster
// color per beat, and leaves without comment.

const SHIM_HOLD_MS = 3000;
const SHIM_INTRO_MS = 1400;
const SHIM_BEAT_MS = 500; // ~120 bpm — Tain't What You Do territory

export function useShimShamLongPress(active: boolean) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!active) return;
    let timer = 0;
    let x0 = 0;
    let y0 = 0;
    const down = (e: PointerEvent) => {
      x0 = e.clientX;
      y0 = e.clientY;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setOpen(true), SHIM_HOLD_MS);
    };
    const cancel = () => window.clearTimeout(timer);
    // A drifting finger is a scroll, not a hold.
    const move = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 12) window.clearTimeout(timer);
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('pointermove', move);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('pointermove', move);
    };
  }, [active]);

  return { shimShamOpen: open, closeShimSham: close };
}

const SHIM_STEPS = [
  { text: 'Shim Sham?', bg: 'var(--hg-special)', fg: 'var(--hg-on-special)' },
  { text: '5', bg: 'var(--hg-dj)', fg: 'var(--hg-on-block)' },
  { text: '6', bg: 'var(--hg-show)', fg: 'var(--hg-on-block)' },
  { text: '7', bg: 'var(--hg-taster)', fg: 'var(--hg-on-block)' },
  { text: '8', bg: 'var(--hg-social)', fg: 'var(--hg-on-block)' },
];

export function ShimSham({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  // Steady ink instead of a color per beat when motion is dialed down —
  // the count still counts, it just doesn't strobe.
  const [reduced] = useState(() =>
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const id = window.setTimeout(
      () => (step === SHIM_STEPS.length - 1 ? onClose() : setStep(step + 1)),
      step === 0 ? SHIM_INTRO_MS : SHIM_BEAT_MS
    );
    return () => window.clearTimeout(id);
  }, [step, onClose]);

  const s = SHIM_STEPS[step];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shim Sham count-in"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 text-center"
      style={
        reduced
          ? { background: 'var(--hg-ink)', color: 'var(--hg-ground)' }
          : { background: s.bg, color: s.fg }
      }
    >
      <p
        className="hg-display hg-time"
        style={{
          fontSize:
            step === 0 ? 'clamp(2.5rem, 13vw, 6rem)' : 'clamp(8rem, 55vw, 20rem)',
        }}
      >
        {s.text}
      </p>
    </div>
  );
}

/* --------------------------- Pull to refresh --------------------------- */

// The app is fully static; pulling to refresh has never once helped.
// Say so. (Native pull-to-refresh is switched off in globals.css — this
// note answers the gesture instead.)

const PULL_LINE =
  'Refreshing changes nothing. Like the lunch queue, it moves at its own pace.';
const PULL_THRESHOLD_PX = 90;
const PULL_SHOW_MS = 4000;
const PULL_COOLDOWN_MS = 8000;

export function PullNote() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let startY = 0;
    let armed = false;
    let lastShown = 0;
    let hideTimer = 0;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        armed = true;
        startY = e.touches[0].clientY;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!armed || window.scrollY > 0) return;
      if (
        e.touches[0].clientY - startY > PULL_THRESHOLD_PX &&
        Date.now() - lastShown > PULL_COOLDOWN_MS
      ) {
        armed = false;
        lastShown = Date.now();
        setShow(true);
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => setShow(false), PULL_SHOW_MS);
      }
    };
    const onEnd = () => {
      armed = false;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  if (!show) return null;
  return (
    <p
      className="fixed left-1/2 z-40 w-[88%] max-w-md -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-semibold"
      style={{
        top: 'calc(env(safe-area-inset-top) + 10px)',
        background: 'var(--hg-ink)',
        color: 'var(--hg-ground)',
      }}
    >
      {PULL_LINE}
    </p>
  );
}

/* -------------------------------- Offline ------------------------------- */

/** Camp Wi-Fi is a rumor, and the app doesn't need it anyway. One extra
 * footer line while there's no signal. */
export function OfflineLine() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (!offline) return null;
  return <p className="mt-1">No signal. Correct. You&apos;re in a field.</p>;
}

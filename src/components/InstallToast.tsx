'use client';

// A one-time nudge to add the app to the home screen — this is an
// offline-first camp companion, and a home-screen icon beats a browser tab
// nobody can find again on Wi-Fi-less day 4. Dismissal (or installing)
// persists in localStorage so it never nags twice.

import { useEffect, useState } from 'react';

const INSTALL_KEY = 'herrang.installPrompt.v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function persist(value: 'dismissed' | 'installed') {
  try {
    localStorage.setItem(INSTALL_KEY, value);
  } catch {
    /* private mode etc. — it'll just ask again next visit */
  }
}

export function InstallToast() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(INSTALL_KEY) !== null) return;
    } catch {
      /* ignore — worst case it asks every visit */
    }

    if (isIOS()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      persist('installed');
      setVisible(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    persist('dismissed');
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    persist(outcome === 'accepted' ? 'installed' : 'dismissed');
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
    >
      <div
        className="flex w-full max-w-xl items-center justify-between gap-3 p-4"
        style={{
          background: 'var(--hg-ink)',
          color: 'var(--hg-ground)',
          borderRadius: 'var(--hg-radius)',
        }}
      >
        <p className="text-sm font-semibold">
          {iosHint
            ? 'Add to Home Screen for offline access — Share → Add to Home Screen.'
            : 'Install My Herräng for offline access at camp.'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {!iosHint && (
            <button
              onClick={install}
              className="hg-display rounded-full px-3 py-1.5 text-xs"
              style={{ background: 'var(--hg-ground)', color: 'var(--hg-ink)' }}
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full px-2.5 py-1.5 text-xs font-bold"
            style={{ border: '1px solid var(--hg-ground)' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

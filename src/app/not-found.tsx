// The 404, in the house voice. Renders on the current ground (the inline
// head script in layout.tsx has already set data-hg by the time this paints),
// so a 2am wrong turn stays on the dark ground like everything else.

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center px-4 pb-16">
      <p
        className="hg-time text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--hg-soft)' }}
      >
        404
      </p>
      <h1 className="hg-display mt-2 text-[clamp(2rem,10vw,3.4rem)]">
        This page isn&apos;t on the poster.
      </h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--hg-soft)' }}>
        Whatever was here wandered off toward the lake.
      </p>
      <Link
        href="/"
        className="hg-display mt-6 inline-block rounded-full px-4 py-2 text-sm"
        style={{ border: '1px solid var(--hg-ink)' }}
      >
        Back to the schedule →
      </Link>
    </main>
  );
}

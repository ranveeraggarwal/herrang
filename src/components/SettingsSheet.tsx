'use client';

// One small sheet for everything personal: track picker (with the Group 1 /
// Group 2 / "not sure yet" choice for split levels), the day/night override,
// and per-track calendar subscribe links. All localStorage, nothing leaves
// the device.

import type { WeekSchedule } from '@/lib/herrang/types';
import {
  levelOptions,
  type GroupChoice,
  type TrackSelection,
} from '@/lib/herrang/schedule';
import { Segmented } from './bits';

export type ThemePref = 'auto' | 'day' | 'night';

export function SettingsSheet({
  open,
  onClose,
  week,
  selection,
  onSelection,
  themePref,
  onTheme,
  trackIds,
}: {
  open: boolean;
  onClose: () => void;
  week: WeekSchedule;
  selection: TrackSelection;
  onSelection: (s: TrackSelection) => void;
  themePref: ThemePref;
  onTheme: (t: ThemePref) => void;
  trackIds: string[];
}) {
  if (!open) return null;

  const options = levelOptions(week);

  const toggleLevel = (level: string) => {
    const has = selection.levels.includes(level);
    onSelection({
      ...selection,
      levels: has
        ? selection.levels.filter((l) => l !== level)
        : [...selection.levels, level],
    });
  };

  const setGroup = (level: string, choice: GroupChoice) => {
    onSelection({
      ...selection,
      groups: { ...selection.groups, [level]: choice },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your tracks & settings"
        className="relative max-h-[85dvh] w-full max-w-xl overflow-y-auto p-5"
        style={{
          background: 'var(--hg-ground)',
          color: 'var(--hg-ink)',
          borderRadius: 'var(--hg-radius) var(--hg-radius) 0 0',
          borderTop: '1px solid var(--hg-ink)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="hg-display text-lg">Your tracks</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-bold uppercase"
            style={{ border: '1px solid var(--hg-ink)' }}
          >
            Done
          </button>
        </div>

        {options.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--hg-soft)' }}>
            The track picker unlocks when the week 2 class schedule lands.
            Tonight&apos;s program works without it.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {options.map((o) => {
              const active = selection.levels.includes(o.level);
              return (
                <li key={o.level}>
                  <button
                    onClick={() => toggleLevel(o.level)}
                    aria-pressed={active}
                    className="hg-display w-full rounded-[var(--hg-radius)] p-3 text-left text-base"
                    style={
                      active
                        ? { background: 'var(--hg-ink)', color: 'var(--hg-ground)' }
                        : { border: '1px solid var(--hg-line)' }
                    }
                  >
                    {o.level}
                  </button>
                  {active && o.split && (
                    <div className="mt-2 pl-1">
                      <Segmented<GroupChoice>
                        label={`${o.level} group`}
                        value={selection.groups[o.level] ?? 'unsure'}
                        onChange={(g) => setGroup(o.level, g)}
                        options={[
                          { value: 1, label: 'Group 1' },
                          { value: 2, label: 'Group 2' },
                          { value: 'unsure', label: 'Not sure yet' },
                        ]}
                      />
                      <p className="mt-1 text-xs" style={{ color: 'var(--hg-soft)' }}>
                        “Not sure yet” shows both groups until you set it.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <h2 className="hg-display mt-6 mb-2 text-lg">Ground</h2>
        <Segmented<ThemePref>
          label="Theme"
          value={themePref}
          onChange={onTheme}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'day', label: 'Day' },
            { value: 'night', label: 'Night' },
          ]}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--hg-soft)' }}>
          Auto goes dark 20:00–08:00.
        </p>

        {trackIds.length > 0 && (
          <>
            <h2 className="hg-display mt-6 mb-2 text-lg">Subscribe</h2>
            <p className="mb-2 text-xs" style={{ color: 'var(--hg-soft)' }}>
              Your classes in your calendar app — native notifications, zero
              connectivity needed.
            </p>
            <ul className="flex flex-col gap-2">
              {trackIds.map((id) => {
                const track = week.tracks.find((t) => t.id === id);
                return (
                  <li key={id}>
                    <a
                      href={`webcal://herrang.stockholmswing.com/ics/${id}`}
                      className="hg-display inline-block rounded-full px-4 py-2 text-sm"
                      style={{ border: '1px solid var(--hg-ink)' }}
                    >
                      📅 {track?.name ?? id}
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

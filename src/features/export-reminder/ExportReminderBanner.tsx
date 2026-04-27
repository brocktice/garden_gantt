// src/features/export-reminder/ExportReminderBanner.tsx
// Phase 4 Plan 04-05 Task 2 — D-13 export-reminder banner.
// Source: 04-05-PLAN.md Task 2; UI-SPEC §Export-reminder banner (D-13 copy table);
//         UI-SPEC §New Phase 4 banner color contract (stone palette, NOT amber);
//         04-PATTERNS.md §src/features/export-reminder/ExportReminderBanner.tsx
//         (analog: src/app/Banner.tsx — adapted with stone palette).
//
// Mount-point: NOT mounted here. Plan 04-06 mounts in AppShell with the banner-stack
// priority rule (storage-full > iOS Private > export-reminder — only one banner visible
// at a time).
//
// Color contract (UI-SPEC §banner color): stone-100 bg / stone-900 text / green-700
// primary CTA / stone-600 secondary buttons. Calmer than amber to avoid alarm — this
// is a nudge, not a warning.
//
// Banner height tracks --spacing-banner-h (48px) per UI-SPEC §Spacing Scale.
import { useExportReminder } from './useExportReminder';
import { exportPlan } from '../settings/exportPlan';

export function ExportReminderBanner() {
  const r = useExportReminder();
  if (!r.shouldShow) return null;

  const dateLabel = r.formatLastExportedShort();
  const sinceText = r.lastExportedAt ? `since ${dateLabel}` : 'since you started';

  return (
    <aside
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 w-full bg-stone-100 text-stone-900 border-b border-stone-200 px-4 py-3"
      style={{ minHeight: 'var(--spacing-banner-h, 48px)' }}
    >
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <p className="text-base">
          You have <strong>{r.count}</strong> unsaved changes {sinceText}.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => exportPlan()}
            className="text-sm font-medium text-green-700 hover:underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          >
            Export plan
          </button>
          <button
            type="button"
            onClick={r.snooze3Days}
            className="text-sm text-stone-600 hover:underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-600"
          >
            Remind me later
          </button>
          <button
            type="button"
            onClick={r.snooze30Days}
            className="text-sm text-stone-600 hover:underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-600"
          >
            Don&apos;t remind for 30 days
          </button>
        </div>
      </div>
    </aside>
  );
}

// src/app/StorageFullBanner.tsx
// Mid-session storage-full banner (D-10). Surfaces uiStore.isStorageFull as a
// non-dismissible amber banner that persists until the user exports their plan.
//
// Plan 04-03 ships this component; Plan 04-06 mounts it in AppShell as part of
// the priority-sorted banner stack.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 1]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/app/StorageFullBanner.tsx]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Error states]

import { useUIStore } from '../stores/uiStore';
import { Button } from '../ui/Button';
import { exportPlan } from '../features/settings/exportPlan';

export function StorageFullBanner() {
  const isStorageFull = useUIStore((s) => s.isStorageFull);
  if (!isStorageFull) return null;
  return (
    <aside
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 w-full bg-amber-100 text-amber-800 border-b border-amber-200 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Storage full.</p>
          <p className="mt-1 text-base">
            Export your plan to free space. New changes won&apos;t be saved until you do.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => exportPlan()}>
          Export plan
        </Button>
      </div>
    </aside>
  );
}

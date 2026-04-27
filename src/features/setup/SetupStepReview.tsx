// src/features/setup/SetupStepReview.tsx
// Wizard Step 3 — Review per UI-SPEC §Component Inventory item 7.
// Reads usePlanStore.plan and renders a read-only GanttView (Phase 1's component).
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §7 lines 440-453]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md D-01, D-26]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 2 Step 2]

import { DragLayer } from '../gantt/drag/DragLayer';
import { usePlanStore } from '../../stores/planStore';

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function SetupStepReview() {
  const plan = usePlanStore((s) => s.plan);

  if (!plan) {
    return (
      <div className="text-center py-16">
        <p className="text-base text-stone-600">
          No plan to review yet — go back to add plants.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900">
        Here&apos;s your season at a glance
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Zone {plan.location.zone} · last frost {formatDate(plan.location.lastFrostDate)} ·
        first fall frost {formatDate(plan.location.firstFrostDate)}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        {plan.plantings.length} plant{plan.plantings.length === 1 ? '' : 's'} in your plan
      </p>
      <div className="mt-6 -mx-4 overflow-x-auto">
        <DragLayer />
      </div>
      <p className="mt-4 max-w-prose text-sm text-stone-600">
        Drag any lifecycle bar to adjust your schedule. Constraint violations snap back with
        a tooltip explaining why. Your plan is saved automatically as you go.
      </p>
    </div>
  );
}

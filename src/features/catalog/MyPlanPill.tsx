// src/features/catalog/MyPlanPill.tsx
// Floating "X plants added" pill (UI-SPEC §5, D-11). Visible from any route via AppShell;
// mounted by Plan 02-10. Disabled at count=0 but stays focusable for AT discovery.
//
// Source: [CITED: 02-UI-SPEC.md §5 Component Inventory item 5]
//         [CITED: 02-PATTERNS.md MyPlanPill.tsx]

import { Sprout } from 'lucide-react';
import { usePlanStore } from '../../stores/planStore';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../ui/cn';

export function MyPlanPill() {
  const count = usePlanStore((s) => s.plan?.plantings.length ?? 0);
  const setOpen = useUIStore((s) => s.setMyPlanPanelOpen);
  const isOpen = useUIStore((s) => s.myPlanPanelOpen);

  const label =
    count === 0 ? 'No plants yet' : `${count} plant${count === 1 ? '' : 's'} added`;
  const disabled = count === 0;

  return (
    <button
      type="button"
      onClick={() => !disabled && setOpen(!isOpen)}
      aria-disabled={disabled}
      aria-label={`Open My Plan (${count} plant${count === 1 ? '' : 's'} added)`}
      className={cn(
        'inline-flex items-center gap-2 h-[var(--spacing-pill-h)] px-4 rounded-full font-semibold text-sm shadow-md transition-colors',
        disabled
          ? 'bg-stone-300 text-stone-600 cursor-not-allowed'
          : isOpen
            ? 'bg-green-700 text-white ring-4 ring-green-200'
            : 'bg-green-700 text-white hover:bg-green-800',
      )}
      // aria-disabled keeps the button focusable for AT discovery (UI-SPEC §A11y).
      // We do NOT use the `disabled` HTML attribute.
    >
      <Sprout className="h-4 w-4" />
      {label}
    </button>
  );
}

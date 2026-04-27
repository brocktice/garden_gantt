// src/features/onboarding/useCoachMarks.ts
// Controller hook reading uiStore.onboarding + ref-tracking via data-coach-target.
// Returns active state, current mark, advance/dismiss imperatives.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-04-PLAN.md Task 1]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Open Question 2]

import { useMemo, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { usePlanStore } from '../../stores/planStore';
import { MARKS, type CoachMark } from './coachMarks.types';

export interface UseCoachMarksResult {
  active: boolean;
  currentMark: CoachMark | null;
  currentIndex: number;
  totalCount: number;
  isLast: boolean;
  dismiss: () => void;
  advance: () => void;
}

/**
 * `currentRoute` is the React Router pathname (`useLocation().pathname`). The
 * hook is gated on `/plan` (with optional query string).
 */
export function useCoachMarks(currentRoute: string): UseCoachMarksResult {
  const dismissed = useUIStore((s) => s.onboarding.coachMarksDismissed);
  const setDismissed = useUIStore((s) => s.setCoachMarksDismissed);
  const plantingCount = usePlanStore((s) => s.plan?.plantings.length ?? 0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onPlanRoute =
    currentRoute === '/plan' || currentRoute.startsWith('/plan?');

  // T-04-04-01 mitigation: useMemo keyed on plantingCount so the visibleMarks
  // array reference is stable across re-renders that don't change staging.
  const visibleMarks = useMemo(
    () => MARKS.filter((m) => !m.requiresPlantings || plantingCount > 0),
    [plantingCount],
  );

  const inactive = dismissed || !onPlanRoute || visibleMarks.length === 0;
  const safeIndex = Math.max(
    0,
    Math.min(currentIndex, visibleMarks.length - 1),
  );
  const currentMark = inactive ? null : (visibleMarks[safeIndex] ?? null);

  const dismiss = () => setDismissed(true);
  const advance = () => {
    if (safeIndex >= visibleMarks.length - 1) {
      // Last mark → [Got it] dismisses.
      setDismissed(true);
    } else {
      setCurrentIndex(safeIndex + 1);
    }
  };

  return {
    active: !inactive,
    currentMark,
    currentIndex: safeIndex,
    totalCount: visibleMarks.length,
    isLast: safeIndex === visibleMarks.length - 1,
    dismiss,
    advance,
  };
}

// src/features/gantt/EmptyGanttState.tsx
// Empty plot state shown when plan === null OR plan.plantings.length === 0.
// CTA navigates to /catalog so users can pick plants.
//
// Phase 4 (Plan 04-03 Task 2) D-11 retune: heading "No plants yet." + CTA
// "Add your first plant →" per UI-SPEC §Empty states.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 2]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Empty states]

import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';

export function EmptyGanttState() {
  const navigate = useNavigate();
  return (
    <div className="text-center py-16 px-4">
      <h2 className="text-2xl font-semibold text-stone-900">No plants yet.</h2>
      <p className="mt-2 max-w-prose mx-auto text-base text-stone-600">
        Pick some from the catalog and your gantt will appear here.
      </p>
      <Button
        variant="primary"
        className="mt-6"
        onClick={() => navigate('/catalog')}
      >
        Add your first plant →
      </Button>
    </div>
  );
}

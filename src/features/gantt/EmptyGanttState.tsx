// src/features/gantt/EmptyGanttState.tsx
// Empty plot state shown when plan === null OR plan.plantings.length === 0.
// CTA navigates to /catalog so users can pick plants.
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §Component Inventory item 8]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-10-PLAN.md Task 1 Step 2]

import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';

export function EmptyGanttState() {
  const navigate = useNavigate();
  return (
    <div className="text-center py-16 px-4">
      <h2 className="text-2xl font-semibold text-stone-900">
        No plants in your plan yet.
      </h2>
      <p className="mt-2 max-w-prose mx-auto text-base text-stone-600">
        Pick some from the catalog and your gantt will appear here.
      </p>
      <Button
        variant="primary"
        className="mt-6"
        onClick={() => navigate('/catalog')}
      >
        Browse plants
      </Button>
    </div>
  );
}

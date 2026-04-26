// src/app/PermapeopleAttributionFooter.tsx
// CC BY-SA 4.0 attribution for Permapeople-enriched plant data (CAT-08, D-19).
//
// Visibility rule (Pitfall J): the footer renders ONLY when the user actually has plants
// in their plan or catalog whose enrichment.source === 'permapeople'. We DO NOT use the
// permapeopleCache size as the trigger, because the cache may contain results the user
// never accepted (browse-and-discard).
//
// Source: [CITED: 02-UI-SPEC.md §10 — D-19]
//         [CITED: 02-RESEARCH.md §Pitfall J]
//         [CITED: 02-10-PLAN.md Task 2 Step 1]

import { useCatalogStore } from '../stores/catalogStore';
import { usePlanStore } from '../stores/planStore';

export function PermapeopleAttributionFooter() {
  const customPlants = useCatalogStore((s) => s.customPlants);
  const plan = usePlanStore((s) => s.plan);

  const planCustom = plan?.customPlants ?? [];
  const allCustom = [...customPlants, ...planCustom];
  const hasPermapeopleEnriched = allCustom.some(
    (p) =>
      (p.enrichment as { source?: string } | undefined)?.source === 'permapeople',
  );

  if (!hasPermapeopleEnriched) return null;

  return (
    <footer className="text-sm text-stone-500 text-center py-4 border-t border-stone-100">
      Some plant data enriched from Permapeople.org (CC BY-SA 4.0).
    </footer>
  );
}

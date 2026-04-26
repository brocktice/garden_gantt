// src/features/setup/SetupStepPlants.tsx
// Wizard Step 2 — Plants. Inlines the real CatalogBrowser (Plan 02-10 swap).
// Same component reused at /catalog (UI-SPEC §3) so users get a consistent picker
// inside the wizard and outside it.
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 2 Step 1]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-10-PLAN.md Task 2 Step 4]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §3]

import { CatalogBrowser } from '../catalog/CatalogBrowser';

export function SetupStepPlants() {
  return <CatalogBrowser />;
}

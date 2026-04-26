// src/features/setup/SetupStepPlants.tsx
// Wizard Step 2 — Plants. Placeholder ONLY for Plan 02-08.
//
// TODO(plan-02-10): swap to `import { CatalogBrowser } from '../catalog/CatalogBrowser';`
// and render `<CatalogBrowser />` here. The real CatalogBrowser ships in Plan 02-09 (same
// Wave 4 as this plan); per Plan 02-08's resolution we ship a placeholder so 02-08 can
// land independently of 02-09's component-export shape. Plan 02-10 (Wave 5) finalizes the
// wiring once 02-09's CatalogBrowser is on disk.
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 2 Step 1]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §3]

export function SetupStepPlants() {
  return (
    <div className="text-center py-16" role="status" aria-live="polite">
      <p className="text-base text-stone-600">Catalog browser loading…</p>
      <p className="mt-2 text-sm text-stone-500">
        Plant picker arrives in the next build.
      </p>
    </div>
  );
}

---
phase: 02-data-layer-first-end-to-end
plan: 08
subsystem: setup-wizard
tags: [wizard, location, react, ui]
requires:
  - 02-02 (data/zones.ts lookupLocation)
  - 02-05 (planStore.setLocation, loadSamplePlan)
  - 02-07 (UI primitives: Button, Input, Label, Select, Badge)
provides:
  - "useLookupLocation hook (src/features/setup/lookupLocation.ts)"
  - "SetupWizard 3-step shell (src/features/setup/SetupWizard.tsx)"
  - "SetupStepLocation form with derived/manual/not-found/unreachable branches"
  - "SetupStepReview read-only gantt + summary"
  - "SetupStepPlants placeholder (real CatalogBrowser swap deferred to Plan 02-10)"
  - "/setup route wired to SetupWizard in App.tsx"
affects:
  - "src/app/App.tsx (route wiring)"
tech-stack:
  added: []
  patterns:
    - "queueMicrotask in useLookupLocation to defer setState out of effect body (react-hooks/set-state-in-effect)"
    - "Mount-only plan-snapshot via useState initializer to lock D-02 initial step + first-run hero"
    - "Cancellation flag for stale fetch results on rapid ZIP retype"
    - "Synchronous derivation of zipError from props (no useState + useEffect for transient validation)"
key-files:
  created:
    - "src/features/setup/lookupLocation.ts"
    - "src/features/setup/ZipInput.tsx"
    - "src/features/setup/SetupStepLocation.tsx"
    - "src/features/setup/SetupWizard.tsx"
    - "src/features/setup/SetupStepPlants.tsx"
    - "src/features/setup/SetupStepReview.tsx"
  modified:
    - "src/app/App.tsx"
decisions:
  - "Wired /setup to SetupWizard in this plan despite files_modified not listing App.tsx: success criterion required the route to render. Documented as a Rule 3 deviation."
  - "SetupStepPlants ships as a TODO-tagged placeholder pending Plan 02-10's swap to real CatalogBrowser (Plan 02-09 ships CatalogBrowser in same wave)."
  - "queueMicrotask used to issue setAsyncResult({status:'loading'}) outside the effect body, satisfying React 19's react-hooks/set-state-in-effect rule without changing observable lookup behavior."
  - "Plan-presence is snapshotted at mount via useState initializer (planWasNullAtMount) so Step 1 saving location does NOT reset the wizard step or hide the first-run hero copy mid-flow."
  - "Override flips pre-seed manual fields synchronously in the event handler (not a useEffect) so the user sees the lookup value immediately when activating manual edit."
metrics:
  duration: ~25min
  completed: 2026-04-26
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase 2 Plan 08: Setup Wizard Shell + Step 1 Location Form + Step 3 Review Summary

Built the 3-step `/setup` wizard's shell, ZIP-driven location form (with derived/manual/not-found/unreachable branches and per-field overrides), useLookupLocation hook over `data/zones.ts`, the read-only Step 3 review surface, and a placeholder Step 2 pending Plan 02-09's catalog browser. Wired `/setup` route to the wizard in App.tsx.

## What Shipped

| Item | Path | Notes |
|------|------|-------|
| `useLookupLocation` hook | `src/features/setup/lookupLocation.ts` | Wraps `data/zones.lookupLocation`. Cancellation flag on rapid retype; `queueMicrotask` for the loading transition keeps setState out of the effect body. |
| `ZipInput` | `src/features/setup/ZipInput.tsx` | Strips non-digits, caps at 5, `inputMode="numeric"`, `autoComplete="postal-code"`, a11y error linkage. |
| `SetupStepLocation` | `src/features/setup/SetupStepLocation.tsx` | Implements UI-SPEC §2 verbatim. Derived block (lookup ok), unrecognized-ZIP card (lookup not-found), unreachable card (fetch failure), per-field Override flips + manual badge per D-05, frost-order validation, sample-plan link visible only when `plan === null` per D-03. |
| `SetupStepPlants` (placeholder) | `src/features/setup/SetupStepPlants.tsx` | TODO-tagged stub awaiting Plan 02-10's swap to `<CatalogBrowser />` (Plan 02-09 ships the browser in the same wave). |
| `SetupStepReview` | `src/features/setup/SetupStepReview.tsx` | Reads `usePlanStore.plan`, renders read-only `<GanttView />`, location summary chip, plantings count, footer copy ("Drag-to-adjust comes in the next milestone…"). |
| `SetupWizard` shell | `src/features/setup/SetupWizard.tsx` | Hero copy gated to first-run, 3-step indicator with active/complete/pending states, sticky action bar with Back/Next/Finish, Next disabled until step gate satisfied. |
| `/setup` route wiring | `src/app/App.tsx` | Replaces Phase 1's PlaceholderRoute with `<SetupWizard />`. |

## How It Connects

- `SetupStepLocation` calls `usePlanStore.loadSamplePlan()` and `useNavigate().navigate('/plan')` for the D-03 sample-plan path. The lookup hook is the sole consumer of `data/zones.lookupLocation` from the wizard surface; the sole-fetch-site invariant is preserved.
- `SetupWizard` captures `plan === null` at mount via `useState` initializer (`planWasNullAtMount`) so D-02's "Step 1 if null else Step 2" decision is set-once, and the first-run hero stays visible while Step 1 saves location.
- `SetupWizard` writes location to the store on Next (via `usePlanStore.setLocation`), not on every keystroke. `SetupStepLocation` calls back with the candidate `Location` whenever the form is valid; the wizard caches it as `pendingLocation` and commits on Next.
- Step 2 → Step 3 gate is `plan.plantings.length >= 1`; until the catalog browser ships in Plan 02-09 (and Plan 02-10 swaps it in), this gate effectively keeps Step 3 unreachable through the wizard — but Step 3 still renders correctly when reached programmatically (or once Plan 02-10 lands).
- `/setup` route now resolves to `<SetupWizard />`. Other Phase 2 routes (`/catalog`, `/settings`, real `/tasks`) remain Plan 02-10's job.

## Verification Results

- `npx tsc --noEmit`: clean (no errors).
- `npx eslint src/features/setup/**`: clean.
- `npx vitest run`: 131 tests passing across 13 files (no regressions from Phase 1 / earlier Phase 2 plans).
- `npx vite build`: succeeds (274.83 kB JS / 84.60 kB gzip).
- Grep verifications from `<verify>` blocks: all pass — `useLookupLocation`, `ZipInput`, `SetupStepLocation`, `SetupWizard`, `SetupStepPlants`, `SetupStepReview` exports present; `currentYear` imported (no raw `new Date()`); `loadSamplePlan` referenced; UI-SPEC copy strings ("ZIP not recognized", "Or try the app with a sample plan", "Let's set up your garden", "Finish — go to my plan") all present verbatim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Wired `/setup` → `<SetupWizard />` in `src/app/App.tsx`**
- **Found during:** Final success-criterion check.
- **Issue:** Plan 02-08 `files_modified` did not list `src/app/App.tsx`, but the executor's success criterion requires "/setup route renders 3-step wizard". Without route wiring, the criterion is unmet.
- **Fix:** Replaced the Phase 1 `PlaceholderRoute` for `/setup` with `<SetupWizard />`. Other placeholder routes (`/tasks`, `/settings`) and the catch-all are unchanged — Plan 02-10 still owns those.
- **Files modified:** `src/app/App.tsx`.
- **Commit:** `e960130`.

**2. [Rule 3 — Blocking] `react-hooks/set-state-in-effect` lint failures in `useLookupLocation` and `SetupStepLocation`**
- **Found during:** Task 1 verify.
- **Issue:** React 19 ships a new lint rule that forbids synchronous `setState` inside `useEffect` bodies. Initial implementation tripped it in three places: setting loading state in the lookup hook, deriving `zipError` via state+effect, and seeding manual fields from the lookup via effect.
- **Fix:** (a) Lookup hook now uses `queueMicrotask` for the loading transition, keeping the setState out of the effect body. (b) `zipError` is now a synchronously-derived value (no state). (c) Override-flip pre-seeding moved into the event handler (`flipOverride`) — synchronous setState in event handlers is allowed.
- **Files modified:** `src/features/setup/lookupLocation.ts`, `src/features/setup/SetupStepLocation.tsx`.
- **Commit:** `7e4c0f9` (rolled into the Task 1 commit).

### Other adjustments

- `Location.lookupTimestamp` is only set on the result object when `lookup.status === 'ok'` (TS `exactOptionalPropertyTypes` requires omitting the field rather than assigning `undefined`).
- `ZipInputProps.error` type widened to `string | undefined` for the same reason.

No architectural changes; no new dependencies; no schema modifications.

## Authentication / Auth Gates

None. Single-user local app; no network auth.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `SetupStepPlants` placeholder body | `src/features/setup/SetupStepPlants.tsx` | Awaits Plan 02-09's `CatalogBrowser` component. Plan 02-10 will swap the placeholder for `import { CatalogBrowser } from '../catalog/CatalogBrowser'` per the file's TODO comment. Step 2 → Step 3 gate (`plantings.length >= 1`) will remain effectively unreachable through the wizard UI until that swap lands. |

The placeholder is documented in-file with a `TODO(plan-02-10)` comment so future agents see the swap is pending.

## Self-Check: PASSED

- `[ -f src/features/setup/lookupLocation.ts ]` → FOUND
- `[ -f src/features/setup/ZipInput.tsx ]` → FOUND
- `[ -f src/features/setup/SetupStepLocation.tsx ]` → FOUND
- `[ -f src/features/setup/SetupWizard.tsx ]` → FOUND
- `[ -f src/features/setup/SetupStepPlants.tsx ]` → FOUND
- `[ -f src/features/setup/SetupStepReview.tsx ]` → FOUND
- `git log --oneline | grep 7e4c0f9` → FOUND (Task 1)
- `git log --oneline | grep ab6d13d` → FOUND (Task 2)
- `git log --oneline | grep e960130` → FOUND (App.tsx wiring)

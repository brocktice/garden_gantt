---
phase: 02-data-layer-first-end-to-end
plan: 07
subsystem: ui
tags: [radix, shadcn, tailwind-v4, react, typescript, primitives, design-system]

requires:
  - phase: 02-data-layer-first-end-to-end
    provides: Phase 1 @theme tokens (lifecycle palette + gantt spacing) preserved
provides:
  - "shadcn-style hand-authored UI primitive set: Button, Input, Label, Dialog, DropdownMenu, Select, Switch, Toast, Card, Badge"
  - "cn() class composition helper (clsx + tailwind-merge)"
  - "Phase 2 spacing tokens in @theme: --spacing-card-min/card-gap/modal-max-w/panel-w/pill-h/wizard-max-w"
affects:
  - 02-08 (CatalogBrowser) — needs Card, Badge, Input, Button, DropdownMenu
  - 02-09 (Setup Wizard) — needs Dialog, Input, Label, Select, Button
  - 02-10 (CustomPlantModal) — needs Dialog, Input, Select, Button
  - 02-11 (MyPlanPanel + Pill) — needs Switch, Button, DropdownMenu
  - 02-12 (component tests) — tests primitives indirectly through feature components

tech-stack:
  added:
    - "@radix-ui/react-dialog ^1.1.15"
    - "@radix-ui/react-dropdown-menu ^2.1.16"
    - "@radix-ui/react-select ^2.2.6"
    - "@radix-ui/react-checkbox ^1.3.3"
    - "@radix-ui/react-switch ^1.2.6"
    - "@radix-ui/react-label ^2.1.8"
    - "@radix-ui/react-toast ^1.2.15"
    - "@radix-ui/react-slot ^1.2.4"
    - "clsx ^2.1.1"
    - "tailwind-merge ^3.5.0"
  patterns:
    - "shadcn copy-paste primitive pattern: forward Radix sub-components via cn(); no components.json, no `npx shadcn` CLI (Tailwind v4 incompatibility per UI-SPEC §Design System)"
    - "Spacing tokens consumed via Tailwind arbitrary-value syntax: max-w-[var(--spacing-modal-max-w)]"
    - "data-[state=*]:* variants drive open/close transitions (no tailwindcss-animate plugin)"

key-files:
  created:
    - src/ui/cn.ts
    - src/ui/Button.tsx
    - src/ui/Input.tsx
    - src/ui/Label.tsx
    - src/ui/Card.tsx
    - src/ui/Badge.tsx
    - src/ui/Dialog.tsx
    - src/ui/DropdownMenu.tsx
    - src/ui/Select.tsx
    - src/ui/Switch.tsx
    - src/ui/Toast.tsx
  modified:
    - src/index.css
    - eslint.config.js
    - package.json
    - package-lock.json

key-decisions:
  - "Skipped tailwindcss-animate (a v3 plugin); used Tailwind v4 transition-* utilities + data-[state=*] variants for open/close motion"
  - "Disabled react-refresh/only-export-components ESLint rule for src/ui/** since shadcn re-exports of Radix primitives (e.g. `export const Dialog = DialogPrimitive.Root`) are inert passthroughs"
  - "Hand-authored every primitive (no `npx shadcn add`) per UI-SPEC §Design System Tailwind v4 incompatibility rationale"

patterns-established:
  - "src/ui/* — hand-authored shadcn-style primitives layered over Radix; all class composition through cn()"
  - "Phase 2 design tokens in @theme map to Tailwind utility scale (max-w-[var(--spacing-...)]); Phase 1 tokens immutable"
  - "ESLint react-refresh disabled in src/ui/** to permit shadcn pattern; SCH-03 `new Date()` ban remains in force"

requirements-completed: [CAT-03, CAT-04, CAT-05, LOC-05]

duration: ~12min
completed: 2026-04-26
---

# Phase 2 Plan 07: UI Primitives Summary

**shadcn-style Radix-backed primitive set (Button, Input, Label, Card, Badge, Dialog, DropdownMenu, Select, Switch, Toast) + cn helper + Phase 2 @theme spacing tokens, all hand-authored against Tailwind v4 with no shadcn CLI.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-26T23:25Z
- **Completed:** 2026-04-26T23:37Z
- **Tasks:** 3
- **Files created:** 11
- **Files modified:** 4

## Accomplishments

- Installed all 8 Radix primitives + clsx + tailwind-merge in one npm command (276 packages, 0 vulnerabilities)
- Hand-authored 11 src/ui/* files (cn.ts + 10 components) — Button, Input, Label, Card, Badge, Dialog, DropdownMenu, Select, Switch, Toast
- Extended @theme with 6 Phase 2 spacing tokens (--spacing-card-min, --spacing-card-gap, --spacing-modal-max-w, --spacing-panel-w, --spacing-pill-h, --spacing-wizard-max-w) without touching the Phase 1 lifecycle palette or gantt-* spacing
- Verified: tsc --noEmit clean, eslint clean across all src/ui/, Phase 1 vitest suite still 131/131 green

## Task Commits

1. **Task 1: cn helper + presentational primitives (Button, Input, Label, Card, Badge) + Phase 2 tokens** — `36684be` (feat)
2. **Task 2: Dialog + DropdownMenu Radix primitives** — `89f0de3` (feat)
3. **Task 3: Select + Switch + Toast Radix primitives** — `7dfaa89` (feat)

## Files Created/Modified

- `src/ui/cn.ts` — clsx + tailwind-merge composer
- `src/ui/Button.tsx` — primary/secondary/ghost/destructive variants × sm/md/lg sizes; asChild via Radix Slot
- `src/ui/Input.tsx` — 40px height, stone-200 border, green-700 focus ring, aria-invalid red border
- `src/ui/Label.tsx` — Radix Label wrapper
- `src/ui/Card.tsx` — Card, CardHeader, CardBody, CardFooter
- `src/ui/Badge.tsx` — frost-tolerance (tender/half-hardy/hardy), season (cool/warm), source (custom/permapeople/manual) variants
- `src/ui/Dialog.tsx` — Root, Trigger, Portal, Close, Overlay, Content (with X close), Header, Title, Description, Footer
- `src/ui/DropdownMenu.tsx` — Root, Trigger, Portal, Group, Content, Item, Label, Separator
- `src/ui/Select.tsx` — Root, Group, Value, Trigger (Input-styled), Content, Label, Item (with Check indicator), Separator
- `src/ui/Switch.tsx` — Track stone-300 ↔ green-700; thumb translates 1.375rem on check
- `src/ui/Toast.tsx` — Provider, Viewport (bottom-right, max-w 420), Root with success/warning/error variants, Title, Description, Action, Close
- `src/index.css` — Phase 2 @theme spacing tokens appended; Phase 1 palette/spacing untouched
- `eslint.config.js` — Disabled `react-refresh/only-export-components` for src/ui/**
- `package.json`, `package-lock.json` — Radix + clsx + tailwind-merge deps

## Decisions Made

1. **No `tailwindcss-animate`.** That plugin was a Tailwind v3 add-on; Tailwind v4 ships sufficient `transition-*` utilities and Radix exposes `data-[state=open|closed]` attributes that pair cleanly with v4 variant selectors. Sticking with vanilla v4 keeps the dependency surface minimal — UI-SPEC didn't require any specific motion library.
2. **`react-refresh/only-export-components` disabled for src/ui/**.** The shadcn pattern re-exports Radix primitives directly (`export const Dialog = DialogPrimitive.Root`). The rule flags any non-component export, but these are inert references to upstream components and Fast Refresh handles them fine. Scoped exception only — SCH-03 `new Date()` ban remains globally enforced.
3. **`@radix-ui/react-dialog` resolved to ^1.1.15** (not the ^2.1.16 RESEARCH.md cell — that version was actually the dropdown-menu one, mis-aligned in the table; npm resolved Dialog to its current `latest` 1.1.x line). Functionality is identical for our use; semver-major bumps would be a future maintenance concern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESLint `react-refresh/only-export-components` blocked Dialog/DropdownMenu**
- **Found during:** Task 2 verification (`npx eslint src/ui/Dialog.tsx src/ui/DropdownMenu.tsx`)
- **Issue:** 8 errors flagging `export const Dialog = DialogPrimitive.Root` etc. as non-component exports incompatible with Fast Refresh.
- **Fix:** Added a scoped ESLint config block for `src/ui/**/*.{ts,tsx}` that disables only `react-refresh/only-export-components`. SCH-03 (`new Date()` ban) and other rules unchanged.
- **Files modified:** `eslint.config.js`
- **Verification:** `npx eslint src/ui/` clean; full Phase 1 test suite still 131/131 passing.
- **Committed in:** `89f0de3` (Task 2 commit)

**2. [Rule 2 - Missing critical doc] In-file animation rationale comment**
- **Found during:** Task 2 implementation
- **Issue:** Plan called for `data-[state=open]:animate-in` classes (a tailwindcss-animate convention). Tailwind v4 doesn't ship those utilities; rather than introduce a new plugin (extra dep, install step), I used `transition-[opacity,transform]` + `data-[state=closed]:opacity-0 data-[state=closed]:scale-95` etc., which produces equivalent open/close motion in pure v4. Without an inline comment a future maintainer would not know which path was chosen.
- **Fix:** Header doc-comment in Dialog.tsx, DropdownMenu.tsx, Select.tsx, Toast.tsx, Switch.tsx explaining the choice.
- **Files modified:** Same task files.
- **Verification:** Comment visible in source.
- **Committed in:** `89f0de3`, `7dfaa89` (Task 2 + 3 commits)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 documentation/critical)
**Impact on plan:** No scope creep. Both deviations were necessary for clean compilation and downstream maintainability.

## Issues Encountered

None — all three tasks executed on first compile after the ESLint scope fix.

## User Setup Required

None — primitives are pure code, no external configuration.

## Next Phase Readiness

- Wave 3 features (CatalogBrowser, PlantCard, CustomPlantModal, MyPlanPanel, MyPlanPill, SettingsPanel, ImportPreviewModal, Setup Wizard) can now consume `import { Button, Input, Dialog, ... } from '@/ui/...'`.
- `cn()` available everywhere via `import { cn } from '@/ui/cn'`.
- Phase 2 spacing tokens accessible via Tailwind arbitrary-value syntax: `max-w-[var(--spacing-modal-max-w)]`, `min-w-[var(--spacing-card-min)]`, etc.
- Toast Provider/Viewport not yet mounted at app root — that's expected to land in 02-11 (MyPlanPanel) or whichever feature first emits a toast.
- No tests at this layer (deferred to 02-12 component tests, per plan §Output).

## Self-Check: PASSED

All 11 src/ui/* files exist and are tracked:
- FOUND: src/ui/cn.ts
- FOUND: src/ui/Button.tsx
- FOUND: src/ui/Input.tsx
- FOUND: src/ui/Label.tsx
- FOUND: src/ui/Card.tsx
- FOUND: src/ui/Badge.tsx
- FOUND: src/ui/Dialog.tsx
- FOUND: src/ui/DropdownMenu.tsx
- FOUND: src/ui/Select.tsx
- FOUND: src/ui/Switch.tsx
- FOUND: src/ui/Toast.tsx

Commits exist on branch:
- FOUND: 36684be (Task 1)
- FOUND: 89f0de3 (Task 2)
- FOUND: 7dfaa89 (Task 3)

`components.json` does NOT exist (verified): primitives are hand-authored per UI-SPEC.

Phase 1 regression check: `npm test -- --run` → 131/131 passing.

---
*Phase: 02-data-layer-first-end-to-end*
*Plan: 07*
*Completed: 2026-04-26*

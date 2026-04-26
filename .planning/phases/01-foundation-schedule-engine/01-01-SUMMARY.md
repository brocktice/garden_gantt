---
phase: 01-foundation-schedule-engine
plan: 01
subsystem: infra
tags: [vite, react, typescript, tailwind-v4, vitest, eslint, zustand, react-router, date-fns, lucide-react]

# Dependency graph
requires: []
provides:
  - Buildable Vite 8 + React 19 + TS 6 scaffold with locked dep tree
  - Tailwind v4 wired via @tailwindcss/vite (no PostCSS, no tailwind.config.*)
  - Lifecycle palette CSS @theme tokens + TS companion (parity invariant)
  - PlaceholderRoute reusable component (consumed by Plan 07 hash router)
  - public/_redirects Cloudflare Pages SPA fallback (DEPLOY-02 partial)
  - eslint.config.js with no-restricted-syntax rule banning bare new Date() (enforces SCH-03)
  - Strict TS: noUncheckedIndexedAccess + exactOptionalPropertyTypes
  - Vitest 4 wired in vite.config.ts test block (passWithNoTests for empty Phase 1)
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 02, 03, 04]

# Tech tracking
tech-stack:
  added:
    - react@^19.2.5
    - react-dom@^19.2.5
    - vite@^8.0.10
    - typescript@~6.0.2
    - zustand@^5.0.12
    - react-router@^7.14.2
    - date-fns@^4.1.0
    - "@date-fns/utc@^2.1.1"
    - lucide-react@^1.11.0
    - tailwindcss@^4.2.4
    - "@tailwindcss/vite@^4.2.4"
    - vitest@^4.1.5
    - "@vitest/ui@^4.1.5"
    - "@vitejs/plugin-react@^6.0.1"
    - eslint@^10.2.1
    - typescript-eslint@^8.58.2
  patterns:
    - "Tailwind v4 CSS-first @theme block; no JS config file"
    - "Single-config tsconfig.json (no project references); tsconfig.node.json kept for build-tool typing"
    - "ESLint flat-config with file-scoped rule overrides"
    - "Embed Vitest test block in vite.config.ts (no separate vitest.config.ts)"
    - "TS-side companion module (lifecyclePalette.ts) mirrors CSS @theme tokens for SVG render-time fill access"

key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - tsconfig.node.json
    - vite.config.ts
    - eslint.config.js
    - index.html
    - src/main.tsx
    - src/index.css
    - src/vite-env.d.ts
    - src/app/PlaceholderRoute.tsx
    - src/features/gantt/lifecyclePalette.ts
    - public/_redirects
    - public/favicon.svg
    - .gitignore
  modified: []

key-decisions:
  - "Vite scaffolded into garden-gantt-tmp/ then merged into repo root to avoid clobbering CLAUDE.md and .planning/"
  - "Removed scaffolded tsconfig.app.json in favor of single strict tsconfig.json per plan (Step 8); kept tsconfig.node.json for vite.config.ts typing"
  - "Kept scaffold's react-hooks + react-refresh ESLint plugins (useful for React work) and added the SCH-03 no-restricted-syntax rule on top, rather than discarding the scaffold's plugin tree"
  - "Added passWithNoTests: true to vite.config.ts test block so Phase 1 Wave 1 (no test files yet) exits clean"
  - "Added *.tsbuildinfo to .gitignore to keep tsc -b incremental cache out of version control"
  - "Added src/vite-env.d.ts (vite/client triple-reference) to silence TS2882 on the side-effect ./index.css import under strict mode"

patterns-established:
  - "Stack lock: react@^19, vite@^8, typescript@~6.0.2, zustand@^5, date-fns@^4, tailwindcss@^4 — caret ranges (no exact pins) per RESEARCH.md"
  - "Tailwind v4 design tokens: ZERO config files; all tokens live in src/index.css @theme block"
  - "Lifecycle palette parity invariant: 6 hex values exist in BOTH src/index.css (CSS vars) AND src/features/gantt/lifecyclePalette.ts (TS const). Plan 04 will narrow Record<string, string> to Record<EventType, string>"
  - "ESLint SCH-03 enforcement: src/domain/dateWrappers.ts is the only file allowed to call new Date(); src/features/gantt/GanttView.tsx (Plan 08) gets a documented exception for the Today-indicator render"
  - "build script: tsc -b && vite build (typecheck before bundle); test: vitest; lint: eslint ."

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-04-26
---

# Phase 01 Plan 01: Foundation Scaffold Summary

**Vite 8 + React 19 + TS 6 scaffold with locked dep tree, Tailwind v4 wired via the @tailwindcss/vite plugin (no PostCSS, no tailwind.config.*), strict TS plus an ESLint rule banning bare `new Date()` outside the future `dateWrappers.ts`, lifecycle-palette tokens in CSS @theme + TS companion, the reusable `<PlaceholderRoute>` Plan 07 will mount, and a Cloudflare Pages SPA `_redirects` fallback.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-26T19:34:44Z
- **Completed:** 2026-04-26T19:40:45Z
- **Tasks:** 2
- **Files modified:** 13 created (1 of which — package-lock.json — is generated)

## Accomplishments
- Vite scaffold merged cleanly into a non-empty repo (CLAUDE.md and .planning/ preserved untouched)
- All 17 locked deps installed at the caret ranges declared in RESEARCH.md (react@^19.2.5, vite@^8.0.10, ts@~6.0.2, zustand@^5.0.12, react-router@^7.14.2, date-fns@^4.1.0, @date-fns/utc@^2.1.1, lucide-react@^1.11.0, tailwindcss@^4.2.4, @tailwindcss/vite@^4.2.4, vitest@^4.1.5, plus dev tools)
- Strict TS enabled with the two non-default flags the engine purity invariant relies on: `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- ESLint flat-config wired with the SCH-03 enforcement rule (smoke-tested: rule fires on a synthetic violator with the documented error message)
- Tailwind v4 @theme block defines all 6 lifecycle palette hexes (#3B82F6 / #EAB308 / #16A34A / #0D9488 / #A3E635 / #EA580C) and 5 gantt-spacing tokens; `npm run build` proves the plugin processes the block (CSS bundle grew from 1.78kB to 14.95kB after Task 2)
- TS companion `lifecyclePalette.ts` mirrors all 6 hexes 1:1 for the bare-SVG renderer Plan 08 will ship
- `<PlaceholderRoute heading body />` exports the UI-SPEC §Layout Shell §Placeholder route markup verbatim
- `public/_redirects` ships `/* /index.html 200` and is correctly copied to `dist/_redirects` by Vite
- T-01-01 (source-map info-disclosure) mitigated by Vite default — `find dist -name "*.map"` returns 0 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React + TS, install locked deps, write configs** — `30d3995` (chore)
2. **Task 2: Tailwind v4 design tokens + lifecyclePalette TS companion + PlaceholderRoute + Cloudflare _redirects** — `6daf878` (feat)

## Files Created/Modified

### Created
- `package.json` — name + scripts (dev/build/preview/test/lint) + locked dep tree
- `package-lock.json` — generated by `npm install`
- `tsconfig.json` — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes; includes `src` and `tests`
- `tsconfig.node.json` — types build tooling; include = ["vite.config.ts", "vitest.config.ts"]
- `vite.config.ts` — plugins [react(), tailwindcss()], embedded test block (environment: node, passWithNoTests, snapshotFormat: { printBasicPrototype: false })
- `eslint.config.js` — flat-config; extends scaffold (react-hooks, react-refresh, tseslint) and adds the SCH-03 `no-restricted-syntax` rule with file-scoped allowlist (dateWrappers.ts, GanttView.tsx, build configs)
- `index.html` — Vite default + `<title>Garden Gantt</title>`
- `src/main.tsx` — boot-OK h1 stub (Plan 07 replaces with HashRouter shell)
- `src/index.css` — `@import "tailwindcss"` + @theme block (6 lifecycle palette + 5 gantt-spacing tokens) + body baseline (system font stack, stone-50 bg, stone-900 text)
- `src/vite-env.d.ts` — vite/client triple-reference (silences TS2882 on side-effect CSS import)
- `src/app/PlaceholderRoute.tsx` — `{heading, body}` reusable route component per UI-SPEC
- `src/features/gantt/lifecyclePalette.ts` — TS-side companion to CSS @theme tokens, exports `lifecyclePalette: Record<string, string>`
- `public/_redirects` — `/* /index.html 200`
- `public/favicon.svg` — Vite scaffold default
- `.gitignore` — node_modules, dist, dist-ssr, .vite, coverage, *.local, *.tsbuildinfo, editor files

### Modified
None — every file in this plan was net-new.

## Decisions Made

- **Scaffold-into-tmp pattern:** `npm create vite@latest garden-gantt-tmp -- --template react-ts --yes` then `mv` everything into the repo root. The repo root already contained CLAUDE.md and .planning/, and `create-vite` refuses to scaffold into a non-empty directory without `--force` — the documented temp-dir + move dance is cleaner.
- **Single tsconfig.json (no project references):** The Vite scaffold's tsconfig.app.json was deleted per plan Step 8. `tsconfig.node.json` is kept for build-tool typing only. `tsc -b tsconfig.json` works fine on a non-references project (no `references` array, no `composite`, just typecheck).
- **Kept scaffold's React ESLint plugins:** Plan Step 9 specifies a minimal eslint.config.js, but the scaffold's `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` are useful for React Hot Reload sanity. Merged: scaffold extends + the SCH-03 rule on top.
- **`passWithNoTests: true` in Vite test config:** Phase 1 Wave 1 has zero test files; without this flag Vitest exits 1, breaking `npm test -- --run`. Plan 02 will write the first tests; this flag becomes irrelevant once tests exist but stays as a guard.
- **`*.tsbuildinfo` in .gitignore:** `tsc -b` writes incremental build state to `tsconfig.tsbuildinfo` at the repo root by default. Build artifact, not source.
- **`src/vite-env.d.ts` added (not in plan files list explicitly but plan implies):** Plan frontmatter `files_modified` lists `src/vite-env.d.ts` so this is in scope. Strict TS rejects the side-effect `./index.css` import without it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `src/vite-env.d.ts` for CSS side-effect import**
- **Found during:** Task 1 (first `npm run build` attempt)
- **Issue:** `tsc -b` failed with `TS2882: Cannot find module or type declarations for side-effect import of './index.css'`. Strict tsconfig with `noEmit: true` doesn't ship the implicit asset module declarations the Vite scaffold normally provides via `src/vite-env.d.ts`.
- **Fix:** Created `src/vite-env.d.ts` with `/// <reference types="vite/client" />` (the Vite scaffold's exact convention for asset module typing).
- **Files modified:** `src/vite-env.d.ts` (created)
- **Verification:** `npm run build` succeeds; `dist/index.html` and `dist/assets/index-*.js` produced.
- **Committed in:** `30d3995` (Task 1 commit; the file was added before the first commit to make the build green).

**2. [Rule 3 - Blocking] Added `passWithNoTests: true` to Vitest config**
- **Found during:** Task 1 (first `npm test -- --run` attempt)
- **Issue:** Vitest 4 exits 1 when zero test files match the `include` pattern, which fails the success criterion "`npm test -- --run` exits cleanly (zero suites OK)". Phase 1 Wave 1 ships scaffold-only — Plan 02 is the first plan with tests.
- **Fix:** Added `passWithNoTests: true` to the `test:` block in `vite.config.ts`.
- **Files modified:** `vite.config.ts`
- **Verification:** `npm test -- --run` now prints "No test files found, exiting with code 0".
- **Committed in:** `30d3995` (Task 1 commit; added before the first commit).

**3. [Rule 2 - Missing Critical] Added `*.tsbuildinfo` to `.gitignore`**
- **Found during:** Task 1 (post-build `git status`)
- **Issue:** `tsc -b` writes incremental cache to `tsconfig.tsbuildinfo` at the repo root. Build artifact appearing in `git status` would have polluted future commits and risked accidentally being checked in.
- **Fix:** Appended `*.tsbuildinfo` to `.gitignore` (alongside the plan-specified `.vite` and `coverage`).
- **Files modified:** `.gitignore`
- **Verification:** `git status` after `npm run build` no longer shows `tsconfig.tsbuildinfo`.
- **Committed in:** `30d3995` (Task 1 commit).

**4. [Rule 2 - Missing Critical] Cleaned up unused scaffold assets**
- **Found during:** Task 1 (post-scaffold inspection)
- **Issue:** `create-vite` v9 emits more boilerplate than RESEARCH.md anticipated: `src/assets/hero.png`, `src/assets/vite.svg`, `public/icons.svg`, `README.md`. The plan only mentioned removing `src/App.tsx`, `src/App.css`, `public/vite.svg`, `src/assets/react.svg`. Leaving the extras would have polluted the repo with unused binaries and a generic README.
- **Fix:** `rm -rf src/assets/`, `rm public/icons.svg`, `rm README.md`. The remaining `public/favicon.svg` is kept (referenced by `index.html`).
- **Files modified:** None retained from these (deletions only)
- **Verification:** `dist/` build references only `favicon.svg`; no broken asset references.
- **Committed in:** `30d3995` (Task 1 commit; deletions happened pre-commit so they appear as "never existed" in git history, which is the right outcome for fresh scaffold cleanup).

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 missing critical)
**Impact on plan:** All four are bookkeeping fixes around `create-vite@9`'s newer scaffold output and the strict-TS / Vitest CLI defaults that the plan didn't anticipate. None affect the locked stack, the @theme tokens, or the SCH-03 ESLint rule. Zero scope creep.

## Issues Encountered

None beyond the four deviations above. The Tailwind v4 build worked first try on Task 2; the ESLint rule fired correctly on the synthetic violator smoke-test; `dist/_redirects` was correctly copied through by Vite.

## Verification Run

- `npm install` → exits 0 (211 packages, 0 vulnerabilities)
- `npm run build` → exits 0 (dist/index.html + assets/index-*.{css,js} + _redirects + favicon.svg)
- `npm test -- --run` → exits 0 ("No test files found, exiting with code 0")
- `npx eslint src/` → exits 0 (clean)
- `find dist -name "*.map"` → 0 files (T-01-01 mitigated)
- ESLint smoke-test (synthetic `new Date('2026-01-01')` in `src/__rule_test.tsx`) → fires the SCH-03 error as expected
- All 6 lifecycle hex values present in both `src/index.css` and `src/features/gantt/lifecyclePalette.ts` (parity invariant)
- No `tailwind.config.{js,ts,cjs}` at repo root (Tailwind v4 @theme-only discipline; PITFALLS §9)
- `public/_redirects` and `dist/_redirects` both contain `/* /index.html 200`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 01-02 (UTC-noon date primitive `dateWrappers.ts` + DST/leap/year-rollover unit tests) is unblocked:
- Vitest 4 is wired and passes with zero suites — first test file Plan 02 writes will run immediately
- `date-fns@^4.1.0` and `@date-fns/utc@^2.1.1` are installed
- ESLint SCH-03 rule is live: Plan 02's `src/domain/dateWrappers.ts` is on the allowlist; every other file across all future plans will reject bare `new Date()`
- `src/domain/` directory does not exist yet — Plan 02 creates it

Plan 01-07 (HashRouter shell) is partially unblocked:
- `<PlaceholderRoute>` is exportable and ready to mount
- `react-router@^7.14.2` is installed
- `public/_redirects` is in place; full DEPLOY-02 lights up once Plan 07 wires the four hash routes (#/setup, #/plan, #/tasks, #/settings)

Plan 01-08 (bare-SVG GanttView) is partially unblocked:
- `lifecyclePalette` import target exists; Plan 04 will narrow its `Record<string, string>` to `Record<EventType, string>` once `domain/types.ts` ships
- `--spacing-gantt-*` CSS vars are queryable from any descendant element via `var(--spacing-gantt-row-height)` etc.
- The render-time `new Date()` exception for `src/features/gantt/GanttView.tsx` is already documented in `eslint.config.js` so Plan 08 won't need a config change

## Self-Check: PASSED

All claimed files exist on disk:
- `package.json` FOUND
- `package-lock.json` FOUND
- `tsconfig.json` FOUND
- `tsconfig.node.json` FOUND
- `vite.config.ts` FOUND
- `eslint.config.js` FOUND
- `index.html` FOUND
- `src/main.tsx` FOUND
- `src/index.css` FOUND
- `src/vite-env.d.ts` FOUND
- `src/app/PlaceholderRoute.tsx` FOUND
- `src/features/gantt/lifecyclePalette.ts` FOUND
- `public/_redirects` FOUND
- `public/favicon.svg` FOUND
- `.gitignore` FOUND

All claimed commits exist in `git log`:
- `30d3995` FOUND (chore(01-01): scaffold Vite 8 + React 19 + TS 6 with locked deps)
- `6daf878` FOUND (feat(01-01): wire Tailwind v4 design tokens, lifecycle palette, PlaceholderRoute, SPA redirects)

---
*Phase: 01-foundation-schedule-engine*
*Completed: 2026-04-26*

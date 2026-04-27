---
phase: 02-data-layer-first-end-to-end
plan: 11
subsystem: settings/export-import
tags: [export, import, settings, migration, zod, radix-dialog]
requires:
  - src/domain/schemas.ts (ExportEnvelopeSchema, GardenPlanSchema)
  - src/domain/migrations.ts (migrateToCurrent — Pitfall E shared module)
  - src/domain/dateWrappers.ts (nowISOString)
  - src/stores/planStore.ts (replacePlan)
  - src/ui/Dialog.tsx (Radix wrapper)
  - src/ui/Button.tsx (variant=destructive for POL-06)
provides:
  - exportPlan() — anchor-click JSON download with v2 envelope
  - parseImportFile(file) — Zod-validated ImportResult discriminated union
  - SettingsPanel — /settings route content
  - ImportPreviewModal — destructive-overwrite confirmation dialog
affects:
  - src/app/App.tsx (route swap: PlaceholderRoute → SettingsPanel)
tech-stack:
  added: []
  patterns:
    - "Pure browser-API export pattern (Blob + URL.createObjectURL + anchor click)"
    - "Two-stage Zod validation (envelope, then plan post-migration)"
    - "Pre-Zod schemaVersion check to distinguish newer-version from invalid-schema"
    - "Pitfall E: single migrateToCurrent shared between persist.migrate and importPlan"
key-files:
  created:
    - src/features/settings/exportPlan.ts
    - src/features/settings/importPlan.ts
    - src/features/settings/ImportPreviewModal.tsx
    - src/features/settings/SettingsPanel.tsx
    - tests/features/settings/exportPlan.test.ts
    - tests/features/settings/importPlan.test.ts
  modified:
    - src/app/App.tsx
decisions:
  - "Pre-Zod schemaVersion guard surfaces newer-version distinctly. ExportEnvelopeSchema's z.union([1,2]) would otherwise collapse v3+ into invalid-schema, hiding the recoverable 'update the app' UX."
  - "ImportResult.detail is omitted (not undefined) when no Zod issue message exists, to satisfy exactOptionalPropertyTypes."
  - "Migration call wraps unknown plan into { plan } to match the persist-state shape migrations operate on, then unwraps post-migration. Single source of truth for the v1->v2 transform."
metrics:
  duration_minutes: 6
  completed_date: 2026-04-26
---

# Phase 02 Plan 11: Settings Page + Export/Import Summary

JSON export/import with Zod-validated envelope, shared v1->v2 migration, and Radix-based overwrite confirmation — closes Phase 2 success criteria #4 (round-trip restore) and #5 (state survives reload).

## What Shipped

- `src/features/settings/exportPlan.ts` — pure browser-API export. Builds `{ app: 'garden-gantt', version: '0.2', schemaVersion: 2, exportedAt, plan }`, Zod-validates the envelope, downloads `garden-gantt-plan-{YYYY-MM-DD}.json` via anchor click. Returns `{ ok: false, reason: 'No plan to export' }` when `plan === null`.
- `src/features/settings/importPlan.ts` — `parseImportFile(file)` returns an `ImportResult` discriminated union: `invalid-json` on JSON.parse failure, `newer-version` when `schemaVersion > 2` (caught pre-Zod so the union {1,2} doesn't swallow it), `invalid-schema` on envelope or post-migration plan failure. v1 envelopes flow through `migrateToCurrent` from `src/domain/migrations.ts` (Pitfall E shared module) before `GardenPlanSchema.safeParse`.
- `src/features/settings/SettingsPanel.tsx` — `/settings` route content. Heading + Export section (primary green-700 button + last-exported caption) + Import section (secondary button + hidden file input + inline error region). UI-SPEC §9 copy verbatim. Inline errors per the UI-SPEC error table for `invalid-json` / `invalid-schema` / `newer-version`.
- `src/features/settings/ImportPreviewModal.tsx` — Radix `Dialog` summarising N plantings, M custom plants, ZIP/zone, with explicit "OVERWRITE" warning. Shows amber-50 warning when current plan has plantings. Cancel (ghost) + "Replace my plan" (red-700 destructive) per POL-06.
- `src/app/App.tsx` — `/settings` route swapped from `PlaceholderRoute` to `<SettingsPanel />`. No other route changes.

## Verification

| Gate | Result |
|------|--------|
| `npx vitest run` (full suite) | 141 passed (8 new in settings) |
| `npx tsc --noEmit` | clean |
| `npx eslint src/features/settings/ src/app/App.tsx` | clean |
| `npx vite build` | succeeds (539 kB JS, 32 kB CSS) |
| Round-trip test | export → parse → deep-equal plan |
| v1→v2 migration test | `schemaVersion: 2`, `location.overrides: {}`, `successionEnabled: false` on every planting |
| `/settings` route | `PlaceholderRoute heading="Settings"` removed; `SettingsPanel` rendered |

## Plan Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| RED | Failing tests for exportPlan + parseImportFile | 7eb893a | tests/features/settings/{exportPlan,importPlan}.test.ts |
| 1 (GREEN) | exportPlan + parseImportFile (D-27/D-28/D-29) | 4cda1b9 | src/features/settings/{exportPlan,importPlan}.ts |
| 2 | SettingsPanel + ImportPreviewModal + /settings route swap | cbc9c9e | src/features/settings/{SettingsPanel.tsx,ImportPreviewModal.tsx}, src/app/App.tsx |

## Deviations from Plan

**1. [Rule 1 — Bug] `exactOptionalPropertyTypes` strictness for `detail` field**
- **Found during:** Task 1 GREEN phase (post-test, on `npx tsc --noEmit`).
- **Issue:** The plan's literal RESEARCH.md §Pattern 6 implementation built `{ ok: false, reason: 'invalid-schema', detail: env.error.issues[0]?.message }`, which produces `detail: string | undefined`. Project tsconfig has `exactOptionalPropertyTypes: true`, which rejects assigning `undefined` to an optional `string` property.
- **Fix:** Conditionally include `detail` only when a non-undefined message exists.
- **Files:** `src/features/settings/importPlan.ts`
- **Commit:** 4cda1b9

**2. [Rule 1 — Correctness] Pre-Zod `schemaVersion` guard for newer-version distinction**
- **Found during:** Task 1 RED test design.
- **Issue:** `ExportEnvelopeSchema` declares `schemaVersion: z.union([z.literal(1), z.literal(2)])`. A v3 file fails the union and surfaces as `invalid-schema`, masking the recoverable "update the app" UX (UI-SPEC §9 error table calls for a distinct `newer-version` message).
- **Fix:** Inspect `parsed.schemaVersion` ahead of `ExportEnvelopeSchema.safeParse`; return `newer-version` when the literal value exceeds `CURRENT_SCHEMA_VERSION`. This is documented in the `parseImportFile` test as accepting either `newer-version` or `invalid-schema` to keep the test stable if the schema is later widened.
- **Files:** `src/features/settings/importPlan.ts`
- **Commit:** 4cda1b9

**3. [Rule 1 — Bug] Sample plan deep-clone in test**
- **Found during:** Task 1 RED.
- **Issue:** Calling `usePlanStore.getState().replacePlan(samplePlan)` shares the module-level frozen reference with the store, which then leaks across test cases.
- **Fix:** Wrap with `structuredClone(samplePlan)` in the test (mirrors `loadSamplePlan` setter).
- **Files:** `tests/features/settings/exportPlan.test.ts`
- **Commit:** 7eb893a

## Threat Surface Coverage

| Threat ID | Disposition | Mitigation Implemented |
|-----------|-------------|------------------------|
| T-02-34 (Tampering: crafted import JSON) | mitigate | Two-stage Zod validation (envelope + plan post-migration). All four reject paths return without mutating state. Tested. |
| T-02-35 (Spoofing: claimed v2 with v1 shape) | mitigate | `GardenPlanSchema` is v2-strict (`schemaVersion: z.literal(2)`); migration always runs for v1 envelopes. Loose v1 plans are rejected post-migration. |
| T-02-36 (Repudiation: accidental overwrite) | mitigate | `ImportPreviewModal` blocks `replacePlan` behind explicit red-700 confirmation; amber warning surfaces when current plan has plantings. |
| T-02-37 (Information disclosure) | accept | Single-user app, no PII; ZIP + plant choices only. |

## Authentication Gates

None.

## Self-Check

| Claim | Verification |
|-------|--------------|
| `src/features/settings/exportPlan.ts` exists | FOUND |
| `src/features/settings/importPlan.ts` exists | FOUND |
| `src/features/settings/SettingsPanel.tsx` exists | FOUND |
| `src/features/settings/ImportPreviewModal.tsx` exists | FOUND |
| `tests/features/settings/exportPlan.test.ts` exists | FOUND |
| `tests/features/settings/importPlan.test.ts` exists | FOUND |
| Commit 7eb893a | FOUND |
| Commit 4cda1b9 | FOUND |
| Commit cbc9c9e | FOUND |

## Self-Check: PASSED

## TDD Gate Compliance

- RED commit: `7eb893a test(02-11): add failing tests for exportPlan + parseImportFile`
- GREEN commit: `4cda1b9 feat(02-11): exportPlan + parseImportFile (D-27/D-28/D-29)`
- REFACTOR: not needed — implementation matched RESEARCH §Pattern 6 closely; only the deviation fixes above were applied.

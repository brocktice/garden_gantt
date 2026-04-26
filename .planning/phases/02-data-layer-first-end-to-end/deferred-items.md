# Phase 02 — Deferred Items

Issues discovered during plan execution that are out-of-scope for the current task.

## From Plan 02-02 (executed 2026-04-26)

### Pre-existing lint issues (not caused by 02-02)

- `src/domain/constraints.ts:28` — `'_plant' is defined but never used` (`@typescript-eslint/no-unused-vars`).
  Existed before Plan 02-02 began; not modified by this plan.
- `src/domain/dateWrappers.ts:25, 74, 87, 96` — `Unused eslint-disable directive` warnings on the
  `eslint-disable-next-line no-restricted-syntax` markers. Suggests the no-restricted-syntax rule
  no longer triggers because eslint config scope changed elsewhere. Pre-existing; not modified by
  this plan.

These should be addressed in a focused lint-cleanup plan or rolled into the next plan that touches
those files. They do not block 02-02 success criteria.

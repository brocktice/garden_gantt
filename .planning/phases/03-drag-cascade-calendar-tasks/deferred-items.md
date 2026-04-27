# Deferred Items — Phase 3

Items discovered during plan execution that are out of scope for the current task.

## Pre-existing lint warnings/errors (discovered Plan 03-02)

- `src/domain/constraints.ts:28:32` error `'_plant' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- `src/domain/dateWrappers.ts:25,74,87,96` 4 warnings: `Unused eslint-disable directive (no problems were reported from 'no-restricted-syntax')`

**Status:** Pre-existing on the wave-1 base commit. Not introduced by Plan 03-02. Likely
resolved by Plan 03-01 (which extends `constraints.ts` with new rules — the unused `_plant`
parameter will become used in `harvestMustFollowTransplantByDTM`). The dateWrappers
disable-directive warnings come from a recent ESLint config tightening; safe to either
remove the directives or scope them more narrowly. Defer to a polish pass.

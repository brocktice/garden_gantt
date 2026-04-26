# Phase 01 Deferred Items

Items discovered during execution that are out-of-scope for the originating plan.

## From Plan 01-05 (2026-04-26)

- **Lint:** `src/domain/constraints.ts:28` — `'_plant' is defined but never used` (`@typescript-eslint/no-unused-vars`). Pre-existing from Plan 01-04. The `_plant` parameter in `noTransplantBeforeLastFrostForTender.check` is part of the rule signature (used by other rules); leading-underscore convention should suppress but ESLint's `no-unused-vars` rule doesn't honor it without explicit `argsIgnorePattern: '^_'` config. Fix: add ESLint override OR rename to remove unused parameter.
- **Lint warning:** `src/domain/dateWrappers.ts:25` — unused `eslint-disable` directive. Pre-existing from Plan 01-02. Likely a stale comment after a rule was renamed/removed.

Both are cosmetic; tests + tsc pass cleanly.

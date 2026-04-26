// src/domain/migrations.ts
// Single source of truth for schema-version migrations. Imported by BOTH
// stores/planStore.ts (Zustand `persist.migrate`) AND
// features/settings/importPlan.ts (v1-export migration on import).
// Pitfall E (RESEARCH.md): do not duplicate this logic in either consumer.
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.

import type { GardenPlan } from './types';

export const CURRENT_SCHEMA_VERSION = 2;

export type AnyVersionedPlan = unknown;

/**
 * Walk the migration chain from `fromVersion + 1` through `CURRENT_SCHEMA_VERSION`.
 * Caller (planStore persist.migrate, or importPlan) is responsible for Zod validation
 * of the post-migration result.
 *
 * Returns `unknown` because input may be the persist wrapper `{ plan: ... }` OR raw plan;
 * caller validates via GardenPlanSchema after.
 */
export function migrateToCurrent(
  state: AnyVersionedPlan,
  fromVersion: number,
): unknown {
  let s: unknown = state;
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const m = migrations[v];
    if (m) s = m(s);
  }
  return s;
}

const migrations: Record<number, (s: unknown) => unknown> = {
  // 1 → 2: location.overrides defaults to {}; plantings get successionEnabled: false
  // (safe default — no surprise expansion on migrate, per RESEARCH.md line 678).
  2: (state: unknown) => {
    if (!state || typeof state !== 'object') return state;
    const obj = state as { plan?: GardenPlan | null };
    if (!obj.plan) return { ...obj, plan: null };
    return {
      ...obj,
      plan: {
        ...obj.plan,
        schemaVersion: 2,
        location: { ...obj.plan.location, overrides: {} },
        plantings: obj.plan.plantings.map((p) => ({
          ...p,
          successionEnabled: false,
        })),
      },
    };
  },
};

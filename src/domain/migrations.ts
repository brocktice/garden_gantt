// src/domain/migrations.ts
// Single source of truth for schema-version migrations. Imported by BOTH
// stores/planStore.ts (Zustand `persist.migrate`) AND
// features/settings/importPlan.ts (v1-export migration on import).
// Pitfall E (RESEARCH.md): do not duplicate this logic in either consumer.
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.

import type { EventType, GardenPlan } from './types';

export const CURRENT_SCHEMA_VERSION = 3;

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

// Pre-v3 plan shape used by the v2→v3 migration step (no `locks` field, no `completedTaskIds`).
// Mirror of GardenPlan but with mutable `schemaVersion` so we can stamp the new value.
type PreV3Planting = {
  id: string;
  plantId: string;
  label?: string;
  successionIndex: number;
  notes?: string;
  successionEnabled?: boolean;
  startOffsetDays?: number;
  locks?: Partial<Record<EventType, boolean>>;
};
type PreV3Plan = Omit<GardenPlan, 'schemaVersion' | 'plantings' | 'completedTaskIds'> & {
  schemaVersion: number;
  plantings: PreV3Planting[];
  completedTaskIds?: string[];
};

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
  // 2 → 3 (Phase 3 D-13 + D-36): default plantings[].locks to {}; default
  // completedTaskIds to []. Use `??` defaulting (NOT overwrite) so re-running
  // the v3 step on an already-v3 plan preserves user data.
  // Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-13, D-36]
  //         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pitfall 10]
  3: (state: unknown) => {
    if (!state || typeof state !== 'object') return state;
    const obj = state as { plan?: PreV3Plan | null };
    if (!obj.plan) return { ...obj, plan: null };
    return {
      ...obj,
      plan: {
        ...obj.plan,
        schemaVersion: 3,
        plantings: obj.plan.plantings.map((p) => ({
          ...p,
          locks: p.locks ?? {},
        })),
        completedTaskIds: obj.plan.completedTaskIds ?? [],
      },
    };
  },
};

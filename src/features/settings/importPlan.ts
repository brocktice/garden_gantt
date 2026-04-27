// src/features/settings/importPlan.ts
// FileReader + Zod parse + migrateToCurrent + structured ImportResult.
// Source: [CITED: 02-RESEARCH.md §Pattern 6 lines 940-992]
//         [CITED: 02-11-PLAN.md Task 1]
//         [CITED: 02-CONTEXT.md D-28, D-29]
//
// Pitfall E: shares migrateToCurrent with src/stores/planStore.ts (persist.migrate).
// DO NOT duplicate v1->v2 migration logic here — the only call site is migrateToCurrent.

import { ExportEnvelopeSchema, GardenPlanSchema } from '../../domain/schemas';
import { migrateToCurrent } from '../../domain/migrations';
import type { GardenPlan } from '../../domain/types';

export type ImportResult =
  | {
      ok: true;
      plan: GardenPlan;
      meta: {
        plantingsCount: number;
        customPlantsCount: number;
        zip: string;
        zone: string;
        needsMigration: boolean;
      };
    }
  | {
      ok: false;
      reason: 'invalid-json' | 'invalid-schema' | 'newer-version';
      detail?: string;
    };

const CURRENT_SCHEMA_VERSION = 2;

export async function parseImportFile(file: File): Promise<ImportResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  // Pre-check schemaVersion BEFORE Zod envelope validation so we can distinguish
  // newer-version from invalid-schema for known shapes (the Zod union {1,2} otherwise
  // collapses everything-not-matching into invalid-schema).
  if (
    parsed &&
    typeof parsed === 'object' &&
    typeof (parsed as { schemaVersion?: unknown }).schemaVersion === 'number'
  ) {
    const v = (parsed as { schemaVersion: number }).schemaVersion;
    if (v > CURRENT_SCHEMA_VERSION) {
      return { ok: false, reason: 'newer-version' };
    }
  }

  const env = ExportEnvelopeSchema.safeParse(parsed);
  if (!env.success) {
    const detail = env.error.issues[0]?.message;
    return detail
      ? { ok: false, reason: 'invalid-schema', detail }
      : { ok: false, reason: 'invalid-schema' };
  }

  // Apply migration when schemaVersion === 1.
  // migrateToCurrent expects the persist-state shape `{ plan: ... }`; wrap then unwrap.
  let planObj: unknown = env.data.plan;
  const needsMigration = env.data.schemaVersion === 1;
  if (needsMigration) {
    const wrapped = migrateToCurrent({ plan: planObj }, 1);
    planObj = (wrapped as { plan?: unknown }).plan;
  }

  const planResult = GardenPlanSchema.safeParse(planObj);
  if (!planResult.success) {
    const detail = planResult.error.issues[0]?.message;
    return detail
      ? { ok: false, reason: 'invalid-schema', detail }
      : { ok: false, reason: 'invalid-schema' };
  }

  const validPlan = planResult.data as GardenPlan;
  return {
    ok: true,
    plan: validPlan,
    meta: {
      plantingsCount: validPlan.plantings.length,
      customPlantsCount: validPlan.customPlants.length,
      zip: validPlan.location.zip,
      zone: validPlan.location.zone,
      needsMigration,
    },
  };
}

// src/domain/schemas.ts
// Runtime Zod validation schemas for Phase 2 import/export and persist rehydration.
// Parallel-maintained alongside src/domain/types.ts (per RESEARCH.md §Pattern 3 line 536):
// types.ts is the canonical declaration; this file is the runtime mirror.
// Source: [VERIFIED: zod v4 docs zod.dev/v4]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 3]
//
// Purity: zero React/Zustand/I/O. Pure schema definitions only.
import { z } from 'zod';

// ISO date at UTC noon: "YYYY-MM-DDT12:00:00.000Z" (Phase 1 storage convention).
const isoUtcNoonDate = z.string().regex(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/);

export const FrostToleranceSchema = z.enum(['tender', 'half-hardy', 'hardy']);
export const SeasonSchema = z.enum(['cool', 'warm']);
export const PlantCategorySchema = z.enum([
  'fruiting-vegetable',
  'leafy-green',
  'root',
  'brassica',
  'legume',
  'allium',
  'herb',
  'other',
]);
export const PlantSourceSchema = z.enum(['curated', 'custom', 'permapeople']);

export const PlantTimingSchema = z.object({
  startMethod: z.enum(['direct-sow', 'indoor-start', 'either']),
  weeksIndoorBeforeLastFrost: z.number().int().min(0).max(16).optional(),
  transplantOffsetDaysFromLastFrost: z.number().int().min(-60).max(60).optional(),
  directSowOffsetDaysFromLastFrost: z.number().int().min(-90).max(365).optional(),
  daysToGermination: z
    .tuple([z.number().int().min(1), z.number().int().min(1)])
    .optional(),
  daysToHardenOff: z.number().int().min(0).max(30).optional(),
  daysToMaturity: z.number().int().min(1).max(400), // Pitfall D — never zero
  harvestWindowDays: z.number().int().min(1).max(120),
  successionIntervalDays: z.number().int().min(1).max(60).optional(),
  maxSuccessions: z.number().int().min(1).max(20).optional(),
  frostTolerance: FrostToleranceSchema,
  cutoffDaysBeforeFirstFrost: z.number().int().min(0).max(120).optional(),
  hasFlowering: z.boolean(),
  requiresHardening: z.boolean(),
  // Phase 2 (D-09): season classification used by catalog filter chips (Plan 02-09).
  season: SeasonSchema,
});

export const PlantSchema = z.object({
  id: z.string().min(1),
  source: PlantSourceSchema,
  name: z.string().min(1),
  scientificName: z.string().optional(),
  category: PlantCategorySchema,
  timing: PlantTimingSchema,
  // Phase 2 widens beyond Phase 1's empty {} so Permapeople enrichment can flow through.
  enrichment: z.record(z.string(), z.unknown()).optional(),
});

export const LocationSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  zone: z.string().regex(/^\d{1,2}[ab]$/),
  lastFrostDate: isoUtcNoonDate,
  firstFrostDate: isoUtcNoonDate,
  source: z.enum(['lookup', 'manual']),
  lookupTimestamp: z.string().optional(),
  // Phase 2 (D-05): per-field override flags for manual overrides on derived values.
  overrides: z
    .object({
      zone: z.boolean().optional(),
      lastFrostDate: z.boolean().optional(),
      firstFrostDate: z.boolean().optional(),
    })
    .optional(),
});

export const PlantingSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  label: z.string().optional(),
  successionIndex: z.number().int().min(0),
  // Phase 2 (D-21): toggle for engine pre-pass succession expansion.
  successionEnabled: z.boolean().optional(),
  // Phase 2 (Plan 02-10): per-planting day-offset applied to the engine anchor. Set by
  // expandSuccessions on derived plantings; never user-input. Allow negatives in case a
  // future feature stages succession backwards from the anchor.
  startOffsetDays: z.number().int().optional(),
  notes: z.string().optional(),
  // Phase 3 (D-13): per-event-type lock map. Optional during the v2→v3 transition; Plan
  // 03-01 migration defaults to `{}`. Use z.string() for the key (full EventType enum is
  // over-constrained at the Zod surface — TS narrowing on read enforces correctness).
  locks: z.record(z.string(), z.boolean()).optional(),
});

export const GardenPlanSchema = z.object({
  schemaVersion: z.literal(2), // Phase 2 strict — v1 only enters via ExportEnvelope migration
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  location: LocationSchema,
  customPlants: z.array(PlantSchema),
  plantings: z.array(PlantingSchema),
  customTasks: z.array(z.unknown()), // Phase 3 will tighten
  edits: z.array(z.unknown()), // Phase 3 will tighten
  // Phase 3 (D-36): per-task-occurrence completion log. Optional during v2→v3 transition;
  // Plan 03-01 migration defaults to `[]` for legacy persisted plans.
  completedTaskIds: z.array(z.string()).optional(),
  settings: z.object({
    units: z.enum(['imperial', 'metric']),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    timezone: z.string(),
  }),
});

// Top-level export envelope (D-27). Accepts schemaVersion 1 or 2 — v1 triggers
// migration before the inner plan is validated against GardenPlanSchema (v2-strict).
export const ExportEnvelopeSchema = z.object({
  app: z.literal('garden-gantt'),
  version: z.string(), // app semver, e.g. '0.2'
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  plan: z.unknown(), // schema-versioned; validated AFTER migration in Plan 02-11
});

export type GardenPlanV2 = z.infer<typeof GardenPlanSchema>;
export type ExportEnvelope = z.infer<typeof ExportEnvelopeSchema>;

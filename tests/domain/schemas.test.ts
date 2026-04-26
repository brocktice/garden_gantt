// tests/domain/schemas.test.ts
// Runtime validation contract for Phase 2 import/export (DATA-04, DATA-05).
// Source: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 3
//         .planning/phases/02-data-layer-first-end-to-end/02-01-PLAN.md Task 2
import { describe, it, expect } from 'vitest';
import {
  GardenPlanSchema,
  ExportEnvelopeSchema,
  PlantSchema,
  PlantTimingSchema,
  LocationSchema,
  PlantingSchema,
} from '../../src/domain/schemas';
import { samplePlan } from '../../src/samplePlan';

describe('GardenPlanSchema — accepts the canonical sample plan', () => {
  it('parses src/samplePlan.ts (schemaVersion: 2)', () => {
    const result = GardenPlanSchema.safeParse(samplePlan);
    expect(result.success).toBe(true);
  });

  it('accepts a plan with location.overrides: {} (Phase 2 D-05)', () => {
    const plan = { ...samplePlan, location: { ...samplePlan.location, overrides: {} } };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('accepts a plan with location.overrides: { zone: true }', () => {
    const plan = {
      ...samplePlan,
      location: { ...samplePlan.location, overrides: { zone: true } },
    };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('GardenPlanSchema — rejects invalid shapes', () => {
  it('rejects schemaVersion: 1 (Phase 2 strict — v1 only enters via ExportEnvelope migration)', () => {
    const plan = { ...samplePlan, schemaVersion: 1 };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects daysToMaturity: 0 on a custom plant (Pitfall D — divide by zero downstream)', () => {
    const badPlant = {
      id: 'bad',
      source: 'custom',
      name: 'Bad',
      category: 'other',
      timing: {
        startMethod: 'direct-sow',
        daysToMaturity: 0, // < 1 → reject
        harvestWindowDays: 14,
        frostTolerance: 'tender',
        hasFlowering: false,
        requiresHardening: false,
        season: 'warm',
      },
    };
    const plan = { ...samplePlan, customPlants: [badPlant] };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects a plan missing location.zip', () => {
    const { ...loc } = samplePlan.location;
    delete (loc as { zip?: string }).zip;
    const plan = { ...samplePlan, location: loc };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects a plan with non-numeric ZIP', () => {
    const plan = { ...samplePlan, location: { ...samplePlan.location, zip: 'abc12' } };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects an unknown frostTolerance value on a custom plant', () => {
    const badPlant = {
      id: 'bad',
      source: 'custom',
      name: 'Bad',
      category: 'other',
      timing: {
        startMethod: 'direct-sow',
        daysToMaturity: 50,
        harvestWindowDays: 14,
        frostTolerance: 'wrong', // not in enum
        hasFlowering: false,
        requiresHardening: false,
        season: 'warm',
      },
    };
    const plan = { ...samplePlan, customPlants: [badPlant] };
    expect(GardenPlanSchema.safeParse(plan).success).toBe(false);
  });
});

describe('ExportEnvelopeSchema — versioned import wrapper (D-27)', () => {
  it('parses a v2 envelope with a valid plan', () => {
    const env = {
      app: 'garden-gantt',
      version: '0.2',
      schemaVersion: 2,
      exportedAt: '2026-04-26T17:00:00.000Z',
      plan: samplePlan,
    };
    expect(ExportEnvelopeSchema.safeParse(env).success).toBe(true);
  });

  it('parses a v1 envelope with a v1-shaped plan (envelope OK; plan validated AFTER migration)', () => {
    const env = {
      app: 'garden-gantt',
      version: '0.1',
      schemaVersion: 1,
      exportedAt: '2026-01-15T12:00:00.000Z',
      plan: { schemaVersion: 1, anything: 'goes' },
    };
    expect(ExportEnvelopeSchema.safeParse(env).success).toBe(true);
  });

  it('rejects app: "wrong"', () => {
    const env = {
      app: 'wrong',
      version: '0.2',
      schemaVersion: 2,
      exportedAt: '2026-04-26T17:00:00.000Z',
      plan: samplePlan,
    };
    expect(ExportEnvelopeSchema.safeParse(env).success).toBe(false);
  });

  it('rejects schemaVersion: 3 (out of accepted range)', () => {
    const env = {
      app: 'garden-gantt',
      version: '0.2',
      schemaVersion: 3,
      exportedAt: '2026-04-26T17:00:00.000Z',
      plan: samplePlan,
    };
    expect(ExportEnvelopeSchema.safeParse(env).success).toBe(false);
  });
});

describe('Schema sub-modules export', () => {
  it('PlantSchema, PlantTimingSchema, LocationSchema, PlantingSchema are all defined', () => {
    expect(PlantSchema).toBeDefined();
    expect(PlantTimingSchema).toBeDefined();
    expect(LocationSchema).toBeDefined();
    expect(PlantingSchema).toBeDefined();
  });
});

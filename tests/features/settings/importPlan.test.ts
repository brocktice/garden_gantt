/**
 * @vitest-environment happy-dom
 */
// tests/features/settings/importPlan.test.ts
// D-28/D-29 parse + Zod validate + migrateToCurrent for v1 envelopes.
// Source: [CITED: 02-11-PLAN.md Task 1]
//         [CITED: 02-RESEARCH.md §Pattern 6]
import { describe, it, expect } from 'vitest';

import { parseImportFile } from '../../../src/features/settings/importPlan';
import { samplePlan } from '../../../src/samplePlan';

function makeFile(content: string): File {
  return new File([content], 'plan.json', { type: 'application/json' });
}

describe('parseImportFile', () => {
  it('returns invalid-json on bogus content', async () => {
    const r = await parseImportFile(makeFile('not-json'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-json');
  });

  it('returns invalid-schema on JSON missing envelope fields', async () => {
    const r = await parseImportFile(makeFile(JSON.stringify({ foo: 'bar' })));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-schema');
  });

  it('rejects schemaVersion outside the {1,2} union (newer-version OR invalid-schema)', async () => {
    // ExportEnvelopeSchema accepts only 1|2; schemaVersion: 3 fails the union — surfaces
    // as invalid-schema. The dedicated newer-version branch is reachable only if the schema
    // were widened. Either result is an acceptable rejection.
    const env = JSON.stringify({
      app: 'garden-gantt',
      version: '0.3',
      schemaVersion: 3,
      exportedAt: 'x',
      plan: {},
    });
    const r = await parseImportFile(makeFile(env));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(['newer-version', 'invalid-schema']).toContain(r.reason);
    }
  });

  it('round-trip: a v2 envelope deep-equals the input plan after parse', async () => {
    const env = {
      app: 'garden-gantt',
      version: '0.2',
      schemaVersion: 2,
      exportedAt: '2026-04-26T12:00:00.000Z',
      plan: samplePlan,
    };
    const r = await parseImportFile(makeFile(JSON.stringify(env)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan).toEqual(samplePlan);
      expect(r.meta.plantingsCount).toBe(samplePlan.plantings.length);
      expect(r.meta.customPlantsCount).toBe(samplePlan.customPlants.length);
      expect(r.meta.zip).toBe(samplePlan.location.zip);
      expect(r.meta.zone).toBe(samplePlan.location.zone);
      expect(r.meta.needsMigration).toBe(false);
    }
  });

  it('v1 envelope migrates to v2 via shared migrateToCurrent (Pitfall E)', async () => {
    // Build a v1-shaped plan: schemaVersion: 1, no location.overrides, no successionEnabled
    // on plantings. Wrap in v1 envelope.
    const v1Plan = {
      schemaVersion: 1,
      id: 'v1-plan',
      name: 'V1 Plan',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
      location: {
        zip: '20001',
        zone: '7a',
        lastFrostDate: '2026-04-15T12:00:00.000Z',
        firstFrostDate: '2026-10-20T12:00:00.000Z',
        source: 'manual' as const,
      },
      customPlants: [],
      plantings: [
        { id: 'p1', plantId: 'tomato', successionIndex: 0 },
        { id: 'p2', plantId: 'lettuce', successionIndex: 0 },
      ],
      customTasks: [],
      edits: [],
      settings: {
        units: 'imperial' as const,
        weekStartsOn: 0 as const,
        timezone: 'America/New_York',
      },
    };

    const env = {
      app: 'garden-gantt',
      version: '0.1',
      schemaVersion: 1,
      exportedAt: '2026-04-26T12:00:00.000Z',
      plan: v1Plan,
    };
    const r = await parseImportFile(makeFile(JSON.stringify(env)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // v2 strict literal
      expect(r.plan.schemaVersion).toBe(2);
      // Migration adds overrides: {}
      expect(r.plan.location.overrides).toEqual({});
      // Migration sets successionEnabled: false on each planting
      for (const p of r.plan.plantings) {
        expect(p.successionEnabled).toBe(false);
      }
      expect(r.meta.needsMigration).toBe(true);
    }
  });
});

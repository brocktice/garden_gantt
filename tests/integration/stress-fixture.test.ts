// tests/integration/stress-fixture.test.ts
// POL-07 stress-fixture smoke. Asserts the fixture produces a non-trivial event
// count (~200 target; 150-300 range allowed for succession variance per CONTEXT
// 04-CONTEXT.md and RESEARCH §Pitfall 8 heterogeneous-types coverage).
//
// Mirrors the app pipeline: expandSuccessions → generateSchedule.

import { describe, it, expect } from 'vitest';
import { stressFixture } from '../fixtures/200-event-stress';
import { generateSchedule } from '../../src/domain/scheduler';
import { expandSuccessions } from '../../src/domain/succession';
import { sampleCatalog } from '../../src/assets/catalog';

describe('200-event stress fixture', () => {
  it('expands and generates a non-trivial schedule (150-300 events)', () => {
    const expanded = expandSuccessions(stressFixture, sampleCatalog);
    const events = generateSchedule(expanded, sampleCatalog);
    expect(events.length).toBeGreaterThanOrEqual(150);
    expect(events.length).toBeLessThanOrEqual(300);
  });

  it('exercises at least 4 distinct event types (heterogeneous coverage)', () => {
    const expanded = expandSuccessions(stressFixture, sampleCatalog);
    const events = generateSchedule(expanded, sampleCatalog);
    const distinctTypes = new Set(events.map((e) => e.type));
    expect(distinctTypes.size).toBeGreaterThanOrEqual(4);
  });

  it('runs without throwing through the full pipeline', () => {
    expect(() => {
      const expanded = expandSuccessions(stressFixture, sampleCatalog);
      generateSchedule(expanded, sampleCatalog);
    }).not.toThrow();
  });

  it('exposes ~40 plantings before succession expansion', () => {
    expect(stressFixture.plantings.length).toBeGreaterThanOrEqual(35);
    expect(stressFixture.plantings.length).toBeLessThanOrEqual(50);
  });
});

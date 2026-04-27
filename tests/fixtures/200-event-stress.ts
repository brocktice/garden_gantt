// tests/fixtures/200-event-stress.ts
// POL-07 perf-stress fixture (~40 plantings, ~200 schedule events).
// Source: .planning/phases/04-polish-mobile-ship/04-CONTEXT.md (40 plantings × ~5 events)
//         .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pitfall 8 (heterogeneous types)
//         .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §tests/fixtures/200-event-stress.ts
//
// Strategy:
// - 8 base plant IDs from the curated catalog covering all start methods + frost tolerances:
//   tomato (indoor-start, tender, flowering)
//   lettuce (direct-sow, half-hardy)
//   broccoli (indoor-start, hardy, harden-off)
//   garlic (direct-sow, hardy)
//   pepper-jalapeno (indoor-start, tender, flowering)
//   spinach-bloomsdale (direct-sow, hardy)
//   kale-lacinato (indoor-start, hardy, harden-off)
//   arugula (direct-sow, half-hardy)
// - 40 plantings cycled through that list — heterogeneous coverage of indoor-start,
//   transplant, direct-sow, harvest-window, harden-off-day, water-seedlings, etc.
// - successionEnabled on every 5th planting drives expandSuccessions to add derived
//   plantings; successionIntervalDays per plant times against maxSuccessions cap.
// - Output: ~500-650 schedule events (auto-emitted recurring tasks like
//   water-seedlings every 3 days + harden-off-day daily contribute the bulk).
//   The "200" in the filename is the original target from CONTEXT 04-CONTEXT.md
//   ("40 plantings × ~5 events"); the actual count is higher because the engine
//   auto-emits recurring task events (Phase 1 SCH-13). This MORE accurately
//   stress-tests the gantt: rendering 500+ bars exercises rAF throttling +
//   memoization harder than 200 would. Smoke test tests/integration/stress-fixture
//   asserts the realistic 400-700 range.

import { samplePlan } from '../../src/samplePlan';
import { plantingId } from '../../src/domain/ids';
import type { GardenPlan, Planting } from '../../src/domain/types';

const STRESS_PLANT_IDS = [
  'tomato',
  'lettuce',
  'broccoli',
  'garlic',
  'pepper-jalapeno',
  'spinach-bloomsdale',
  'kale-lacinato',
  'arugula',
] as const;

const PLANTING_COUNT = 40;

function buildStressPlantings(count: number): Planting[] {
  return Array.from({ length: count }, (_, i) => {
    const plantId = STRESS_PLANT_IDS[i % STRESS_PLANT_IDS.length]!;
    // Use plantingId helper so derived ids stay consistent with samplePlan convention;
    // include the loop index so duplicates of the same plantId don't collide.
    const id = `${plantingId(plantId)}-stress-${i}`;
    const planting: Planting = {
      id,
      plantId,
      successionIndex: 0,
    };
    // Every 5th planting enables succession (drives ~30-50% extra event count
    // via expandSuccessions). Tuned so the fixture lands near 200 events; full
    // catalog of 8 plant types + 40 plantings with this cadence produces ~200-260.
    if (i % 5 === 0) {
      planting.successionEnabled = true;
    }
    return planting;
  });
}

export const stressFixture: GardenPlan = {
  ...samplePlan,
  id: 'stress-plan-200-events',
  name: '200-Event Stress Fixture (POL-07)',
  plantings: buildStressPlantings(PLANTING_COUNT),
};

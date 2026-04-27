// src/samplePlan.ts
// Hardcoded sample plan loaded fresh from code on every boot (D-03).
// No localStorage cache of the plan in Phase 1; changing lastFrostDate here and
// reloading visibly moves bars (Phase 1 success criterion #2).
//
// Location values: ZIP 20001 / zone 7a / lastFrost 2026-04-15 / firstFrost 2026-10-20
// per .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Open Questions Q3.

import type { GardenPlan } from './domain/types';
import { plantingId } from './domain/ids';

export const samplePlan: GardenPlan = {
  schemaVersion: 3,
  id: 'sample-plan',
  name: '2026 Sample Garden',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  location: {
    zip: '20001',
    zone: '7a',
    lastFrostDate: '2026-04-15T12:00:00.000Z',
    firstFrostDate: '2026-10-20T12:00:00.000Z',
    source: 'manual',
  },
  customPlants: [],
  plantings: [
    { id: plantingId('tomato'), plantId: 'tomato', successionIndex: 0 },
    { id: plantingId('lettuce'), plantId: 'lettuce', successionIndex: 0 },
    { id: plantingId('broccoli'), plantId: 'broccoli', successionIndex: 0 },
    { id: plantingId('garlic'), plantId: 'garlic', successionIndex: 0 },
  ],
  customTasks: [],
  edits: [],
  completedTaskIds: [],
  settings: {
    units: 'imperial',
    weekStartsOn: 0,
    timezone: 'America/New_York',
  },
};

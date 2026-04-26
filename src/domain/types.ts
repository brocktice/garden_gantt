// src/domain/types.ts
// Canonical Phase 1 type system for Garden Gantt.
// Source: .planning/phases/01-foundation-schedule-engine/01-03-PLAN.md <interfaces>
//         .planning/research/ARCHITECTURE.md §Data Model
//         .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-11, D-12
//
// Purity invariant (RESEARCH.md §Pattern 1): this file has ZERO runtime imports.
// Only `import type` (currently none — every type is defined in this file) is allowed.

export type PlantSource = 'curated' | 'custom' | 'permapeople';

export type PlantCategory =
  | 'fruiting-vegetable'
  | 'leafy-green'
  | 'root'
  | 'brassica'
  | 'legume'
  | 'allium'
  | 'herb'
  | 'other';

export interface PlantTiming {
  startMethod: 'direct-sow' | 'indoor-start' | 'either';
  weeksIndoorBeforeLastFrost?: number;
  transplantOffsetDaysFromLastFrost?: number;
  directSowOffsetDaysFromLastFrost?: number;
  daysToGermination?: [number, number];
  daysToHardenOff?: number;
  daysToMaturity: number;
  harvestWindowDays: number;
  successionIntervalDays?: number;
  maxSuccessions?: number;
  frostTolerance: 'tender' | 'half-hardy' | 'hardy';
  cutoffDaysBeforeFirstFrost?: number;
  // D-12: gates fertilize-at-flowering task emission. Required (no `?`).
  hasFlowering: boolean;
  // Gates harden-off range emission for indoor-start plants. Required (no `?`).
  // Per RESEARCH.md §Pitfall 8 — Missing harden-off events.
  requiresHardening: boolean;
}

export interface Plant {
  id: string;
  source: PlantSource;
  name: string;
  scientificName?: string;
  category: PlantCategory;
  timing: PlantTiming;
  // enrichment widens in Phase 2 (Permapeople); empty shape for Phase 1.
  enrichment?: Record<string, never>;
}

export interface Location {
  zip: string;
  zone: string;
  lastFrostDate: string;
  firstFrostDate: string;
  source: 'lookup' | 'manual';
  lookupTimestamp?: string;
}

export interface Planting {
  id: string;
  plantId: string;
  label?: string;
  successionIndex: number;
  notes?: string;
}

// 6 lifecycle event types from D-11 + 3 task event types from D-12.
// Single union (not split) per CONTEXT.md §Phase 1 task-event scope:
// the engine emits a single `ScheduleEvent[]` flat array.
export type EventType =
  | 'indoor-start'
  | 'harden-off'
  | 'transplant'
  | 'direct-sow'
  | 'germination-window'
  | 'harvest-window'
  | 'water-seedlings'
  | 'harden-off-day'
  | 'fertilize-at-flowering';

export interface ScheduleEvent {
  id: string;
  plantingId: string;
  plantId: string;
  type: EventType;
  start: string;
  end: string;
  edited: boolean;
  constraintsApplied: string[];
}

export interface ScheduleEdit {
  plantingId: string;
  eventType: EventType;
  startOverride: string;
  endOverride?: string;
  reason: 'user-drag' | 'user-form-edit';
  editedAt: string;
}

export type TaskCategory =
  | 'sow'
  | 'transplant'
  | 'harden-off'
  | 'harvest'
  | 'water'
  | 'fertilize'
  | 'prune'
  | 'scout-pests'
  | 'custom';

export interface TaskRecurrence {
  type: 'weekly' | 'daily' | 'interval';
  intervalDays?: number;
  endDate?: string;
}

export interface Task {
  id: string;
  source: 'auto' | 'custom';
  plantingId?: string;
  title: string;
  category: TaskCategory;
  dueDate: string;
  recurrence?: TaskRecurrence;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface CustomTask extends Omit<Task, 'source' | 'plantingId'> {
  source: 'custom';
}

export interface GardenPlan {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  location: Location;
  customPlants: Plant[];
  plantings: Planting[];
  customTasks: CustomTask[];
  edits: ScheduleEdit[];
  settings: {
    units: 'imperial' | 'metric';
    weekStartsOn: 0 | 1;
    timezone: string;
  };
}

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
  // Phase 2 (D-09): season classification used by catalog filter chips (Plan 02-09).
  season: 'cool' | 'warm';
}

export interface Plant {
  id: string;
  source: PlantSource;
  name: string;
  scientificName?: string;
  category: PlantCategory;
  timing: PlantTiming;
  // Phase 2: widened from Phase 1's `Record<string, never>` to allow Permapeople
  // enrichment payloads (categories, descriptions, images, etc.).
  enrichment?: Record<string, unknown>;
}

export interface Location {
  zip: string;
  zone: string;
  lastFrostDate: string;
  firstFrostDate: string;
  source: 'lookup' | 'manual';
  lookupTimestamp?: string;
  // Phase 2 (D-05): per-field override flags for manual overrides on derived values.
  overrides?: {
    zone?: boolean;
    lastFrostDate?: boolean;
    firstFrostDate?: boolean;
  };
}

export interface Planting {
  id: string;
  plantId: string;
  label?: string;
  successionIndex: number;
  notes?: string;
  // Phase 2 (D-21): when true, expandSuccessions pre-pass derives additional plantings.
  successionEnabled?: boolean;
  // Phase 2 (Plan 02-10 deviation — Rule 2): per-planting offset (in days) applied to the
  // engine's lastFrost anchor. Used by expandSuccessions to stagger derived plantings by
  // `successionIndex * successionIntervalDays` so each succession row plants on a distinct
  // calendar date. Default 0 keeps Phase 1 snapshots byte-identical.
  startOffsetDays?: number;
  // Phase 3 (D-13): per-event-type lock map. Locked events held fixed during cascade reflow.
  // Keys are EventType strings; missing key === unlocked. Persisted via planStore; tracked
  // by zundo (Plan 03-02). Consumed by drag UI (Plan 03-03) which prevents NEW edits to
  // locked events, and by cascade preview (useTransientSchedule).
  locks?: Partial<Record<EventType, boolean>>;
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

export interface CustomTask extends Omit<Task, 'source'> {
  source: 'custom';
  // plantingId inherited from Task (optional). Phase 3 (D-30): custom tasks may be
  // attached to a planting (TASK-02) for groupBy='plant' bucketing in the dashboard
  // (TASK-06). Absent = free-floating.
}

export interface GardenPlan {
  schemaVersion: 3;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  location: Location;
  customPlants: Plant[];
  plantings: Planting[];
  // Phase 3 (D-36): completedTaskIds keys are either a bare taskId (one-off, global completion)
  // OR `${taskId}:${YYYY-MM-DD}` (per-occurrence completion for recurring tasks).
  // No type change required — both are strings; consumers branch on presence of ':' separator.
  customTasks: CustomTask[];
  edits: ScheduleEdit[];
  // Phase 3 (D-36): Track per-task or per-occurrence completion. See note above for key format.
  completedTaskIds: string[];
  settings: {
    units: 'imperial' | 'metric';
    weekStartsOn: 0 | 1;
    timezone: string;
  };
}

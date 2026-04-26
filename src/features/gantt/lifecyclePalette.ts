// src/features/gantt/lifecyclePalette.ts
// Companion to src/index.css @theme tokens. Hex values MUST stay in sync.
// Source of truth: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Color
// Plan 04 will narrow the keys to `EventType` once src/domain/types.ts ships.

export const lifecyclePalette: Record<string, string> = {
  'indoor-start': '#3B82F6',
  'harden-off': '#EAB308',
  'transplant': '#16A34A',
  'direct-sow': '#0D9488',
  'germination-window': '#A3E635',
  'harvest-window': '#EA580C',
};

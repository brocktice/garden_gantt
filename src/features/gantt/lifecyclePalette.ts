// src/features/gantt/lifecyclePalette.ts
// TS-side companion to src/index.css @theme tokens. Hex values stay in sync with CSS.
// Source of truth: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Color
//
// Plan 08 narrowed this from `Record<string, string>` to `Partial<Record<EventType, string>>`
// so TS catches typos (T-01-34 mitigation). The 3 task event types
// (water-seedlings, harden-off-day, fertilize-at-flowering) are intentionally absent —
// they are not lifecycle bars and are not rendered as colored rects in the gantt view.
import type { EventType } from '../../domain/types';

export const lifecyclePalette: Partial<Record<EventType, string>> = {
  'indoor-start': '#3B82F6',
  'harden-off': '#EAB308',
  'transplant': '#16A34A',
  'direct-sow': '#0D9488',
  'germination-window': '#A3E635',
  'harvest-window': '#EA580C',
};

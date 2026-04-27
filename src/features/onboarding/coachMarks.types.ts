// src/features/onboarding/coachMarks.types.ts
// Single source of truth for coach-mark content (4 marks, single dismissal).
// Per UI-SPEC §Onboarding coach marks (verbatim copy table) and D-05.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Onboarding coach marks]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-04-PLAN.md Task 1]

export const MARK_IDS = [
  'catalog-button',
  'first-bar',
  'first-lock-toggle',
  'calendar-tab',
] as const;

export type MarkId = (typeof MARK_IDS)[number];

export interface CoachMark {
  id: MarkId;
  /** Label 14/500 — UI-SPEC verbatim. */
  headingLabel: string;
  /** Body 16/400, max 2 lines. */
  body: string;
  /** True for marks 2-4 (RESEARCH Open Question 2 — staged reveal). */
  requiresPlantings: boolean;
}

export const MARKS: readonly CoachMark[] = [
  {
    id: 'catalog-button',
    headingLabel: 'Pick your plants here',
    body: 'Browse the catalog or add custom plants to start your gantt.',
    requiresPlantings: false,
  },
  {
    id: 'first-bar',
    headingLabel: 'Drag to adjust dates',
    body: "Bars snap to constraints (e.g. tomatoes can't go out before last frost).",
    requiresPlantings: true,
  },
  {
    id: 'first-lock-toggle',
    headingLabel: 'Lock to pin a date',
    body: 'Locked events stay put when you drag others.',
    requiresPlantings: true,
  },
  {
    id: 'calendar-tab',
    headingLabel: 'Switch to calendar view',
    body: 'Same schedule, day-by-day. Great for "what\'s happening this week".',
    requiresPlantings: true,
  },
] as const;

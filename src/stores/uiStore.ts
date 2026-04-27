// src/stores/uiStore.ts
// In-memory UI state. Held only in process memory — NEVER written to localStorage
// (per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §iOS Private Mode Banner
//  and Phase 2 Pitfall K — filter chips + search + panel toggles are transient).
// Banner dismiss state lives only for the current tab; reload re-shows the banner because
// storage is still unavailable (intentional behavior).
//
// Phase 2 additions (D-26 — Pitfall K invariant): myPlanPanelOpen, filterChips, searchQuery,
// importPreviewOpen. NO middleware — in-memory only; verified by tests/stores/uiStore.test.ts.
//
// Phase 3 additions (Plan 03-02 Task 4):
// - lastConstraintViolation (D-09 / UI-SPEC §4): sticky-pill phase that OUTLIVES the drag
//   (dragStore.lastConstraintViolation is the during-drag floating-with-cursor mode; once
//   the drag commits, ConstraintTooltip switches to the uiStore mirror until next drag-start
//   OR an 8s timeout — see Plan 03-03 for the lifetime state machine).
// - taskGroupBy (D-33): tasks dashboard group-by toggle. Memory-only — resets on refresh
//   by design (deliberate decision: list grouping is a transient view preference, not data).
// - altClickTipDismissCount (UI-SPEC §Lock toggle copy): the "Tip: Alt-click any bar to lock
//   it" tooltip is a 3-shot helper. After 3 dismisses the tip is permanently suppressed for
//   the session.
import { create } from 'zustand';
import type { EventType } from '../domain/types';

interface UIState {
  // Phase 1 (LOCKED — do not modify)
  bannerDismissed: boolean;
  isStorageAvailable: boolean;
  setBannerDismissed: (v: boolean) => void;
  setStorageAvailable: (v: boolean) => void;
  // Phase 2 transient flags (Pitfall K — memory only)
  myPlanPanelOpen: boolean;
  filterChips: Set<string>;
  searchQuery: string;
  importPreviewOpen: boolean;
  setMyPlanPanelOpen: (v: boolean) => void;
  toggleFilterChip: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setImportPreviewOpen: (v: boolean) => void;
  // Phase 3 transient flags (Plan 03-02 — memory only, never persisted)
  lastConstraintViolation: {
    eventId: string;
    eventType: EventType;
    reasons: string[];
  } | null;
  taskGroupBy: 'plant' | 'category';
  altClickTipDismissCount: number;
  setLastConstraintViolation: (v: UIState['lastConstraintViolation']) => void;
  setTaskGroupBy: (g: 'plant' | 'category') => void;
  incrementAltClickTipDismiss: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  bannerDismissed: false,
  isStorageAvailable: true, // Optimistic default; main.tsx (Plan 07) overrides on probe result
  setBannerDismissed: (v) => set({ bannerDismissed: v }),
  setStorageAvailable: (v) => set({ isStorageAvailable: v }),
  // Phase 2 defaults
  myPlanPanelOpen: false,
  filterChips: new Set<string>(),
  searchQuery: '',
  importPreviewOpen: false,
  setMyPlanPanelOpen: (v) => set({ myPlanPanelOpen: v }),
  toggleFilterChip: (id) =>
    set((s) => {
      const next = new Set(s.filterChips);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { filterChips: next };
    }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setImportPreviewOpen: (v) => set({ importPreviewOpen: v }),
  // Phase 3 defaults
  lastConstraintViolation: null,
  taskGroupBy: 'plant',
  altClickTipDismissCount: 0,
  setLastConstraintViolation: (v) => set({ lastConstraintViolation: v }),
  setTaskGroupBy: (g) => set({ taskGroupBy: g }),
  incrementAltClickTipDismiss: () =>
    set((s) => ({ altClickTipDismissCount: s.altClickTipDismissCount + 1 })),
}));

// src/stores/uiStore.ts
// UI state with a TIGHTLY-RESTRICTED persisted slice.
//
// Phase 1/2/3 transient flags (bannerDismissed, filterChips, searchQuery,
// importPreviewOpen, lastConstraintViolation, taskGroupBy, altClickTipDismissCount,
// myPlanPanelOpen, isStorageAvailable) MUST stay memory-only — see Pitfall K
// (.planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md) and
// Phase 4 RESEARCH §Pitfall 1 (partialize whitelist invariant).
//
// Phase 4 (Plan 04-01) ADDS persisted slices:
// - onboarding (D-06): coach-mark dismissal MUST survive reload
// - exportReminder (D-15): export-reminder bookkeeping MUST survive reload
//
// Phase 4 also adds isStorageFull (D-10) — memory-only mirror of the
// QuotaExceededError signal from data/storage.ts watchQuotaExceeded; NOT persisted.
//
// Source:
//   .planning/phases/04-polish-mobile-ship/04-01-PLAN.md (Task 1)
//   .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pattern 2 + §Pitfall 1
//   .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/stores/uiStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EventType } from '../domain/types';

interface UIState {
  // Phase 1 (LOCKED — do not modify) — memory only
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
  // Phase 4 PERSISTED slices (D-06 / D-15)
  onboarding: { coachMarksDismissed: boolean };
  exportReminder: {
    lastExportedAt: string | null;
    dirtySinceExport: number;
    snoozedUntil: string | null;
  };
  setCoachMarksDismissed: (v: boolean) => void;
  setLastExportedAt: (iso: string) => void;
  incrementDirty: () => void;
  resetDirty: () => void;
  setSnoozedUntil: (iso: string | null) => void;
  // Phase 4 memory-only signal (D-10) — quota-full mirror; NOT persisted
  isStorageFull: boolean;
  setStorageFull: (v: boolean) => void;
}

const SCHEMA_VERSION = 1;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Phase 1 defaults
      bannerDismissed: false,
      isStorageAvailable: true, // Optimistic default; main.tsx overrides on probe result
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
      // Phase 4 PERSISTED defaults
      onboarding: { coachMarksDismissed: false },
      exportReminder: {
        lastExportedAt: null,
        dirtySinceExport: 0,
        snoozedUntil: null,
      },
      setCoachMarksDismissed: (v) =>
        set((s) => ({ onboarding: { ...s.onboarding, coachMarksDismissed: v } })),
      setLastExportedAt: (iso) =>
        set((s) => ({
          exportReminder: { ...s.exportReminder, lastExportedAt: iso },
        })),
      incrementDirty: () =>
        set((s) => ({
          exportReminder: {
            ...s.exportReminder,
            dirtySinceExport: s.exportReminder.dirtySinceExport + 1,
          },
        })),
      resetDirty: () =>
        set((s) => ({
          exportReminder: { ...s.exportReminder, dirtySinceExport: 0 },
        })),
      setSnoozedUntil: (iso) =>
        set((s) => ({ exportReminder: { ...s.exportReminder, snoozedUntil: iso } })),
      // Phase 4 memory-only
      isStorageFull: false,
      setStorageFull: (v) => set({ isStorageFull: v }),
    }),
    {
      name: 'gg-ui',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      // CRITICAL: whitelist ONLY persisted slices. Phase 1/2/3 transient flags
      // MUST NOT serialize (Pitfall K + RESEARCH §Pitfall 1). Adding a key here
      // without a regression test in tests/stores/uiStore.test.ts is a bug.
      partialize: (s) => ({
        onboarding: s.onboarding,
        exportReminder: s.exportReminder,
      }),
      // Placeholder migrate fn (mirrors catalogStore pattern; ready for future bumps).
      migrate: (persisted) => persisted as UIState,
    },
  ),
);

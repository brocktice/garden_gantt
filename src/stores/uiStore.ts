// src/stores/uiStore.ts
// In-memory UI state. Held only in process memory — NEVER written to localStorage
// (per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §iOS Private Mode Banner
//  and Phase 2 Pitfall K — filter chips + search + panel toggles are transient).
// Banner dismiss state lives only for the current tab; reload re-shows the banner because
// storage is still unavailable (intentional behavior).
//
// Phase 2 additions (D-26 — Pitfall K invariant): myPlanPanelOpen, filterChips, searchQuery,
// importPreviewOpen. NO middleware — in-memory only; verified by tests/stores/uiStore.test.ts.
import { create } from 'zustand';

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
}));

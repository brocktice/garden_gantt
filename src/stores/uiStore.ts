// src/stores/uiStore.ts
// In-memory UI state. Held only in process memory — NEVER written to localStorage
// (per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §iOS Private Mode Banner).
// Banner dismiss state lives only for the current tab; reload re-shows the banner because
// storage is still unavailable (intentional behavior).
import { create } from 'zustand';

interface UIState {
  bannerDismissed: boolean;
  isStorageAvailable: boolean;
  setBannerDismissed: (v: boolean) => void;
  setStorageAvailable: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  bannerDismissed: false,
  isStorageAvailable: true, // Optimistic default; main.tsx (Plan 07) overrides on probe result
  setBannerDismissed: (v) => set({ bannerDismissed: v }),
  setStorageAvailable: (v) => set({ isStorageAvailable: v }),
}));

/**
 * @vitest-environment happy-dom
 */
// tests/stores/uiStore.test.ts
// Phase 2 Plan 02-04 Task 2: uiStore Phase 2 transient flag extension (Pitfall K — no persist).
// Source: .planning/phases/02-data-layer-first-end-to-end/02-04-PLAN.md (Task 2)
//         02-PATTERNS.md src/stores/uiStore.ts (EXTEND)
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/stores/uiStore';

describe('useUIStore — Phase 2 transient flags', () => {
  beforeEach(() => {
    // Reset to defaults between tests (in-memory store)
    useUIStore.setState({
      bannerDismissed: false,
      isStorageAvailable: true,
      myPlanPanelOpen: false,
      filterChips: new Set<string>(),
      searchQuery: '',
      importPreviewOpen: false,
    });
  });

  it('default values', () => {
    const s = useUIStore.getState();
    expect(s.myPlanPanelOpen).toBe(false);
    expect(s.filterChips).toBeInstanceOf(Set);
    expect(s.filterChips.size).toBe(0);
    expect(s.searchQuery).toBe('');
    expect(s.importPreviewOpen).toBe(false);
  });

  it('toggleFilterChip adds then removes', () => {
    useUIStore.getState().toggleFilterChip('cool-season');
    expect(useUIStore.getState().filterChips.has('cool-season')).toBe(true);
    useUIStore.getState().toggleFilterChip('cool-season');
    expect(useUIStore.getState().filterChips.has('cool-season')).toBe(false);
  });

  it('toggleFilterChip handles multiple distinct chips', () => {
    useUIStore.getState().toggleFilterChip('warm-season');
    useUIStore.getState().toggleFilterChip('herb');
    const chips = useUIStore.getState().filterChips;
    expect(chips.has('warm-season')).toBe(true);
    expect(chips.has('herb')).toBe(true);
    expect(chips.size).toBe(2);
  });

  it('setSearchQuery round-trip', () => {
    useUIStore.getState().setSearchQuery('tomato');
    expect(useUIStore.getState().searchQuery).toBe('tomato');
    useUIStore.getState().setSearchQuery('');
    expect(useUIStore.getState().searchQuery).toBe('');
  });

  it('setMyPlanPanelOpen round-trip', () => {
    useUIStore.getState().setMyPlanPanelOpen(true);
    expect(useUIStore.getState().myPlanPanelOpen).toBe(true);
    useUIStore.getState().setMyPlanPanelOpen(false);
    expect(useUIStore.getState().myPlanPanelOpen).toBe(false);
  });

  it('setImportPreviewOpen round-trip', () => {
    useUIStore.getState().setImportPreviewOpen(true);
    expect(useUIStore.getState().importPreviewOpen).toBe(true);
    useUIStore.getState().setImportPreviewOpen(false);
    expect(useUIStore.getState().importPreviewOpen).toBe(false);
  });

  it('does NOT use Zustand persist middleware (Pitfall K invariant)', () => {
    // persist-wrapped stores expose `.persist`. uiStore must not.
    expect(
      (useUIStore as unknown as { persist?: unknown }).persist,
    ).toBeUndefined();
  });

  it('Phase 1 fields preserved (bannerDismissed, isStorageAvailable)', () => {
    const s = useUIStore.getState();
    expect(typeof s.bannerDismissed).toBe('boolean');
    expect(typeof s.isStorageAvailable).toBe('boolean');
    expect(typeof s.setBannerDismissed).toBe('function');
    expect(typeof s.setStorageAvailable).toBe('function');
  });
});

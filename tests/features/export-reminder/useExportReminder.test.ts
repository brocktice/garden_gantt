/**
 * @vitest-environment happy-dom
 */
// tests/features/export-reminder/useExportReminder.test.ts
// Phase 4 Plan 04-05 Task 2 — D-12 should-show selector + snooze action helpers.
// Source: 04-05-PLAN.md Task 2 behaviors; D-12 thresholds (dirty>=20 OR age>=14d AND dirty>0);
//         D-13 snooze copy ("Remind me later"=3d, "Don't remind for 30 days"=30d).
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { addDays, parseISO } from 'date-fns';
import {
  useExportReminder,
  useShouldShowExportReminder,
} from '../../../src/features/export-reminder/useExportReminder';
import { useUIStore } from '../../../src/stores/uiStore';
import { nowISOString } from '../../../src/domain/dateWrappers';

function setReminder(patch: Partial<{
  lastExportedAt: string | null;
  dirtySinceExport: number;
  snoozedUntil: string | null;
}>) {
  useUIStore.setState((s) => ({
    exportReminder: { ...s.exportReminder, ...patch },
  }));
}

function resetReminder() {
  useUIStore.setState(() => ({
    exportReminder: {
      lastExportedAt: null,
      dirtySinceExport: 0,
      snoozedUntil: null,
    },
  }));
}

describe('useShouldShowExportReminder — D-12 thresholds', () => {
  beforeEach(() => {
    resetReminder();
  });

  it('shouldShow=false when dirtySinceExport === 0 (no edits = no nagging)', () => {
    setReminder({
      dirtySinceExport: 0,
      lastExportedAt: addDays(parseISO(nowISOString()), -30).toISOString(),
    });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(false);
    expect(typeof result.current.shouldShow).toBe('boolean');
  });

  it('shouldShow=true when dirtySinceExport >= 20 (Trigger A)', () => {
    setReminder({ dirtySinceExport: 20 });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(true);
    expect(result.current.count).toBe(20);
  });

  it('shouldShow=true when dirtySinceExport > 20 (Trigger A above threshold)', () => {
    setReminder({ dirtySinceExport: 75 });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(true);
  });

  it('shouldShow=false when dirty < 20 AND last export < 14 days ago AND not null', () => {
    setReminder({
      dirtySinceExport: 5,
      lastExportedAt: addDays(parseISO(nowISOString()), -3).toISOString(),
    });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(false);
  });

  it('shouldShow=false when dirty < 20 AND lastExportedAt null (never exported)', () => {
    setReminder({ dirtySinceExport: 5, lastExportedAt: null });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(false);
  });

  it('shouldShow=true when last export >= 14d ago AND dirty > 0 (Trigger B)', () => {
    setReminder({
      dirtySinceExport: 1,
      lastExportedAt: addDays(parseISO(nowISOString()), -15).toISOString(),
    });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(true);
  });

  it('shouldShow=false when last export >= 14d ago BUT dirty === 0', () => {
    setReminder({
      dirtySinceExport: 0,
      lastExportedAt: addDays(parseISO(nowISOString()), -30).toISOString(),
    });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(false);
  });

  it('shouldShow=false when snoozedUntil > now (snooze respected, even with high dirty)', () => {
    setReminder({
      dirtySinceExport: 50,
      snoozedUntil: addDays(parseISO(nowISOString()), 2).toISOString(),
    });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(false);
  });

  it('shouldShow=true after snooze elapses AND threshold met', () => {
    setReminder({
      dirtySinceExport: 25,
      snoozedUntil: addDays(parseISO(nowISOString()), -1).toISOString(),
    });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.shouldShow).toBe(true);
  });

  it('returned count mirrors dirtySinceExport', () => {
    setReminder({ dirtySinceExport: 7 });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.count).toBe(7);
  });

  it('returned lastExportedAt mirrors uiStore value', () => {
    const iso = '2026-04-15T12:00:00.000Z';
    setReminder({ lastExportedAt: iso });
    const { result } = renderHook(() => useShouldShowExportReminder());
    expect(result.current.lastExportedAt).toBe(iso);
  });
});

describe('useExportReminder — snooze action helpers', () => {
  beforeEach(() => {
    resetReminder();
  });

  it('snooze3Days() sets snoozedUntil to ~now + 3 days', () => {
    const { result } = renderHook(() => useExportReminder());
    const before = Date.now();
    act(() => {
      result.current.snooze3Days();
    });
    const snoozed = useUIStore.getState().exportReminder.snoozedUntil;
    expect(snoozed).not.toBeNull();
    const snoozedMs = parseISO(snoozed!).getTime();
    const expected = before + 3 * 86400000;
    // Within 5 seconds tolerance.
    expect(Math.abs(snoozedMs - expected)).toBeLessThan(5000);
  });

  it('snooze30Days() sets snoozedUntil to ~now + 30 days', () => {
    const { result } = renderHook(() => useExportReminder());
    const before = Date.now();
    act(() => {
      result.current.snooze30Days();
    });
    const snoozed = useUIStore.getState().exportReminder.snoozedUntil;
    expect(snoozed).not.toBeNull();
    const snoozedMs = parseISO(snoozed!).getTime();
    const expected = before + 30 * 86400000;
    expect(Math.abs(snoozedMs - expected)).toBeLessThan(5000);
  });

  it('formatLastExportedShort() returns short month + day when exported', () => {
    setReminder({ lastExportedAt: '2026-04-15T12:00:00.000Z' });
    const { result } = renderHook(() => useExportReminder());
    expect(result.current.formatLastExportedShort()).toBe('Apr 15');
  });

  it('formatLastExportedShort() returns "you started" when never exported', () => {
    setReminder({ lastExportedAt: null });
    const { result } = renderHook(() => useExportReminder());
    expect(result.current.formatLastExportedShort()).toBe('you started');
  });
});

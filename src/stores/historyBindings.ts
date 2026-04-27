// src/stores/historyBindings.ts
// Document-level Cmd-Z / Cmd-Shift-Z keybindings wired to the zundo temporal API.
// Mounted from src/app/AppShell.tsx via useEffect (Plan 03-03 wires the mount).
//
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-18]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 4]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-PATTERNS.md §src/stores/historyBindings.ts]
//
// Suppression contract (D-18): when focus is inside <input>, <textarea>, or
// [contenteditable], the keybinding is suppressed so users editing a task title in
// CustomTaskModal don't accidentally undo the whole plan with a typo. This selector list
// covers the common cases; future embedded editors (CodeMirror, Monaco, etc.) that need
// to opt into suppression can extend the selector — Phase 4 a11y agent owns that
// expansion (per threat T-03-02-02 in the plan's threat register).
//
// Why this lives in stores/ (not features/): the keybinding is a thin wrapper around
// `getTemporal()` and stays close to the planStore that owns the temporal middleware.
// No tests in this plan — keybinding integration is exercised end-to-end in Plan 03-07
// (integration smoke). The thin-wrapper-over-tested-store policy is intentional.

import { useEffect } from 'react';
import { getTemporal } from './planStore';

function isFormFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches(
    'input, textarea, [contenteditable="true"], [contenteditable=""]',
  );
}

export function useHistoryKeybindings(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFormFocus(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        getTemporal().undo();
      } else if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        getTemporal().redo();
      } else if (key === 'y' && !e.shiftKey) {
        // Common Windows redo shortcut; honor it too.
        e.preventDefault();
        getTemporal().redo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

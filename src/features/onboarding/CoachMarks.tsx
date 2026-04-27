// src/features/onboarding/CoachMarks.tsx
// Portal-mounted coach mark overlay (4 marks, hand-rolled, no library) per D-05.
// Backdrop dims the page; callout bubble points at the active anchor element via
// data-coach-target attribute. Esc dismisses, Enter advances.
//
// Plan 06 will mount <CoachMarks /> in AppShell — this file does NOT modify AppShell.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-04-PLAN.md Task 2]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Coach-mark visual style]
//         [CITED: src/features/gantt/tooltip/ConstraintTooltip.tsx (portal + getBoundingClientRect pattern)]

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router';
import { Button } from '../../ui/Button';
import { useCoachMarks } from './useCoachMarks';

const CALLOUT_W = 280; // matches --spacing-coach-mark-callout
const CALLOUT_GAP = 12; // px below target

function isFormFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches(
    'input, textarea, [contenteditable="true"], [contenteditable=""]',
  );
}

export function CoachMarks() {
  const location = useLocation();
  const {
    active,
    currentMark,
    currentIndex,
    totalCount,
    isLast,
    dismiss,
    advance,
  } = useCoachMarks(location.pathname);
  const [anchorPos, setAnchorPos] = useState<{ left: number; top: number } | null>(
    null,
  );

  // Position callout below the target via getBoundingClientRect.
  useLayoutEffect(() => {
    if (!active || !currentMark) {
      queueMicrotask(() => setAnchorPos(null));
      return;
    }
    const compute = () => {
      // WR-03 (REVIEW Phase 4): escape attribute value for CSS selector safety.
      const sel = `[data-coach-target="${CSS.escape(currentMark.id)}"]`;
      const el = document.querySelector(sel);
      if (!el) {
        setAnchorPos({ left: 16, top: 80 });
        return;
      }
      const r = (el as Element).getBoundingClientRect();
      const left = Math.max(8, r.left + r.width / 2 - CALLOUT_W / 2);
      const top = r.bottom + CALLOUT_GAP;
      setAnchorPos({ left, top });
    };
    queueMicrotask(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [active, currentMark]);

  // Esc to dismiss, Enter to advance (T-04-04-02 mitigation: skip when typing).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isFormFocus(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, dismiss, advance]);

  if (!active || !currentMark) return null;

  const positionStyle: CSSProperties = anchorPos
    ? { left: anchorPos.left, top: anchorPos.top }
    : { left: 16, top: 80 };

  return createPortal(
    <>
      {/* Backdrop — click outside dismisses (UX nicety per UI-SPEC). */}
      <div
        className="fixed inset-0 z-40 bg-stone-900/40"
        onClick={dismiss}
        aria-hidden="true"
      />
      {/* Callout. WR-11 (REVIEW Phase 4): coach marks are advisory non-blocking
          UI (Esc/click-backdrop dismiss). Drop aria-modal="true" since we do
          not actually trap focus — leaving it would lie to screen readers
          about modality. role="dialog" alone is correct for an advisory
          callout. */}
      <div
        role="dialog"
        aria-labelledby="coach-mark-heading"
        className="fixed z-50 bg-white rounded-md border border-stone-200 shadow-lg p-4"
        style={{
          ...positionStyle,
          maxWidth: 'var(--spacing-coach-mark-callout, 280px)',
          width: CALLOUT_W,
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2
            id="coach-mark-heading"
            className="text-sm font-medium text-stone-900"
          >
            {currentMark.headingLabel}
          </h2>
          <span className="text-sm font-medium text-stone-600">
            {currentIndex + 1} of {totalCount}
          </span>
        </div>
        <p className="text-base text-stone-700 mb-4">{currentMark.body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Skip tour
          </Button>
          <Button variant="primary" onClick={advance}>
            {isLast ? 'Got it' : 'Next →'}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// src/features/gantt/tooltip/ConstraintTooltip.tsx
// Portaled snap-back tooltip — floating-with-cursor (during drag) → sticky pill (post-commit).
// Per CONTEXT D-09, D-10 + UI-SPEC §4.
//
// Source: [CITED: 03-CONTEXT.md D-09, D-10]
//         [CITED: 03-UI-SPEC.md §4 ConstraintTooltip + §Constraint snap-back tooltip copy]
//         [CITED: 03-PATTERNS.md §ConstraintTooltip.tsx]

import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { EventType } from '../../../domain/types';
import { useUIStore } from '../../../stores/uiStore';
import { useDragStore } from '../../../stores/dragStore';
import { lifecyclePalette } from '../lifecyclePalette';
import { cn } from '../../../ui/cn';

const HEADER_BY_TYPE: Partial<Record<EventType, string>> = {
  'transplant': 'TRANSPLANT BLOCKED',
  'indoor-start': 'INDOOR-START BLOCKED',
  'direct-sow': 'DIRECT-SOW BLOCKED',
  'harvest-window': 'HARVEST EXTEND BLOCKED',
};

const FALLBACK_HEADER = 'Move blocked';
const FALLBACK_BODY =
  "This date isn't allowed. Pick a different date or check the lock and constraint settings.";

const PILL_W = 280;
const PILL_H = 64;
const STICKY_TIMEOUT_MS = 8000;
const CURSOR_OFFSET = 16;

// Wrap the first month/day(/year) ASCII English date in <strong> for visual emphasis.
const DATE_PATTERN =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:, \d{4})?\b/;

function renderBody(text: string): React.ReactNode {
  const m = text.match(DATE_PATTERN);
  if (!m) return text;
  const idx = m.index ?? 0;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold">{m[0]}</strong>
      {text.slice(idx + m[0].length)}
    </>
  );
}

export function ConstraintTooltip() {
  const dragViolation = useDragStore((s) => s.lastConstraintViolation);
  const isDragging = useDragStore((s) => s.isDragging);
  const stickyViolation = useUIStore((s) => s.lastConstraintViolation);
  const setStickyViolation = useUIStore((s) => s.setLastConstraintViolation);

  const violation = isDragging ? dragViolation : stickyViolation;

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ left: number; top: number } | null>(null);

  // Auto-dismiss the sticky pill after 8s per CONTEXT D-09.
  useEffect(() => {
    if (!stickyViolation || isDragging) return;
    const timer = setTimeout(() => setStickyViolation(null), STICKY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [stickyViolation, isDragging, setStickyViolation]);

  // Phase 4 Plan 04-06 — Escape dismisses the sticky pill (RESEARCH Pitfall 3 +
  // UI-SPEC §Accessibility Contract). Listener is gated on an active sticky
  // violation so it doesn't intercept Escape elsewhere (T-04-06-06 mitigation).
  useEffect(() => {
    if (!stickyViolation || isDragging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStickyViolation(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stickyViolation, isDragging, setStickyViolation]);

  // Mode A: track cursor while dragging. Effect subscribes to the document pointermove —
  // setCursorPos is invoked only from inside the rAF callback (event-handler scope), not
  // synchronously in the effect body, so React Compiler's setState-in-effect rule is satisfied.
  useEffect(() => {
    if (!isDragging) {
      // Use a microtask to defer the reset out of the effect body — clears Mode A state
      // when drag ends without violating the setState-in-effect rule.
      queueMicrotask(() => setCursorPos(null));
      return;
    }
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
      if (typeof requestAnimationFrame === 'undefined') {
        setCursorPos({ x: e.clientX, y: e.clientY });
        return;
      }
      raf = requestAnimationFrame(() => setCursorPos({ x: e.clientX, y: e.clientY }));
    };
    document.addEventListener('pointermove', onMove);
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
    };
  }, [isDragging]);

  // Mode B: anchor to the bar's bounding rect when sticky. setAnchorPos is invoked from
  // event handlers (window resize/scroll) or via queueMicrotask — never synchronously
  // in the effect body.
  useLayoutEffect(() => {
    if (isDragging || !stickyViolation) {
      queueMicrotask(() => setAnchorPos(null));
      return;
    }
    const compute = () => {
      const el = document.querySelector(
        `[data-event-id="${stickyViolation.eventId}"]`,
      );
      if (!el) {
        setAnchorPos(null);
        return;
      }
      const r = (el as Element).getBoundingClientRect();
      setAnchorPos({
        left: r.left + r.width / 2 - PILL_W / 2,
        top: Math.max(8, r.top - PILL_H - 8),
      });
    };
    // Defer the initial compute to a microtask so the effect body itself doesn't setState.
    queueMicrotask(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isDragging, stickyViolation]);

  if (!violation) return null;

  const accent = lifecyclePalette[violation.eventType] ?? '#57534E';
  const header = HEADER_BY_TYPE[violation.eventType] ?? FALLBACK_HEADER;
  const body = violation.reasons[0] ?? FALLBACK_BODY;

  const positionStyle: CSSProperties =
    isDragging && cursorPos
      ? { left: cursorPos.x + CURSOR_OFFSET, top: cursorPos.y + CURSOR_OFFSET }
      : anchorPos
        ? { left: anchorPos.left, top: anchorPos.top }
        : { left: '50%', top: 80, transform: 'translateX(-50%)' };

  // Phase 4 Plan 04-06 — key on (eventId + reasons) so React remounts whenever
  // the violation message actually changes; aria-live=polite then re-announces.
  // Re-render under same key (e.g. cursor-position update during Mode A) does NOT
  // trigger a fresh announcement (RESEARCH Pitfall 3 mitigation).
  const violationKey = `${violation.eventId}|${violation.reasons.join('|')}`;

  return createPortal(
    <div
      key={violationKey}
      data-violation-key={violationKey}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
      data-testid="constraint-tooltip"
      className={cn(
        'fixed z-50',
        'bg-white rounded-md border border-stone-200',
        'shadow-[0_8px_24px_rgb(0_0_0_/_0.12)]',
        'min-w-[var(--spacing-tooltip-min-w)] max-w-[var(--spacing-tooltip-max-w)]',
        'px-4 py-2 border-l-[3px]',
      )}
      style={{ borderLeftColor: accent, ...positionStyle }}
    >
      {/* Phase 4 Plan 04-06 — sr-only summary so screen readers get an unambiguous
          read regardless of how the visible body wraps the date in <strong>. */}
      <span className="sr-only">{`${header}: ${body}`}</span>
      <p
        aria-hidden="true"
        className="text-sm font-semibold uppercase tracking-wider text-stone-900"
      >
        {header}
      </p>
      <p
        aria-hidden="true"
        className="text-sm font-normal leading-snug text-stone-900 mt-1"
      >
        {renderBody(body)}
      </p>
    </div>,
    document.body,
  );
}

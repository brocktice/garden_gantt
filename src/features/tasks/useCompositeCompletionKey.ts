// src/features/tasks/useCompositeCompletionKey.ts
// Composite-key helpers for recurring-task per-occurrence completion.
// Per CONTEXT D-36: bare taskId = one-off (global completion); ${taskId}:${YYYY-MM-DD}
// = per-occurrence (recurring task).
// Source: [CITED: 03-CONTEXT.md D-36]
//
// Purity: zero React/Zustand/I/O.

/**
 * Build the composite completion key.
 * Accepts a YYYY-MM-DD or full ISO; the date portion is normalized to the first 10 chars.
 */
export function toCompositeKey(taskId: string, isoDate: string): string {
  const date = isoDate.length > 10 ? isoDate.slice(0, 10) : isoDate;
  return `${taskId}:${date}`;
}

/**
 * Split a key on the first colon.
 *  - 'T1:2026-05-15' → { taskId: 'T1', date: '2026-05-15' }
 *  - 'T1'            → { taskId: 'T1' }   (no `date` property; not undefined-valued)
 */
export function parseCompositeKey(key: string): { taskId: string; date?: string } {
  const colonIdx = key.indexOf(':');
  if (colonIdx === -1) return { taskId: key };
  return { taskId: key.slice(0, colonIdx), date: key.slice(colonIdx + 1) };
}

/** True iff the key contains a colon — i.e., it's a per-occurrence recurring-task key. */
export function isOccurrenceKey(key: string): boolean {
  return key.includes(':');
}

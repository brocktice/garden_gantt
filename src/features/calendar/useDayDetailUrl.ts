// src/features/calendar/useDayDetailUrl.ts
// useSearchParams wrapper for ?date= state. Drawer open/closed derived from URL presence.
// Per CONTEXT D-29 + RESEARCH.md §Pattern 8.

import { useSearchParams } from 'react-router';

export interface DayDetailUrlState {
  selectedDate: string | null; // 'YYYY-MM-DD' or null
  isOpen: boolean;
  open: (dateStr: string) => void;
  close: () => void;
}

export function useDayDetailUrl(): DayDetailUrlState {
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date');
  const isOpen = selectedDate !== null;

  function open(dateStr: string) {
    const next = new URLSearchParams(params);
    next.set('date', dateStr);
    setParams(next, { replace: false }); // pushState — back-button closes
  }

  function close() {
    const next = new URLSearchParams(params);
    next.delete('date');
    setParams(next, { replace: false });
  }

  return { selectedDate, isOpen, open, close };
}
